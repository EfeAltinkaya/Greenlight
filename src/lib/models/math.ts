/**
 * Shared head math for Greenlight Models (browser worker + Node tests).
 *
 * Embedding fallback: when @huggingface/transformers is unavailable (Node tests,
 * offline, or model not yet loaded), use embedFallback: a deterministic
 * bag-of-chars + bag-of-words hash into 384 dimensions, L2-normalized.
 * That keeps tests offline and avoids downloading the ~30MB BGE weights.
 */

export const EMBED_DIM = 384;

export type Top2 = [string, number][];

export type PredictResult = {
  label: string;
  p: number;
  top2: { label: string; p: number }[];
};

/** Softmax over logits. */
export function softmax(logits: number[]): number[] {
  if (!logits.length) return [];
  let m = -Infinity;
  for (const x of logits) if (x > m) m = x;
  const ex = logits.map((x) => Math.exp(x - m));
  const s = ex.reduce((a, b) => a + b, 0) || 1;
  return ex.map((e) => e / s);
}

/** Dot product. */
export function dot(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let s = 0;
  for (let i = 0; i < n; i++) s += a[i]! * b[i]!;
  return s;
}

/** Cosine similarity (assumes vectors may be unnormalized). */
export function cosine(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let ab = 0;
  let aa = 0;
  let bb = 0;
  for (let i = 0; i < n; i++) {
    const x = a[i]!;
    const y = b[i]!;
    ab += x * y;
    aa += x * x;
    bb += y * y;
  }
  const d = Math.sqrt(aa) * Math.sqrt(bb);
  return d ? ab / d : 0;
}

/** L2-normalize in place / return new vector. */
export function l2normalize(v: number[]): number[] {
  const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / n);
}

/**
 * Deterministic 384-d embedding for tests and offline Node.
 * Same algorithm as the stub head fixtures in public/models/heads/*.json.
 */
export function embedFallback(text: string, dim = EMBED_DIM): number[] {
  const v = new Array<number>(dim).fill(0);
  const lower = text.toLowerCase();
  for (let i = 0; i < lower.length; i++) {
    const code = lower.charCodeAt(i);
    v[code % dim]! += 1;
    v[(i * 31 + code) % dim]! += 0.25;
  }
  for (const w of lower.split(/\s+/).filter(Boolean)) {
    let h = 0;
    for (let i = 0; i < w.length; i++) h = (h * 131 + w.charCodeAt(i)) % dim;
    v[h]! += 3;
    v[(h * 7) % dim]! += 1.5;
  }
  return l2normalize(v);
}

/**
 * Linear head: label = argmax softmax(coef · emb + intercept).
 * coef is [nLabels][dim].
 */
export function predictFromHead(
  emb: number[],
  labels: string[],
  coef: number[][],
  intercept: number[],
): PredictResult {
  const logits = labels.map((_, i) => dot(coef[i] ?? [], emb) + (intercept[i] ?? 0));
  const probs = softmax(logits);
  const ranked = probs
    .map((p, i) => ({ label: labels[i]!, p }))
    .sort((a, b) => b.p - a.p);
  const top = ranked[0] ?? { label: labels[0] ?? "", p: 0 };
  return {
    label: top.label,
    p: top.p,
    top2: ranked.slice(0, 2),
  };
}
