const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const agentsMd = fs.existsSync(path.join(root, "AGENTS.md"))
  ? fs.readFileSync(path.join(root, "AGENTS.md"), "utf8")
  : "";

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
}

// 1. No emdash anywhere
assert(!html.includes("\u2014"), "index.html must not contain emdash (\u2014). Use hyphen (-).");
assert(!agentsMd.includes("\u2014"), "AGENTS.md must not contain emdash (\u2014). Use hyphen (-).");

// 2. No AI default fonts
assert(!/Be Vietnam Pro/i.test(html), "index.html must not use 'Be Vietnam Pro'.");
assert(!/JetBrains Mono/i.test(html), "index.html must not use 'JetBrains Mono'.");

// 3. Uniform LaTeX rendering in formulas
assert(
  !/\.katex\s+\.text\b[\s\S]*?font-family\s*:\s*var\(--font-sans\)/i.test(html),
  "Do not override .katex .text font-family with --font-sans."
);
assert(
  html.includes("liveBox.innerHTML = renderMath('\\\\text{Giá trị hiện tại: } '"),
  "Formula live value box must be rendered completely inside renderMath()."
);
assert(
  html.includes("var sharedRatio = 1;"),
  "applyDynamicMobileScale must compute a sharedRatio for uniform formula sizing."
);

// 4. Mobile tab bar mutual exclusivity
assert(
  html.includes("function syncMobileBottomBar()") &&
    html.includes("btn.classList.toggle('active', btn.getAttribute('data-mb-action') === appState.activeMobileTab)"),
  "syncMobileBottomBar must keep only one active tab."
);

// 5. Flowchart SVG foreignObject integrity
assert(
  !html.includes("<foreignObject") || html.includes('xmlns="http://www.w3.org/1999/xhtml"'),
  "Flowchart <foreignObject> children must include xmlns='http://www.w3.org/1999/xhtml'."
);
assert(
  !/\.flow-fo-text\s*\{[^}]*flex-direction\s*:\s*column/i.test(html),
  ".flow-fo-text must not use flex-direction: column."
);
assert(
  !/\.flow-node\.active-node\s*\{[^}]*filter\s*:/i.test(html),
  ".flow-node.active-node must not apply filter directly on <g>."
);

// 6. 4-step tracker initial state and color scheme (no green+blue)
assert(
  html.includes("hasInteracted: false") &&
    html.includes("appState.hasInteracted ? getActiveTemplateStepIndex"),
  "4-step template tracker must remain neutral until hasInteracted is true."
);
assert(
  !/\.tpl-step\.tpl-done\s*\{[^}]*--accent-green/i.test(html) &&
    !/\.formula-card\.status-done\s*\{[^}]*150,\s*105/i.test(html),
  "Do not use green together with blue in 4-step tracker or formula cards."
);

// 7. JS syntax & runtime trace table column consistency check
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
  .map((m) => m[1])
  .join("\n");
new Function(scripts);

// Extract main script (third <script> block) and run logic checks in a minimal DOM mock
const allScripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
const mainScript = allScripts[allScripts.length - 1][1];
const noop = () => {};
const mockEl = () => ({
  classList: { toggle: noop, add: noop, remove: noop, contains: () => false },
  style: {},
  addEventListener: noop,
  setAttribute: noop,
  getAttribute: () => "",
  querySelectorAll: () => [],
  querySelector: () => null,
  insertAdjacentHTML: noop,
  scrollIntoView: noop,
  innerHTML: "",
  textContent: "",
  value: "",
  clientWidth: 360,
  scrollWidth: 300,
});
const mockDoc = {
  readyState: "loading",
  body: { classList: { toggle: noop } },
  addEventListener: noop,
  getElementById: () => mockEl(),
  querySelectorAll: () => [],
  querySelector: () => null,
  createElement: () => mockEl(),
  head: { appendChild: noop },
};
const runner = new Function(
  "window",
  "document",
  "requestAnimationFrame",
  mainScript +
    "\nreturn { MODULES, appState, getTraceConfig, formatTraceCells, switchModule };"
);
const ctx = runner(
  { innerWidth: 1200, addEventListener: noop },
  mockDoc,
  noop
);

["gen", "bt", "bst", "graph", "gen"].forEach((modKey) => {
  ctx.switchModule(modKey);
});

["gen", "bt", "bst", "graph"].forEach((modKey) => {
  const mod = ctx.MODULES[modKey];
  const steps = mod.buildSteps(ctx.appState.params[modKey]);
  assert(steps.length > 0, `Module ${modKey} produced 0 steps.`);
  const cfg = ctx.getTraceConfig(modKey, ctx.appState.params[modKey], steps);
  steps.forEach((st, idx) => {
    const cells = ctx.formatTraceCells(
      modKey,
      st,
      idx > 0 ? steps[idx - 1] : null,
      idx
    );
    assert(
      cells.length === cfg.headers.length,
      `Module ${modKey} step ${idx} cell count (${cells.length}) != header count (${cfg.headers.length}).`
    );
  });
});

console.log("ALL_TESTS_PASSED");
