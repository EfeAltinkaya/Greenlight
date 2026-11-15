import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "src");

/** Buzzwords and filler banned from product copy (Part 2 voice rules). */
const BANNED = /\b(seamless|effortless|empower|unlock|streamline|leverage|supercharge|AI-powered|magic)\b/i;
/** Standalone "just" / "simply" in string literals (heuristic). */
const FILLER = /["'`][^"'`]*\b(just|simply)\b[^"'`]*["'`]/i;

function walk(dir: string, out: string[] = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx|ts)$/.test(name)) out.push(p);
  }
  return out;
}

test("no banned buzzwords in UI strings or email builders", () => {
  const files = walk(ROOT).filter((p) => {
    if (p.endsWith(".tsx")) return true;
    return /decisionGuard|decision-send|notify|outreachGuard|greenlightCheck|workflow\.ts|ai\.ts|ai-shared/.test(p);
  });
  const bad: string[] = [];
  for (const f of files) {
    const text = readFileSync(f, "utf8");
    const lines = text.split("\n");
    lines.forEach((line, i) => {
      // Skip the ban-list definitions themselves and comments about them.
      if (/BANNED|buzzword|voice\.test|banned phrases|banned_hits|BANNED_PHRASES|outreachGuard/.test(line)) return;
      if (f.includes("outreachGuard") && /"[a-z ]+"/.test(line)) return;
      if (BANNED.test(line) || FILLER.test(line)) {
        bad.push(`${f.replace(ROOT + "/", "src/")}:${i + 1}: ${line.trim().slice(0, 120)}`);
      }
    });
  }
  assert.deepEqual(bad, [], bad.join("\n"));
});
