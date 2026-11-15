import { RULES } from "@/data/rules";
import type { FundingStackEntry } from "@/lib/types";

export const FUNDING_STACK_SOURCES = [
  { id: "usg-funding", label: "USG Funding Department", usc: true, usg: true },
  { id: "legislative-fund", label: "Legislative Fund", usc: true, usg: false },
  { id: "programming-assembly", label: "Programming assembly", usc: true, usg: false },
  { id: "academic-department", label: "Academic department", usc: true, usg: false },
  { id: "viterbi-sos", label: "Viterbi SOS", usc: true, usg: false },
  { id: "viterbi-vfb", label: "Viterbi VFB", usc: true, usg: false },
  { id: "marshall", label: "Marshall", usc: true, usg: false },
  { id: "price", label: "Price", usc: true, usg: false },
  { id: "gsg", label: "GSG", usc: true, usg: false },
  { id: "ignitesc", label: "IgniteSC", usc: true, usg: false },
  { id: "sponsors-in-kind", label: "Sponsors in kind", usc: false, usg: false },
  { id: "dues", label: "Dues", usc: false, usg: false },
] as const;

export const SECTION6_OTHER_FUNDING_QUOTE = RULES.otherFunding.quote;

/** Line item ids listed on more than one stack entry (double coverage). */
export function doubleCoveredLineIds(entries: Pick<FundingStackEntry, "lineIds">[]): string[] {
  const hits = new Map<string, number>();
  for (const e of entries) {
    for (const id of e.lineIds) hits.set(id, (hits.get(id) ?? 0) + 1);
  }
  return [...hits.entries()].filter(([, n]) => n > 1).map(([id]) => id);
}

/** True when a USC source other than USG covers at least one line (non-declined). */
const USC_NON_USG_SOURCE_IDS = new Set(
  FUNDING_STACK_SOURCES.filter((s) => s.usc && !s.usg).map((s) => s.id as string),
);

export function needsSection6Disclosure(entries: FundingStackEntry[]): boolean {
  return entries.some(
    (e) => e.status !== "declined" && e.lineIds.length > 0 && USC_NON_USG_SOURCE_IDS.has(e.source),
  );
}

export function sourceLabel(sourceId: string): string {
  return FUNDING_STACK_SOURCES.find((s) => s.id === sourceId)?.label ?? sourceId;
}