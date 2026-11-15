// The workflow engine: every step of an application and of a sponsor deal is a transition with
// an owner (club, USG, sponsor). Each transition records history and produces the notices that
// go to the other side automatically. Pages never change status directly; they call these.
import { money, todayISO } from "./engine";
import { requestIdOf, subjectTag } from "./requestId";
import type { Application, Deal, DealStage, Notice, Status } from "./types";

type Actor = "club" | "usg" | "sponsor" | "system";
const nid = () => Math.random().toString(36).slice(2, 10);
const notice = (to: Notice["to"], clubId: string | null, title: string, body: string, href: string): Notice => ({ id: nid(), at: new Date().toISOString(), to, clubId, title, body, href, read: false });

// ---------- Applications ----------

export const APP_FLOW: Record<Status, { next: Status[]; owner: Actor; label: string }> = {
  draft: { next: ["submitted"], owner: "club", label: "Club is preparing" },
  submitted: { next: ["in_review", "needs_info", "approved", "partial", "denied"], owner: "usg", label: "Waiting for a USG reviewer" },
  in_review: { next: ["needs_info", "approved", "partial", "denied"], owner: "usg", label: "USG is reviewing" },
  needs_info: { next: ["submitted", "denied"], owner: "club", label: "Club must send missing items (2 business days)" },
  approved: { next: ["post_event_due"], owner: "system", label: "USG pays vendors directly" },
  partial: { next: ["post_event_due"], owner: "system", label: "USG pays vendors directly for the funded part" },
  denied: { next: [], owner: "club", label: "Look for other funding" },
  post_event_due: { next: ["closed"], owner: "club", label: "Evaluation and invoices due within 3 business days" },
  closed: { next: [], owner: "system", label: "Done" },
};

export function moveApp(app: Application, to: Status, by: Actor, note: string): { app: Application; notices: Notice[] } {
  if (!APP_FLOW[app.status].next.includes(to)) throw new Error(`An application cannot go from ${app.status} to ${to}.`);
  const at = todayISO();
  const next: Application = { ...app, status: to, history: [...app.history, { at, status: to, note }], submittedAt: to === "submitted" ? at : app.submittedAt };
  const t = app.event.title;
  const tag = subjectTag(app);
  const notices: Notice[] = [];
  const club = `/club/app/${app.id}`;
  const usg = `/usg/app/${app.id}`;
  if (to === "submitted") notices.push(notice("usg", app.clubId, `${tag} New application: ${t}`, app.status === "needs_info" ? "The club sent the missing items." : "A club submitted a new request. It is already checked against the guidelines.", usg));
  if (to === "in_review") notices.push(notice("club", app.clubId, `${tag} ${t} is being reviewed`, "A USG funding director opened your application.", club));
  if (to === "needs_info") notices.push(notice("club", app.clubId, `${tag} ${t}: USG needs more information`, note + " You have 2 business days.", club));
  if (to === "approved" || to === "partial") notices.push(notice("club", app.clubId, `${tag} ${t}: funded`, note, club));
  if (to === "denied") notices.push(notice("club", app.clubId, `${tag} ${t}: not funded by USG`, "Greenlight has listed other USC sources you can apply to.", `/club/funding?app=${app.id}`));
  if (to === "post_event_due") notices.push(notice("club", app.clubId, `${tag} ${t}: post-event evaluation due`, "Submit photos and final invoices within 3 business days.", club));
  void by;
  return { app: next, notices };
}

/** Time-based steps nobody has to click: after an approved event happens, the evaluation becomes due. */
export function autoAdvance(app: Application, today = todayISO()) {
  if ((app.status === "approved" || app.status === "partial") && app.event.date && app.event.date < today) return moveApp(app, "post_event_due", "system", "The event took place. Evaluation and invoices are due.");
  return null;
}

// ---------- Sponsor deals ----------

export const DEAL_FLOW: Record<DealStage, { next: DealStage[]; owner: Actor; label: string; step: number }> = {
  requested: { next: ["details_sent", "declined"], owner: "sponsor", label: "Club asked for details", step: 1 },
  details_sent: { next: ["contract_ready", "declined"], owner: "club", label: "Sponsor replied with details", step: 2 },
  contract_ready: { next: ["signed", "declined"], owner: "sponsor", label: "Agreement drafted and signed by the club", step: 3 },
  signed: { next: ["vendor_invoiced"], owner: "club", label: "Both sides signed", step: 4 },
  vendor_invoiced: { next: ["paid"], owner: "sponsor", label: "Vendor invoice sent to the sponsor", step: 5 },
  paid: { next: ["event_done"], owner: "club", label: "Sponsor paid the vendor", step: 6 },
  event_done: { next: ["recap_sent"], owner: "club", label: "Event happened", step: 7 },
  recap_sent: { next: [], owner: "system", label: "Recap sent to the sponsor", step: 8 },
  declined: { next: [], owner: "system", label: "Declined", step: 0 },
};

export const DEAL_STEPS: DealStage[] = ["requested", "details_sent", "contract_ready", "signed", "vendor_invoiced", "paid", "event_done", "recap_sent"];

export function moveDeal(deal: Deal, to: DealStage, by: Actor, note: string, patch: Partial<Deal> = {}): { deal: Deal; notices: Notice[] } {
  if (!DEAL_FLOW[deal.stage].next.includes(to)) throw new Error(`A deal cannot go from ${deal.stage} to ${to}.`);
  const next: Deal = { ...deal, ...patch, stage: to, history: [...deal.history, { at: todayISO(), stage: to, note, by: by === "usg" ? "system" : by }] };
  const toSponsor = by === "club";
  const href = toSponsor ? `/sponsor/deals/${deal.id}` : `/club/deals/${deal.id}`;
  const who = toSponsor ? "The club" : deal.sponsorName;
  const titles: Partial<Record<DealStage, string>> = {
    details_sent: `${deal.sponsorName} sent details`,
    contract_ready: "Sponsorship agreement ready to sign",
    signed: "Agreement signed by both sides",
    vendor_invoiced: "Vendor invoice uploaded",
    paid: `${deal.sponsorName} paid the vendor`,
    event_done: "The event took place",
    recap_sent: "Post-event recap sent",
    declined: "Sponsorship declined",
  };
  const notices: Notice[] = [notice(toSponsor ? "sponsor" : "club", deal.clubId, titles[to] ?? "Sponsorship update", `${who}: ${note} (${deal.covers}, ${money(deal.amount)})`, href)];
  return { deal: next, notices };
}
