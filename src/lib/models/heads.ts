import { predictFromHead, type PredictResult } from "./math";

export type ModelTask = "items" | "board" | "replies" | "vendor";

export type HeadMetrics = {
  accuracy?: number | null;
  macroF1?: number | null;
  recallAt3?: number | null;
  nTrain?: number | null;
  note?: string;
};

export type HeadFixture = {
  text: string;
  label: string;
  embedding?: number[];
};

/** Classification head JSON under /models/heads/{task}.json */
export type ClassificationHead = {
  task: "items" | "board" | "replies";
  ready?: boolean;
  stub?: boolean;
  dim: number;
  labels: string[];
  coef: number[][];
  intercept: number[];
  baseModel: string;
  license: string;
  metrics?: HeadMetrics;
  trainedAt?: string | null;
  limits?: string;
  does?: string;
  neverDoes?: string;
  reportWrong?: string;
  fixtures?: HeadFixture[];
};

export type VendorEntry = {
  name: string;
  listed: boolean;
  embedding?: number[];
};

export type VendorHead = {
  task: "vendor";
  ready?: boolean;
  stub?: boolean;
  dim: number;
  baseModel: string;
  license: string;
  metrics?: HeadMetrics;
  trainedAt?: string | null;
  limits?: string;
  does?: string;
  neverDoes?: string;
  reportWrong?: string;
  vendors: VendorEntry[];
  fuseWeight?: number;
  cosineWeight?: number;
};

export type AnyHead = ClassificationHead | VendorHead;

const cache = new Map<string, AnyHead | null>();

function headUrl(task: ModelTask): string {
  return `/models/heads/${task}.json`;
}

/**
 * Load head JSON. Browser: fetch /models/heads/{task}.json.
 * Node: read public/models/heads via dynamic import so the client bundle
 * never pulls in node:fs.
 */
export async function loadHead(task: ModelTask): Promise<AnyHead | null> {
  if (cache.has(task)) return cache.get(task) ?? null;
  try {
    let raw: AnyHead;
    if (typeof window === "undefined") {
      const { readFile } = await import(/* webpackIgnore: true */ "node:fs/promises");
      const { join } = await import(/* webpackIgnore: true */ "node:path");
      const path = join(process.cwd(), "public", "models", "heads", `${task}.json`);
      raw = JSON.parse(await readFile(path, "utf8")) as AnyHead;
    } else {
      const r = await fetch(headUrl(task), { cache: "force-cache" });
      if (!r.ok) throw new Error(`Head not found: ${headUrl(task)}`);
      raw = (await r.json()) as AnyHead;
    }
    cache.set(task, raw);
    return raw;
  } catch {
    cache.set(task, null);
    return null;
  }
}

/** Clear cache (tests / hot reload after training overwrite). */
export function clearHeadCache() {
  cache.clear();
}

export function isClassificationHead(h: AnyHead): h is ClassificationHead {
  return h.task === "items" || h.task === "board" || h.task === "replies";
}

export function isVendorHead(h: AnyHead): h is VendorHead {
  return h.task === "vendor";
}

/** Head is usable for live suggestions (training agent sets ready: true). */
export function headReady(h: AnyHead | null | undefined): boolean {
  return Boolean(h && h.ready && !h.stub);
}

/**
 * Run softmax(coef · emb + intercept) for a classification head.
 */
export function predictWithHead(head: ClassificationHead, emb: number[]): PredictResult {
  return predictFromHead(emb, head.labels, head.coef, head.intercept);
}
