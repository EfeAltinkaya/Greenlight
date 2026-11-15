#!/usr/bin/env node
/**
 * Stub: export live app texts into ml/data/*_live.csv for later labeling.
 * Writes CSV headers only until a live export path is wired.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = join(root, "ml", "data");
mkdirSync(dataDir, { recursive: true });

const header = "text,label,source,split\n";
const files = ["items_live.csv", "board_live.csv", "replies_live.csv"];

for (const name of files) {
  const path = join(dataDir, name);
  writeFileSync(path, header, "utf8");
  console.log(`wrote ${path}`);
}

console.log(
  "export-training stub: headers only. Wire store/Supabase export before labeling.",
);
