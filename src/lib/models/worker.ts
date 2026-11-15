/**
 * Embedding + predict helpers used by the Web Worker and by Node.
 *
 * Browser: lazy-loads @huggingface/transformers feature-extraction
 * Xenova/bge-small-en-v1.5 (dtype q8, pooling mean, normalize true) inside
 * embed.worker.ts so the UI thread never blocks.
 *
 * Node / tests: use embedFallback (deterministic bag-of-chars 384-d) so tests
 * do not download the ~30MB BGE weights. See math.ts.
 */

import {
  isClassificationHead,
  loadHead,
  predictWithHead,
  type ModelTask,
} from "./heads";
import { embedFallback, type PredictResult } from "./math";

const MODEL_ID = "Xenova/bge-small-en-v1.5";

type Extractor = (
  texts: string[],
  opts: { pooling: "mean"; normalize: boolean },
) => Promise<{ data: Float32Array | number[]; dims: number[] }>;

let extractor: Extractor | null = null;
let loading: Promise<Extractor | null> | null = null;
let useFallback = false;

async function getExtractor(): Promise<Extractor | null> {
  if (extractor) return extractor;
  if (useFallback) return null;
  const inWorker =
    typeof globalThis !== "undefined" &&
    typeof (globalThis as { WorkerGlobalScope?: unknown }).WorkerGlobalScope !== "undefined";
  if (typeof window === "undefined" && !inWorker) {
    // Pure Node (tests): never download weights.
    useFallback = true;
    return null;
  }
  if (loading) return loading;
  loading = (async () => {
    try {
      const mod = await import("@huggingface/transformers");
      const pipe = (await mod.pipeline("feature-extraction", MODEL_ID, {
        dtype: "q8",
      })) as unknown as Extractor;
      extractor = pipe;
      return pipe;
    } catch {
      useFallback = true;
      return null;
    } finally {
      loading = null;
    }
  })();
  return loading;
}

/** Embed texts with BGE when available, else deterministic embedFallback. */
export async function embedInWorkerScope(texts: string[]): Promise<number[][]> {
  const pipe = await getExtractor();
  if (!pipe) return texts.map((t) => embedFallback(t));
  const out: number[][] = [];
  for (const t of texts) {
    const res = await pipe([t], { pooling: "mean", normalize: true });
    const data = Array.from(res.data as ArrayLike<number>);
    const dim = res.dims?.[res.dims.length - 1] ?? data.length;
    out.push(data.slice(0, dim));
  }
  return out;
}

/** Predict classification labels for a task. */
export async function predictInWorkerScope(
  task: Exclude<ModelTask, "vendor">,
  texts: string[],
): Promise<(PredictResult | null)[]> {
  const head = await loadHead(task);
  if (!head || !isClassificationHead(head)) return texts.map(() => null);
  const embs = await embedInWorkerScope(texts);
  return embs.map((e) => predictWithHead(head, e));
}

export type WorkerRequest =
  | { id: number; type: "embed"; texts: string[] }
  | { id: number; type: "predict"; task: Exclude<ModelTask, "vendor">; texts: string[] }
  | { id: number; type: "clear" };

export type WorkerResponse =
  | { id: number; ok: true; embeddings: number[][] }
  | { id: number; ok: true; predictions: (PredictResult | null)[] }
  | { id: number; ok: true; cleared: true }
  | { id: number; ok: false; error: string };
