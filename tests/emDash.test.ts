import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "src");
const EM = /\u2014|\u2013/; // em dash or en dash

function walk(dir: string, out: string[] = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx|ts)$/.test(name)) out.push(p);
  }
  return out;
}

test("no em or en dashes in UI .tsx files or email builders", () => {
  const files = walk(ROOT).filter((p) => {
    if (p.endsWith(".tsx")) return true;
    return /decisionGuard|decision-send|notify|outreachGuard|greenlightCheck|workflow\.ts|ai\.ts/.test(p);
  });
  const bad: string[] = [];
  for (const f of files) {
    const text = readFileSync(f, "utf8");
    const lines = text.split("\n");
    lines.forEach((line, i) => {
      if (/em dash|en dash|\\u201[34]|\[.*[–—].*\]|\/\[.*\\u201/.test(line)) return;
      if (EM.test(line)) bad.push(`${f.replace(ROOT + "/", "src/")}:${i + 1}: ${line.trim().slice(0, 120)}`);
    });
  }
  assert.deepEqual(bad, [], bad.join("\n"));
});
