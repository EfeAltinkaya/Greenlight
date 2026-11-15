/**
 * Greenlight Models: typed browser/Node API.
 *
 * classifyItem / routeBoard / classifyReply / matchVendor each return null when
 * the head is not ready or confidence is below threshold
 * (items 0.6, board 0.4, replies 0.5, vendor 0.55).
 *
 * Embeddings: browser uses a Web Worker (see worker.ts / embed.worker.ts).
 * Node tests use embedFallback (bag-of-chars 384-d) so they never download BGE.
 */

import Fuse from "fuse.js";
import { ITEM_CATEGORIES, type ItemCategory, type BoardId } from "@/data/rules";
import vendorData from "@/data/vendors.json";
import { embed, predict } from "./client";
import {
  headReady,
  isClassificationHead,
  isVendorHead,
  loadHead,
  predictWithHead,
  type ModelTask,
} from "./heads";
import { cosine, embedFallback, type PredictResult } from "./math";

export type { PredictResult, ModelTask };
export { embedFallback, predictFromHead, softmax, cosine } from "./math";
export { loadHead, clearHeadCache, predictWithHead, headReady } from "./heads";
export { embed, predict } from "./client";

export const THRESHOLDS = {
  items: 0.6,
  board: 0.4,
  replies: 0.5,
  vendor: 0.55,
} as const;

/** Human labels for UI chips. */
const ITEM_DISPLAY: Record<string, string> = {
  food: "food",
  venue: "venue",
  personnel: "personnel",
  lodging: "lodging",
  airfare: "airfare",
  registration: "registration",
  promo_merch: "promo merch",
  tshirt: "t-shirt",
  printing: "printing",
  supplies: "supplies",
  rental: "rental",
  other: "other",
  reimbursement: "reimbursement",
  charity: "charity payment",
  alcohol: "alcohol",
  gift: "gift or gift card",
  durable: "durable good",
  raw_food: "raw food",
  restaurant_dinner: "restaurant dinner",
  rideshare: "rideshare or rental car",
  deposit: "refundable deposit",
  p2p: "peer-to-peer payment",
  performer: "talent or performer fee",
  subscription: "subscription",
  jewelry: "jewelry",
  balloons: "balloons",
};

const BOARD_DISPLAY: Record<string, string> = {
  professional: "Professional/Academic",
  philanthropy: "Philanthropy",
  social: "Social & Startup",
  arts: "Performing & Visual Arts",
};

const REPLY_DISPLAY: Record<string, string> = {
  interested: "interested",
  needs_more_info: "needs more info",
  declined: "declined",
  out_of_office: "out of office",
  referral_to_someone_else: "referral to someone else",
  wrong_person_or_bounce: "wrong person or bounce",
  unsubscribe: "unsubscribe",
  // legacy stub labels
  question: "asking a question",
  scheduling: "scheduling",
  other: "other",
};

const ITEM_SET = new Set<string>(ITEM_CATEGORIES);

/** Map a model label onto an engine ItemCategory when needed. */
export function mapItemLabel(label: string): ItemCategory | null {
  const raw = label.trim().toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
  const aliases: Record<string, ItemCategory> = {
    durable_good: "durable",
    durable_goods: "durable",
    gift_card: "gift",
    gifts: "gift",
    gift_cards: "gift",
    t_shirt: "tshirt",
    t_shirts: "tshirt",
    tee: "tshirt",
    tees: "tshirt",
    merch: "promo_merch",
    swag: "promo_merch",
    catering: "food",
    catered: "food",
    performer_fee: "performer",
    talent: "performer",
    dj: "performer",
  };
  const mapped = (ITEM_SET.has(raw) ? raw : aliases[raw]) as ItemCategory | undefined;
  return mapped ?? null;
}

export function displayItemLabel(label: string): string {
  const cat = mapItemLabel(label) ?? label;
  return ITEM_DISPLAY[cat] ?? cat.replace(/_/g, " ");
}

export function displayBoardLabel(label: string): string {
  return BOARD_DISPLAY[label] ?? label;
}

export function displayReplyLabel(label: string): string {
  return REPLY_DISPLAY[label] ?? label.replace(/_/g, " ");
}

export type ClassSuggestion = {
  label: string;
  p: number;
  display: string;
  top2: { label: string; p: number; display?: string }[];
};

export type BoardSuggestion = {
  label: BoardId;
  p: number;
  display: string;
  top2: { label: BoardId; p: number; display: string }[];
};

