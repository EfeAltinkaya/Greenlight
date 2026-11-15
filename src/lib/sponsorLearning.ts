// Sponsor ranking that learns from what actually happens to outreach (Thompson sampling, a multi-armed bandit).
//
// Each email a club sends is an experiment: did the company reply (or commit), or not? We keep a Beta
// distribution of each company's reply chance. Before a company has any history, its prior comes from
// companies like it: the same USC-tie status and the same industry, learned from everyone's outcomes.
// Ranking samples one plausible reply chance per company from its distribution: proven companies rank on
// their record, and companies with little history still get tried sometimes (exploration). The sample is
// seeded per club per day, so the order is stable while you work and only shifts as results come in.
// Everything is plain code: every number on screen traces back to counted outcomes.
import type { Sponsor } from "@/data/sponsors";
import type { Outreach } from "./types";
import type { Match } from "./sponsorMatch";

/** Reply counts for one company. Shared across clubs as counts only, never which club. */
export type Tally = { replies: number; misses: number };
export type Tallies = Record<string, Tally>;

/** An email with no answer after this many days counts as a miss. */
export const NO_REPLY_DAYS = 14;
/** How many outcomes the similar-company prior is worth. Small, so a company's own record wins quickly. */
const PRIOR_WEIGHT = 4;

const days = (from: string, to: string) => (Date.parse(to) - Date.parse(from)) / 86_400_000;

/** Turn outreach rows into outcomes: replied or committed = reply; declined or 14 days of silence = miss. */
export function tally(rows: Pick<Outreach, "sponsorId" | "status" | "updatedAt">[], today: string): Tallies {
  const t: Tallies = {};
  for (const o of rows) {
    const hit = o.status === "replied" || o.status === "committed";
    const miss = o.status === "declined" || (o.status === "emailed" && days(o.updatedAt, today) >= NO_REPLY_DAYS);
    if (!hit && !miss) continue;
    const x = (t[o.sponsorId] ??= { replies: 0, misses: 0 });
    if (hit) x.replies++;
    else x.misses++;
  }
  return t;
}

export const mergeTallies = (...ts: Tallies[]): Tallies => {
  const out: Tallies = {};
  for (const t of ts) for (const [k, v] of Object.entries(t)) {
    const x = (out[k] ??= { replies: 0, misses: 0 });
    x.replies += v.replies;
    x.misses += v.misses;
  }
  return out;
};

/** Groups a company belongs to, so what we learn about one company informs similar ones. */
const groupsOf = (s: Sponsor) => [s.tie ? "tie" : "no-tie", `industry:${s.industry}`];

export type Learned = {
  /** Expected reply chance (posterior mean), 0..1. */
  mean: number;
  /** The company's own outcomes so far. */
  seen: number;
  replies: number;
  /** The Thompson sample used to rank today. */
  sample: number;
  /** What the prior was built from, in words. */
  basis: string;
};

export function learn(pool: Sponsor[], tallies: Tallies, seed: string): Record<string, Learned> {
  // 1. Pool outcomes by group (USC tie or not, industry), with a flat Beta(1, 1) start.
  const groups: Record<string, Tally> = {};
  for (const s of pool) {
    const own = tallies[s.id];
    if (!own) continue;
    for (const g of groupsOf(s)) {
      const x = (groups[g] ??= { replies: 0, misses: 0 });
      x.replies += own.replies;
      x.misses += own.misses;
    }
  }
  const groupMean = (g: string) => { const x = groups[g] ?? { replies: 0, misses: 0 }; return (1 + x.replies) / (2 + x.replies + x.misses); };
  const rand = rng(seed);
  const out: Record<string, Learned> = {};
  for (const s of pool) {
    // 2. Prior for this company: the average reply rate of its groups, worth PRIOR_WEIGHT outcomes.
    const gs = groupsOf(s);
    const prior = gs.reduce((sum, g) => sum + groupMean(g), 0) / gs.length;
    const own = tallies[s.id] ?? { replies: 0, misses: 0 };
    // 3. Posterior Beta(a, b) = prior pseudo-counts + this company's own replies and misses.
    const a = prior * PRIOR_WEIGHT + own.replies;
    const b = (1 - prior) * PRIOR_WEIGHT + own.misses;
    const groupSeen = gs.reduce((n, g) => n + (groups[g] ? groups[g].replies + groups[g].misses : 0), 0);
    out[s.id] = {
      mean: a / (a + b),
      seen: own.replies + own.misses,
      replies: own.replies,
      sample: betaSample(a, b, rand),
      basis: own.replies + own.misses > 0 ? "its own replies" : groupSeen > 0 ? `similar companies (${s.tie ? "with" : "without"} a USC tie, ${s.industry})` : "no results yet",
    };
  }
  return out;
}

/**
 * Final order: event fit (the explainable match score) times how likely the company is to answer.
 * A company that fits well but never replies sinks; one that replies often rises.
 */
export function rerank(matches: Match[], learned: Record<string, Learned>): (Match & { learned: Learned; rank: number })[] {
  return matches
    .map((m) => {
      const l = learned[m.sponsor.id];
      // 0.5 + sample keeps fit in charge: a reply chance of 50% leaves the score as is, 90% lifts it 40%.
      return { ...m, learned: l, rank: m.score * (0.5 + (l?.sample ?? 0.5)) };
    })
    .sort((x, y) => y.rank - x.rank || y.score - x.score || x.sponsor.name.localeCompare(y.sponsor.name));
}

// ---- small, dependency-free sampling helpers ----

/** Deterministic random numbers (mulberry32) from a string seed. */
export function rng(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 3432918353), (h = (h << 13) | (h >>> 19));
  let t = h >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function normal(rand: () => number) {
  const u = Math.max(rand(), 1e-12);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

/** Gamma(k, 1) sample (Marsaglia and Tsang), with the k < 1 boost. */
function gamma(k: number, rand: () => number): number {
  if (k < 1) return gamma(k + 1, rand) * Math.pow(Math.max(rand(), 1e-12), 1 / k);
  const d = k - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x: number, v: number;
    do { x = normal(rand); v = 1 + c * x; } while (v <= 0);
    v = v * v * v;
    const u = rand();
    if (u < 1 - 0.0331 * x ** 4 || Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

export function betaSample(a: number, b: number, rand: () => number) {
  const x = gamma(a, rand);
  const y = gamma(b, rand);
  return x / (x + y);
}
