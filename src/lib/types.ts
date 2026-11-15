import type { BoardId, ItemCategory } from "@/data/rules";

export type Club = {
  id: string;
  name: string;
  school: "Viterbi" | "Marshall" | "Dornsife" | "Price" | "Annenberg" | "Cinematic Arts" | "Thornton" | "Kaufman" | "Roski" | "Other";
  /** First registered with Campus Activities within the last two semesters (Startup fund). */
  startupEligible: boolean;
  /** USG Funding Department money already awarded this academic year. */
  receivedThisYear: number;
  /** USG-funded events already this semester. */
  eventsThisSemester: number;
  /** One line the club writes once; used to draft the mission answer. */
  mission?: string;
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
  /** The club checked that this (non-food) vendor is approved by USG. Greenlight's copy of the list covers food only. */
  vendorConfirmed?: boolean;
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
  fix?: { label: string; action: "cap-food" | "to-sponsor" | "remove" | "confirm-vendor" };
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
  /** Whether the drafted letter was emailed (or only saved in-app). */
  emailed?: boolean;
};

export type AuditEntry = {
  at: string;
  by: "club" | "usg" | "system";
  action: string;
  detail: string;
};

export type PostEventEval = {
  photos: boolean;
  invoices: boolean;
  notes: string;
  submittedAt?: string;
};

export type Application = {
  id: string;
  clubId: string;
  sample: boolean;
  event: EventInfo;
  items: LineItem[];
  answers: { description: string; missionFit: string; otherSources: string };
  docs: Record<string, boolean>;
  /** File names attached per document key. */
  docFiles?: Record<string, string>;
  /** Storage path or idb: key per document, for USG preview. */
  docPaths?: Record<string, string>;
  uepa: string;
  status: Status;
  createdAt: string;
  submittedAt: string | null;
  history: { at: string; status: Status; note: string }[];
  aiComments: AiComment[];
  decision: Decision | null;
  sponsorPlan: SponsorPlan | null;
  altRequests?: AltRequest[];
  /** Immutable-ish trail of reviewer/club actions that matter for fairness. */
  audit?: AuditEntry[];
  postEvent?: PostEventEval;
  /** What a USG reviewer asked the club to fix instead of denying the request. */
  fixRequest?: { at: string; items: { text: string; checkId?: string }[]; note: string };
};

export type SponsorPackage = { title: string; covers: string; amount: number; offer: string[] };
export type SponsorPick = { sponsorId: string; name: string; reason: string; packageTitle: string; score: number };
export type SponsorPlan = { packages: SponsorPackage[]; picks: SponsorPick[]; email: { to: string; subject: string; body: string } | null };

export type OutreachStatus = "shortlist" | "emailed" | "replied" | "committed" | "declined";

/** One company the club is working on for one request. People are typed in by the officer, never scraped. */
export type Outreach = {
  id: string;
  clubId: string;
  appId: string | null;
  sponsorId: string;
  packageTitle: string;
  amount: number;
  status: OutreachStatus;
  contactName: string;
  contactInfo: string;
  notes: string;
  committed: number;
  followUp: string;
  updatedAt: string;
  email: { subject: string; body: string } | null;
};

// ---------- Sponsor portal ----------

/** What a sponsor posts: the kind of event it wants to support and what it asks for in return. */
export type Offer = {
  id: string;
  sponsorName: string;
  sponsorEmail: string;
  title: string;
  themes: string[];
  majors: string[];
  windowStart: string; // YYYY-MM-DD
  windowEnd: string;
  gives: string; // what the sponsor provides, in kind or paid to the vendor
  maxAmount: number;
  asks: string[]; // what the sponsor wants back
  createdAt: string;
  sample?: boolean;
};

export type DealStage = "requested" | "details_sent" | "contract_ready" | "signed" | "vendor_invoiced" | "paid" | "event_done" | "recap_sent" | "declined";

/** One club working with one sponsor on one event, from first request to post-event recap. */
export type Deal = {
  id: string;
  offerId: string | null;
  clubId: string;
  appId: string | null;
  sponsorName: string;
  sponsorEmail: string;
  stage: DealStage;
  amount: number;
  covers: string;
  deliverables: string[];
  message: string;
  contract: { text: string; clubSignedBy: string; clubSignedAt: string; sponsorSignedBy: string; sponsorSignedAt: string } | null;
  invoice: { fileName: string; amount: number; vendor: string; uploadedAt: string } | null;
  recap: string;
  history: { at: string; stage: DealStage; note: string; by: "club" | "sponsor" | "system" }[];
};

/** A request to another USC funding source after USG denies or partly funds. */
export type AltRequest = { sourceId: string; status: "drafted" | "applied" | "awarded" | "declined"; amount: number; draft: string; updatedAt: string };

export type Notice = { id: string; at: string; to: "club" | "usg" | "sponsor"; clubId: string | null; title: string; body: string; href: string; read: boolean };
