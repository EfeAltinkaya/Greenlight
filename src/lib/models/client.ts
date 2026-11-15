/**
 * Browser bridge to the embed worker. Falls back to main-thread embedFallback
 * when Worker construction fails (SSR, tests, unsupported env).
 */

import { embedFallback, type PredictResult } from "./math";
import { embedInWorkerScope, predictInWorkerScope, type WorkerRequest, type WorkerResponse } from "./worker";
import type { ModelTask } from "./heads";

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, { resolve: (v: WorkerResponse) => void; reject: (e: Error) => void }>();

function ensureWorker(): Worker | null {
  if (typeof window === "undefined" || typeof Worker === "undefined") return null;
  if (worker) return worker;
  try {
    worker = new Worker(new URL("./embed.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (ev: MessageEvent<WorkerResponse>) => {
      const res = ev.data;
      const slot = pending.get(res.id);
      if (!slot) return;
      pending.delete(res.id);
      slot.resolve(res);
    };
    worker.onerror = () => {
      // Drop the worker; callers fall back.
      worker = null;
    };
    return worker;
  } catch {
    worker = null;
    return null;
  }
}

function callWorker(msg: WorkerRequest): Promise<WorkerResponse> {
  const w = ensureWorker();
  if (!w) return Promise.reject(new Error("no worker"));
  return new Promise((resolve, reject) => {
    pending.set(msg.id, { resolve, reject });
    w.postMessage(msg);
  });
}

/** Embed texts off the UI thread when possible. */
export async function embed(texts: string[]): Promise<number[][]> {
  try {
    const res = await callWorker({ id: ++seq, type: "embed", texts });
    if (res.ok && "embeddings" in res) return res.embeddings;
  } catch {
    /* fall through */
  }
  // Node / fallback path (also used when the worker cannot start).
  if (typeof window === "undefined") return embedInWorkerScope(texts);
  return texts.map((t) => embedFallback(t));
}

export async function predict(
  task: Exclude<ModelTask, "vendor">,
  texts: string[],
): Promise<(PredictResult | null)[]> {
  try {
    const res = await callWorker({ id: ++seq, type: "predict", task, texts });
    if (res.ok && "predictions" in res) return res.predictions;
  } catch {
    /* fall through */
  }
  return predictInWorkerScope(task, texts);
}
