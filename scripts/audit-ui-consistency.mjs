#!/usr/bin/env node
// Audit app2 for UI-consistency drift against the design system.
//
// Checks (kept precise so this is safe as a CI / pre-commit gate):
//   1. Undefined `sv-*` utility classes (used in .vue but not defined in
//      main.css or the file's own <style> block) — these are silent no-ops.
//   2. Raw <table> markup outside the shared <DataTable> component.
//
// Page-title typography (use <PageHeader> / .sv-page-title, never a rolled
// `text-[NNpx]` heading) is enforced by the app2-ui-consistency Cursor rule,
// because card/widget titles share the same class signature and can't be told
// apart from page titles by regex without false positives.
//
// Usage:
//   node scripts/audit-ui-consistency.mjs           # human-readable report
//   node scripts/audit-ui-consistency.mjs --json     # machine-readable
//
// Exit code is non-zero when issues are found (handy for CI / pre-commit).

import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const cssPath = join(root, "assets/css/main.css");

const args = new Set(process.argv.slice(2));
const asJson = args.has("--json");

/** Recursively collect files under `dir` matching `test`. */
function walk(dir, test, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, test, out);
    else if (test(entry)) out.push(full);
  }
  return out;
}

function lineOf(text, index) {
  return text.slice(0, index).split("\n").length;
}

// ── 1. Build the set of defined sv-* utility classes ─────────────────────────
const css = readFileSync(cssPath, "utf8");
const definedSv = new Set();
for (const m of css.matchAll(/\.(sv-[a-z0-9-]+)/g)) definedSv.add(m[1]);

/** Collect `.sv-*` selectors defined inside a component's own <style> blocks. */
function localSvClasses(src) {
  const local = new Set();
  for (const block of src.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) {
    for (const m of block[1].matchAll(/\.(sv-[a-z0-9-]+)/g)) local.add(m[1]);
  }
  return local;
}

// ── Scan all .vue files ──────────────────────────────────────────────────────
const vueFiles = walk(join(root, "components"), (f) => f.endsWith(".vue"))
  .concat(walk(join(root, "pages"), (f) => f.endsWith(".vue")))
  .concat(walk(join(root, "layouts"), (f) => f.endsWith(".vue")));

// `error` issues fail the run (safe as a gate); `warn` issues are tracked
// follow-ups (larger refactors) that should not block.
const SEVERITY = { "undefined-sv-class": "error", "raw-table": "warn" };

const issues = [];
const add = (rule, file, line, detail) =>
  issues.push({
    rule,
    severity: SEVERITY[rule] || "error",
    file: relative(root, file),
    line,
    detail,
  });

// Files allowed to define their own table / title (the canonical primitives).
const SHARED = new Set(["DataTable.vue", "PageHeader.vue"]);

for (const file of vueFiles) {
  const src = readFileSync(file, "utf8");
  const base = file.split("/").pop();
  const local = localSvClasses(src);

  // 1. Undefined sv-* classes. The `(?<!-)` lookbehind skips CSS custom
  //    properties like `var(--sv-radius-card)`, which are tokens, not classes.
  for (const m of src.matchAll(/(?<!-)\b(sv-[a-z0-9-]+)\b/g)) {
    if (!definedSv.has(m[1]) && !local.has(m[1])) {
      add("undefined-sv-class", file, lineOf(src, m.index), m[1]);
    }
  }

  // 2. Raw <table> outside DataTable
  if (!SHARED.has(base)) {
    for (const m of src.matchAll(/<table\b/g)) {
      add("raw-table", file, lineOf(src, m.index), "use <DataTable> instead");
    }
  }
}

// ── Report ───────────────────────────────────────────────────────────────────
const errorCount = issues.filter((i) => i.severity === "error").length;

if (asJson) {
  console.log(
    JSON.stringify({ issues, count: issues.length, errorCount }, null, 2),
  );
} else {
  const byRule = {};
  for (const i of issues) (byRule[i.rule] ||= []).push(i);
  const titles = {
    "undefined-sv-class": "Undefined sv-* utility classes [error]",
    "raw-table": "Raw <table> markup — use <DataTable> [warn]",
  };
  if (!issues.length) {
    console.log("\u2713 app2 UI consistency: no issues found.");
  } else {
    console.log(`\napp2 UI consistency audit \u2014 ${issues.length} issue(s):\n`);
    for (const [rule, list] of Object.entries(byRule)) {
      console.log(`\u2022 ${titles[rule] || rule} (${list.length})`);
      for (const i of list) console.log(`    ${i.file}:${i.line}  ${i.detail}`);
      console.log("");
    }
  }
}

// Only `error`-severity issues fail the run.
process.exit(errorCount ? 1 : 0);
