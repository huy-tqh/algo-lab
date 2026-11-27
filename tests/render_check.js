const fs = require("fs");
const path = require("path");
const http = require("http");
const { spawn } = require("child_process");

const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "tests", "_render_out");
fs.mkdirSync(outDir, { recursive: true });

// Simple static server for index.html
const server = http.createServer((req, res) => {
  const html = fs.readFileSync(path.join(root, "index.html"));
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(html);
});

async function cdpCall(ws, id, method, params = {}) {
  return new Promise((resolve, reject) => {
    const onMsg = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id === id) {
        ws.removeEventListener("message", onMsg);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      }
    };
    ws.addEventListener("message", onMsg);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function run() {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const port = server.address().port;
  const url = `http://127.0.0.1:${port}/`;

  const chromeBin = "D:\\Users\\huytq67\\scoop\\shims\\chrome.exe";
  const userDataDir = path.join(outDir, "profile");
  fs.mkdirSync(userDataDir, { recursive: true });

  const chrome = spawn(
    chromeBin,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--remote-debugging-port=9229",
      `--user-data-dir=${userDataDir}`,
      url,
    ],
    { stdio: "ignore" }
  );

  let wsUrl = null;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 250));
    try {
      const resp = await fetch("http://127.0.0.1:9229/json/list");
      const list = await resp.json();
      const page = list.find((x) => x.type === "page");
      if (page) {
        wsUrl = page.webSocketDebuggerUrl;
        break;
      }
    } catch {}
  }
  if (!wsUrl) throw new Error("Chrome DevTools did not start.");

  const ws = new WebSocket(wsUrl);
  await new Promise((r) => ws.addEventListener("open", r));
  let msgId = 1;
  const call = (m, p) => cdpCall(ws, msgId++, m, p);

  const pageErrors = [];
  ws.addEventListener("message", (ev) => {
    const d = JSON.parse(ev.data);
    if (d.method === "Runtime.exceptionThrown") {
      pageErrors.push(JSON.stringify(d.params));
    }
  });

  await call("Page.enable");
  await call("Runtime.enable");
  await new Promise((r) => setTimeout(r, 1500));

  async function inspectViewport(label, width, height, viewMode) {
    await call("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: viewMode === "mobile",
    });
    await call("Runtime.evaluate", {
      expression: `applyViewMode('${viewMode}')`,
    });
    await new Promise((r) => setTimeout(r, 300));

    for (const mod of ["gen", "bt", "bst", "graph"]) {
      await call("Runtime.evaluate", {
        expression: `switchModule('${mod}'); document.getElementById('btn-next').click();`,
      });
      await new Promise((r) => setTimeout(r, 150));

      // Check flowchart SVG in layer2
      await call("Runtime.evaluate", { expression: `switchLayer('layer2')` });
      await new Promise((r) => setTimeout(r, 150));

      const layer2Check = await call("Runtime.evaluate", {
        returnByValue: true,
        expression: `(() => {
          const svg = document.querySelector('#flowchart-container svg');
          const r = svg ? svg.getBoundingClientRect() : {width:0,height:0};
          const fos = [...document.querySelectorAll('#flowchart-container foreignObject .flow-fo-inner')].map(el => {
            const box = el.getBoundingClientRect();
            return { text: el.innerText.trim(), w: box.width, h: box.height };
          });
          return { svgW: r.width, svgH: r.height, emptyFos: fos.filter(f => !f.text || f.h === 0) };
        })()`,
      });
      const l2 = layer2Check.result.value;
      if (l2.svgW < 100 || l2.svgH < 100 || l2.emptyFos.length > 0) {
        throw new Error(`[${label}/${mod}] Flowchart render failure: ${JSON.stringify(l2)}`);
      }

      // Check linear vertical ordering (1 -> 2 -> 3 -> 4) & 4 case buttons (General + 3 examples)
      const linearCheck = await call("Runtime.evaluate", {
        returnByValue: true,
        expression: `(() => {
          const ids = ['sec-step1', 'sec-step2', 'sec-step3', 'sec-step4'];
          const tops = ids.map(id => {
            const el = document.getElementById(id);
            const r = el.getBoundingClientRect();
            return { id, top: r.top + window.scrollY, h: r.height };
          });
          const cases = [...document.querySelectorAll('#case-nav .case-btn')].map(b => {
            const r = b.getBoundingClientRect();
            return { text: b.innerText.trim(), w: r.width, h: r.height };
          });
          return { tops, cases };
        })()`,
      });
      const lc = linearCheck.result.value;
      for (let i = 0; i < lc.tops.length - 1; i++) {
        if (!(lc.tops[i].top < lc.tops[i + 1].top && lc.tops[i].h > 20)) {
          throw new Error(`[${label}/${mod}] Sections not in linear top-to-bottom order: ${JSON.stringify(lc.tops)}`);
        }
      }
      if (lc.cases.length !== 4 || lc.cases.some(c => c.w === 0 || c.h === 0)) {
        throw new Error(`[${label}/${mod}] Expected 4 visible cases (General + 3 examples), got: ${JSON.stringify(lc.cases)}`);
      }

      // Check essayMode + trace table AND verify the 4 case buttons stay visible in essay mode
      await call("Runtime.evaluate", {
        expression: `setEssayMode(true);`,
      });
      await new Promise((r) => setTimeout(r, 150));

      const domCheck = await call("Runtime.evaluate", {
        returnByValue: true,
        expression: `(() => {
          const text = document.body.innerText;
          const badTags = text.match(/<\\/?(code|strong|b|ul|li|div|span)>/g) || [];
          const overflowX = document.documentElement.scrollWidth - window.innerWidth;
          const mbActive = document.querySelectorAll('.mb-tab-btn.active').length;
          const simTitle = document.getElementById('sim-title').innerText;
          const visibleCases = [...document.querySelectorAll('#case-nav .case-btn')].filter(b => b.getBoundingClientRect().height > 0).length;
          return { badTags, overflowX, mbActive, simTitle, visibleCases };
        })()`,
      });
      const dc = domCheck.result.value;
      if (dc.badTags.length > 0) {
        throw new Error(`[${label}/${mod}] Raw HTML tags rendered in text: ${JSON.stringify(dc.badTags)}`);
      }
      if (dc.overflowX > 4) {
        throw new Error(`[${label}/${mod}] Horizontal overflow detected: ${dc.overflowX}px`);
      }
      if (viewMode === "mobile" && dc.mbActive !== 1) {
        throw new Error(`[${label}/${mod}] Mobile tab bar active count = ${dc.mbActive}, expected 1`);
      }
      if (dc.visibleCases !== 4) {
        throw new Error(`[${label}/${mod}] In essay mode, expected 4 visible case buttons, got ${dc.visibleCases}`);
      }

      if (mod === "bst" || mod === "gen") {
        const shot = await call("Page.captureScreenshot", { format: "png" });
        fs.writeFileSync(
          path.join(outDir, `${label}_${mod}_essay.png`),
          Buffer.from(shot.data, "base64")
        );
      }

      // Turn off essayMode and verify layer1 screenshot too
      await call("Runtime.evaluate", {
        expression: `setEssayMode(false); switchLayer('layer1'); window.scrollTo({ top: 0, behavior: 'instant' });`,
      });
      await new Promise((r) => setTimeout(r, 200));
      if (mod === "gen") {
        const shot = await call("Page.captureScreenshot", { format: "png" });
        fs.writeFileSync(
          path.join(outDir, `${label}_${mod}_main.png`),
          Buffer.from(shot.data, "base64")
        );
      }
    }
  }

  await inspectViewport("desktop", 1440, 900, "desktop");
  await inspectViewport("mobile", 390, 844, "mobile");

  if (pageErrors.length > 0) {
    throw new Error("Uncaught page errors: " + pageErrors.join("\n"));
  }

  ws.close();
  chrome.kill();
  server.close();
  console.log("CHROME_RENDER_CHECK_PASSED");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
