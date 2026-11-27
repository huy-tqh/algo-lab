import json
import os
import re
import subprocess
import sys

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
TEST_SCRIPT = os.path.join(REPO_ROOT, "tests", "verify_all.js")


def out(obj: dict) -> None:
    print(json.dumps(obj))
    sys.exit(0)


def check_forbidden_text(text: str) -> str | None:
    if "\u2014" in text:
        return "Blocked: Emdash (\u2014) is forbidden. Use hyphen (-) instead."
    if re.search(r"Be Vietnam Pro", text, re.IGNORECASE):
        return "Blocked: 'Be Vietnam Pro' is forbidden. Use Inter / system fonts."
    if re.search(r"JetBrains Mono", text, re.IGNORECASE):
        return "Blocked: 'JetBrains Mono' is forbidden. Use Source Code Pro / Consolas."
    if re.search(r"\.katex\s+\.text\b[\s\S]{0,120}font-family\s*:\s*var\(--font-sans\)", text, re.IGNORECASE):
        return "Blocked: Do not override .katex .text font-family with --font-sans."
    return None


def run_suite() -> tuple[bool, str]:
    if not os.path.exists(TEST_SCRIPT):
        return True, ""
    proc = subprocess.run(
        ["node", TEST_SCRIPT],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
    )
    if proc.returncode != 0:
        msg = (proc.stderr or proc.stdout or "verify_all.js failed").strip()
        return False, msg
    return True, ""


def main() -> None:
    try:
        payload = json.load(sys.stdin)
    except Exception:
        out({"decision": "allow"})

    event = payload.get("hookEventName", "")
    tool_call = payload.get("toolCall") or {}
    tool_name = tool_call.get("name", "")
    args = tool_call.get("args") or {}

    if event == "PreToolUse":
        if tool_name in ("write_file", "edit_file"):
            target_path = os.path.basename(args.get("Path", ""))
            if target_path in ("index.html", "AGENTS.md"):
                content = args.get("Content") or args.get("Replacement") or ""
                err = check_forbidden_text(content)
                if err:
                    out({"decision": "deny", "reason": err})
        elif tool_name == "run_command":
            cmd = args.get("CommandLine", "")
            if re.search(r"\bgit\s+(commit|push)\b", cmd):
                ok, err = run_suite()
                if not ok:
                    out({
                        "decision": "deny",
                        "reason": f"Blocked git commit/push because tests failed: {err}",
                    })
        out({"decision": "allow"})

    if event == "PostToolUse":
        if tool_name in ("write_file", "edit_file"):
            target_path = os.path.basename(args.get("Path", ""))
            if target_path == "index.html":
                ok, err = run_suite()
                if not ok:
                    out({"error": f"verify_all.js failed after editing index.html: {err}"})
        out({})

    out({})


if __name__ == "__main__":
    main()
