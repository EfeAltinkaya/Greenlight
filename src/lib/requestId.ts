// Stable public request IDs shown everywhere and in email subjects: GL-26-XXXX.
import type { Application } from "./types";

const YEAR = "26";

/** Build a stable GL-26-XXXX from an application id (used when requestId was not stored yet). */
export function makeRequestId(appId: string): string {
  let h = 2166136261;
  for (let i = 0; i < appId.length; i++) {
    h ^= appId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const code = (h >>> 0).toString(16).toUpperCase().padStart(4, "0").slice(-4);
  return `GL-${YEAR}-${code}`;
}

/** Prefer the stored requestId; fall back to a stable derivation so old rows still show one. */
export function requestIdOf(app: Pick<Application, "id" | "requestId">): string {
  return app.requestId || makeRequestId(app.id);
}

/** Subject prefix for every Resend email about a request. */
export function subjectTag(app: Pick<Application, "id" | "requestId">): string {
  return `[${requestIdOf(app)}]`;
}
