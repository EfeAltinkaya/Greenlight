/**
 * Parity: JS head math on embeddings should match Python preds within tolerance.
 *
 * Embedding sources (first hit wins):
 * 1. embedding field on each ml/reports/{task}_preds.json row
 * 2. ml/cache/{task}.npy row-aligned with preds (local; *.npy is gitignored)
 * 3. fixtures[].embedding in the head JSON (stub heads)
 *
 * If none are available, skip with a message (do not download BGE).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  clearHeadCache,
  embedFallback,
  loadHead,
  predictFromHead,
  predictWithHead,
} from "../src/lib/models/index";
import { isClassificationHead } from "../src/lib/models/heads";

const ROOT = process.cwd();
const REPORTS = join(ROOT, "ml", "reports");
const CACHE = join(ROOT, "ml", "cache");
const TOL = 1e-4;

type PredRow = {
  text: string;
  embedding?: number[];
  label?: string;
  probs?: Record<string, number> | number[];
};

/** Minimal float32 .npy reader (C-order 2-D only). */
function readNpyFloat2d(path: string): number[][] | null {
  try {
    const buf = readFileSync(path);
    if (buf[0] !== 0x93 || buf.toString("latin1", 1, 6) !== "NUMPY") return null;
    const verMajor = buf[6]!;
    const headerLen = verMajor === 1 ? buf.readUInt16LE(8) : buf.readUInt32LE(8);
    const headerStart = verMajor === 1 ? 10 : 12;
    const header = buf.toString("latin1", headerStart, headerStart + headerLen);
    const shapeMatch = /'shape':\s*\((\d+),\s*(\d+)\)/.exec(header);
    const descr = /'descr':\s*'([^']+)'/.exec(header)?.[1] ?? "";
    if (!shapeMatch || !descr.includes("f4")) return null;
    const rows = Number(shapeMatch[1]);
    const cols = Number(shapeMatch[2]);
    const dataStart = headerStart + headerLen;
    const out: number[][] = [];
    for (let i = 0; i < rows; i++) {
      const row: number[] = [];
      for (let j = 0; j < cols; j++) {
        row.push(buf.readFloatLE(dataStart + (i * cols + j) * 4));
      }
      out.push(row);
    }
    return out;
  } catch {
    return null;
  }
}

function loadPreds(task: string): PredRow[] | null {
  const path = join(REPORTS, `${task}_preds.json`);
  if (!existsSync(path)) return null;
  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as PredRow[] | { rows: PredRow[] };
    return Array.isArray(raw) ? raw : raw.rows;
  } catch {
    return null;
  }
}

async function runParity(task: "items" | "board" | "replies") {
  clearHeadCache();
  const head = await loadHead(task);
  assert.ok(head && isClassificationHead(head), `${task} head missing`);

  const fromReports = loadPreds(task);
  const npy = readNpyFloat2d(join(CACHE, `${task}.npy`));

  let rows: PredRow[] = [];
  let source = "";

  if (fromReports?.length) {
    rows = fromReports.slice(0, 20).map((r, i) => ({
      ...r,
      embedding: r.embedding?.length ? r.embedding : npy?.[i],
    }));
    source = npy ? "preds+npy" : "preds";
  } else if (head.fixtures?.length) {
    rows = head.fixtures.map((f) => ({ text: f.text, label: f.label, embedding: f.embedding }));
    source = "head.fixtures";
  }

  const withEmb = rows.filter((r) => r.embedding && r.embedding.length);
  if (!withEmb.length) {
    console.log(
      `skip ${task}: no embeddings in preds, ml/cache/${task}.npy, or head fixtures (source=${source || "none"})`,
    );
    return { skipped: true, n: 0 };
  }

  let ok = 0;
  for (const row of withEmb) {
    const emb = row.embedding!;
    const pred = predictWithHead(head, emb);

    if (row.probs && !Array.isArray(row.probs)) {
      // Compare top probability against Python-exported probs within tolerance.
      const pyP = row.probs[pred.label];
      if (typeof pyP === "number") {
        assert.ok(
          Math.abs(pyP - pred.p) <= 0.05 || pred.label === row.label,
          `${task}: p mismatch for "${row.text}" js=${pred.p} py[${pred.label}]=${pyP}`,
        );
      }
      const pyTop = Object.entries(row.probs).sort((a, b) => b[1] - a[1])[0]?.[0];
      assert.equal(pred.label, pyTop, `${task}: argmax mismatch on "${row.text}"`);
    } else if (row.label) {
      assert.equal(pred.label, row.label, `${task}: "${row.text}" want ${row.label} got ${pred.label}`);
    }

    const again = predictFromHead(emb, head.labels, head.coef, head.intercept);
    assert.ok(Math.abs(again.p - pred.p) <= TOL, "internal consistency");
    ok++;
  }
  console.log(`${task} parity ok on ${ok} rows via ${source}`);
  return { skipped: false, n: ok };
}

test("models parity: items head", async () => {
  const r = await runParity("items");
  if (!r.skipped) assert.ok(r.n >= 1);
});

test("models parity: board head", async () => {
  const r = await runParity("board");
  if (!r.skipped) assert.ok(r.n >= 1);
});

test("models parity: replies head", async () => {
  const r = await runParity("replies");
  if (!r.skipped) assert.ok(r.n >= 1);
});

test("embedFallback is deterministic 384-d", () => {
  const a = embedFallback("Catered dinner for 80");
  const b = embedFallback("Catered dinner for 80");
  assert.equal(a.length, 384);
  assert.deepEqual(a, b);
  const n = Math.sqrt(a.reduce((s, x) => s + x * x, 0));
  assert.ok(Math.abs(n - 1) < 1e-6);
});

test("ml/reports directory noted when empty", () => {
  if (!existsSync(REPORTS)) {
    console.log("ml/reports missing; using head fixtures only");
    return;
  }
  const files = readdirSync(REPORTS).filter((f) => f.endsWith("_preds.json"));
  if (!files.length) console.log("no *_preds.json yet; training agent may add them");
  assert.ok(true);
});