async function classify(
  task: "items" | "board" | "replies",
  text: string,
  threshold: number,
): Promise<ClassSuggestion | null> {
  const trimmed = text.trim();
  if (trimmed.length < 3) return null;
  const head = await loadHead(task);
  if (!head || !isClassificationHead(head) || !headReady(head)) return null;

  let result: PredictResult | null = null;
  if (typeof window === "undefined") {
    // Node: never download BGE; use fallback embedding + head math.
    result = predictWithHead(head, embedFallback(trimmed));
  } else {
    const preds = await predict(task, [trimmed]);
    result = preds[0] ?? null;
  }
  if (!result || result.p < threshold) return null;

  if (task === "items") {
    const mapped = mapItemLabel(result.label);
    if (!mapped) return null;
    return {
      label: mapped,
      p: result.p,
      top2: result.top2.map((t) => ({ label: mapItemLabel(t.label) ?? t.label, p: t.p })),
      display: displayItemLabel(mapped),
    };
  }
  if (task === "board") {
    const ok = ["professional", "philanthropy", "social", "arts"].includes(result.label);
    if (!ok) return null;
    return { ...result, display: displayBoardLabel(result.label) };
  }
  return { ...result, display: displayReplyLabel(result.label) };
}

/** Budget line category. Threshold 0.6. */
export async function classifyItem(text: string): Promise<ClassSuggestion | null> {
  return classify("items", text, THRESHOLDS.items);
}

/** Funding board from event description. Threshold 0.4. Returns top label; top2 for UI. */
export async function routeBoard(text: string): Promise<BoardSuggestion | null> {
  const r = await classify("board", text, THRESHOLDS.board);
  if (!r) return null;
  return {
    ...r,
    label: r.label as BoardId,
    display: displayBoardLabel(r.label),
    top2: r.top2
      .filter((t) => ["professional", "philanthropy", "social", "arts"].includes(t.label))
      .map((t) => ({ label: t.label as BoardId, p: t.p, display: displayBoardLabel(t.label) })),
  };
}

/** Inbound reply label. Threshold 0.5. */
export async function classifyReply(text: string): Promise<ClassSuggestion | null> {
  return classify("replies", text, THRESHOLDS.replies);
}

export type VendorSuggestion = { name: string; listed: boolean; score: number };

/**
 * Did-you-mean against USG vendors: 0.5 fuse string similarity + 0.5 cosine
 * on embeddings when the vendor head provides them. Threshold 0.55.
 */
export async function matchVendor(query: string): Promise<VendorSuggestion[] | null> {
  const q = query.trim();
  if (q.length < 2) return null;
  const head = await loadHead("vendor");
  if (!head || !isVendorHead(head) || !headReady(head)) return null;

  const listed = vendorData.vendors.map((v) => ({
    name: v.name.replace(/\s*[\[(].*$/, "").trim() || v.name,
    listed: Boolean(v.active),
    embedding: head.vendors.find((h) => h.name === v.name)?.embedding,
  }));

  // Prefer head.vendors when the training agent populated them.
  const pool =
    head.vendors.length > 0
      ? head.vendors.map((v) => ({ name: v.name, listed: v.listed, embedding: v.embedding }))
      : listed;

  const fuseWeight = head.fuseWeight ?? 0.5;
  const cosineWeight = head.cosineWeight ?? 0.5;

  const fuse = new Fuse(pool, { keys: ["name"], includeScore: true, threshold: 0.5 });
  const fuseHits = fuse.search(q);
  const fuseMap = new Map<string, number>();
  for (const h of fuseHits) {
    // fuse score: 0 = perfect, 1 = miss → similarity
    fuseMap.set(h.item.name, 1 - (h.score ?? 1));
  }

  let qEmb: number[] | null = null;
  const needsCosine = pool.some((p) => p.embedding && p.embedding.length);
  if (needsCosine) {
    qEmb = (await embed([q]))[0] ?? embedFallback(q);
  }

  const scored: VendorSuggestion[] = [];
  const seen = new Set<string>();
  for (const v of pool) {
    if (seen.has(v.name)) continue;
    seen.add(v.name);
    const f = fuseMap.get(v.name) ?? 0;
    let c = 0;
    if (qEmb && v.embedding && v.embedding.length) c = Math.max(0, cosine(qEmb, v.embedding));
    else if (!needsCosine) c = f; // string-only head: cosine side mirrors fuse
    const score = fuseWeight * f + cosineWeight * c;
    if (score >= THRESHOLDS.vendor) scored.push({ name: v.name, listed: v.listed, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.length ? scored.slice(0, 5) : null;
}

export type CorrectionSource = "officer_correction" | "reviewer_decision" | "reply_confirmed";

/**
 * Stub: queue a correction locally for later training sync.
 * Does not hit the network yet; schema table is training_examples.
 */
export function saveCorrection(
  task: ModelTask,
  text: string,
  label: string,
  source: CorrectionSource = "officer_correction",
): void {
  if (typeof window === "undefined") return;
  try {
    const key = "gl-model-corrections";
    const prev = JSON.parse(localStorage.getItem(key) ?? "[]") as unknown[];
    prev.push({ task, text, label, source, at: new Date().toISOString() });
    localStorage.setItem(key, JSON.stringify(prev.slice(-200)));
  } catch {
    /* ignore quota */
  }
}

/** Force-run head math with fallback embedding (tests / demos, ignores ready flag). */
export async function predictReadyOrStub(
  task: "items" | "board" | "replies",
  text: string,
): Promise<PredictResult | null> {
  const head = await loadHead(task);
  if (!head || !isClassificationHead(head)) return null;
  return predictWithHead(head, embedFallback(text));
}
