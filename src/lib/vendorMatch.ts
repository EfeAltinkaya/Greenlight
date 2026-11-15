// Fuzzy vendor match for the budget sheet. Suggestions are confirmable only:
// never silently rewrite a typed vendor. Optional embedding scores can boost Fuse ranks.
import Fuse from "fuse.js";
import vendorData from "@/data/vendors.json";
import type { Vendor } from "./engine";

export type VendorSuggestion = {
  name: string;
  vendor: Vendor;
  /** 0..1 confidence (higher is better). Fuse score inverted + optional embedding blend. */
  confidence: number;
  fuseScore: number;
  embeddingScore?: number;
};

const ACTIVE = vendorData.vendors.filter((v) => v.active);

const fuse = new Fuse(ACTIVE, {
  keys: [
    { name: "name", weight: 0.7 },
    { name: "cuisine", weight: 0.15 },
    { name: "category", weight: 0.15 },
  ],
  includeScore: true,
  threshold: 0.45,
  ignoreLocation: true,
  minMatchCharLength: 2,
});

function blend(fuseScore: number, embeddingScore?: number): number {
  // Fuse: lower is better. Convert to confidence, then blend with optional embedding (0..1).
  const fromFuse = Math.max(0, Math.min(1, 1 - fuseScore));
  if (embeddingScore == null || !Number.isFinite(embeddingScore)) return fromFuse;
  const emb = Math.max(0, Math.min(1, embeddingScore));
  return fromFuse * 0.65 + emb * 0.35;
}

/**
 * Rank listed food vendors for a typed name. Callers must show "Did you mean…?" and
 * wait for an explicit confirm; never apply a suggestion silently.
 */
export function fuzzyVendorSuggestions(
  query: string,
  opts?: { embeddingScores?: Record<string, number>; limit?: number },
): VendorSuggestion[] {
  const q = query.trim();
  if (q.length < 2) return [];
  const limit = opts?.limit ?? 5;
  const hits = fuse.search(q, { limit: Math.max(limit, 8) });
  const out: VendorSuggestion[] = [];
  for (const h of hits) {
    const fuseScore = h.score ?? 1;
    const sid = h.item.supplierId ?? undefined;
    const emb = opts?.embeddingScores?.[h.item.name] ?? (sid ? opts?.embeddingScores?.[sid] : undefined);
    const confidence = blend(fuseScore, emb);
    out.push({
      name: h.item.name,
      vendor: h.item,
      confidence,
      fuseScore,
      embeddingScore: emb,
    });
  }
  out.sort((a, b) => b.confidence - a.confidence);
  return out.slice(0, limit);
}

/**
 * Best near-match that is not an exact listed hit. Returns null when the typed string
 * already matches a listed vendor, or when confidence is too low to ask.
 */
export function didYouMeanVendor(
  query: string,
  opts?: { embeddingScores?: Record<string, number>; minConfidence?: number },
): VendorSuggestion | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  const exact = ACTIVE.find((v) => v.name.toLowerCase() === q || v.name.toLowerCase().startsWith(q + " "));
  if (exact) return null;
  const [best] = fuzzyVendorSuggestions(query, { ...opts, limit: 1 });
  if (!best) return null;
  const min = opts?.minConfidence ?? 0.55;
  if (best.confidence < min) return null;
  // Same vendor under a short alias (e.g. "Panda" vs full list name) still needs confirm.
  return best;
}

/** Short display name for UI chips (strips bracketed legal entity). */
export function shortVendorName(name: string) {
  return name.replace(/\s*[\[(].*$/, "").trim();
}
