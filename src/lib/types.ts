import type { BoardId, ItemCategory } from "@/data/rules";

export type Club = {
  id: string;
  name: string;
  school: "Viterbi" | "Marshall" | "Dornsife" | "Other";
  /** First registered with Campus Activities within the last two semesters (Startup fund). */
  startupEligible: boolean;
  /** USG Funding Department money already awarded this academic year. */
  receivedThisYear: number;
  /** USG-funded events already this semester. */
  eventsThisSemester: number;
};

export type EventInfo = {
  title: string;
  type: string;
  date: string; // YYYY-MM-DD
  location: string;
  onCampus: boolean;
  attendance: number;
  openToAll: boolean;
  ticketed: boolean;
  privateResidence: boolean;
  travel: boolean;
  international: boolean;
  food: boolean;
  description: string;
  board: BoardId;
  boardReason: string;
};

export type QuoteCheck = { fileName: string; vendor: string | null; total: number | null; matches: boolean; note: string };

export type LineItem = {
  id: string;
  item: string;
  vendor: string;
  link: string;
  justification: string;
  quantity: number;
  unitPrice: number;
  total: number; // including tax
  orderBy: string; // YYYY-MM-DD or ""
  category: ItemCategory;
  /** Price is an AI estimate, not from a quote. */
  estimate: boolean;
  /** Moved to the sponsor list instead of the USG request. */
  toSponsor: boolean;
  quote?: QuoteCheck;
};

export type CheckLevel = "fail" | "warn" | "pass" | "info";

export type Check = {
  id: string;
  ruleId: string;
  level: CheckLevel;
  title: string;
  detail: string;
  quote: string;
  section: string;
  itemId?: string;
  fix?: { label: string; action: "cap-food" | "to-sponsor" | "remove" };
};

export type Status = "draft" | "submitted" | "in_review" | "needs_info" | "approved" | "partial" | "denied" | "post_event_due" | "closed";

export type AiComment = {
  id: string;
  checkId: string | null;
  text: string;
  citation: string;
  action: "pending" | "agree" | "disagree" | "edited";
  edited?: string;
};

export type Decision = {
  outcome: "approved" | "partial" | "denied";
  amount: number;
  reasonCode: string;
  email: string;
  sentAt: string;
};

export type Application = {
  id: string;
  clubId: string;
  sample: boolean;
  event: EventInfo;
  items: LineItem[];
  answers: { description: string; missionFit: string; otherSources: string };
  docs: Record<string, boolean>;
  uepa: string;
  status: Status;
  createdAt: string;
  submittedAt: string | null;
  history: { at: string; status: Status; note: string }[];
  aiComments: AiComment[];
  decision: Decision | null;
  sponsorPlan: SponsorPlan | null;
};

export type SponsorPackage = { title: string; covers: string; amount: number; offer: string[] };
export type SponsorPick = { sponsorId: string; name: string; reason: string; packageTitle: string; score: number };
export type SponsorPlan = { packages: SponsorPackage[]; picks: SponsorPick[]; email: { to: string; subject: string; body: string } | null };
