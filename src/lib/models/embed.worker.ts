/**
 * Dedicated worker entry. Built by the bundler via:
 *   new Worker(new URL("./embed.worker.ts", import.meta.url), { type: "module" })
 */
import {
  embedInWorkerScope,
  predictInWorkerScope,
  type WorkerRequest,
  type WorkerResponse,
} from "./worker";
import { clearHeadCache } from "./heads";

type WorkerSelf = {
  onmessage: ((ev: MessageEvent<WorkerRequest>) => void) | null;
  postMessage: (msg: WorkerResponse) => void;
};

const ctx = self as unknown as WorkerSelf;

ctx.onmessage = (ev: MessageEvent<WorkerRequest>) => {
  const msg = ev.data;
  void (async () => {
    let res: WorkerResponse;
    try {
      if (msg.type === "clear") {
        clearHeadCache();
        res = { id: msg.id, ok: true, cleared: true };
      } else if (msg.type === "embed") {
        res = { id: msg.id, ok: true, embeddings: await embedInWorkerScope(msg.texts) };
      } else {
        res = { id: msg.id, ok: true, predictions: await predictInWorkerScope(msg.task, msg.texts) };
      }
    } catch (e) {
      res = { id: msg.id, ok: false, error: (e as Error).message ?? "worker error" };
    }
    ctx.postMessage(res);
  })();
};
