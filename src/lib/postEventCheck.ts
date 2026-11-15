// Post-event consistency checks: plain code, no AI. Only flags differences from the approved application
// and missing Section 9 items. Does not invent required wording.
import { POST_EVENT_FIELDS, RULES } from "@/data/rules";
import { addBusinessDays } from "./decisionGuard";
import { money, requestItems, todayISO } from "./engine";
import type { Application, Check } from "./types";

export type PostEventIssue = {
  id: string;
  level: "fail" | "warn";
  title: string;
  detail: string;
  confirmedByUsg: boolean;
};

/** Business-day window after the event for evaluation and invoices (Guidelines Section 9). */
export function postEventDueDate(app: Application) {
  if (!app.event.date) return null;
  return addBusinessDays(app.event.date, 3);
}

export function postEventConsistency(app: Application, today = todayISO()): PostEventIssue[] {
  const pe = app.postEvent;
  const issues: PostEventIssue[] = [];
  const funded = requestItems(app).filter((i) => {
    if (!app.decision || app.decision.outcome === "denied") return false;
    // Partial awards: treat all remaining USG lines as funded unless excluded by amount=0 edge cases.
    return true;
  });

  if (!pe) {
    issues.push({
      id: "missing-report",
      level: "warn",
      title: "Post-event report not started",
      detail: "Section 9 asks for the EngageSC evaluation, photos with members in attendance, and final invoices within 3 business days.",
      confirmedByUsg: true,
    });
    return issues;
  }

  if (pe.reportTitle && pe.reportTitle.trim() && pe.reportTitle.trim() !== app.event.title.trim()) {
    issues.push({
      id: "title-mismatch",
      level: "fail",
      title: "Report event title differs from the approved application",
      detail: `Approved title is "${app.event.title}". The report says "${pe.reportTitle}".`,
      confirmedByUsg: true,
    });
  }

  if (!pe.photos) {
    issues.push({
      id: "photos-missing",
      level: "fail",
      title: "Photos with members in attendance are missing",
      detail: RULES.postEvent.quote,
      confirmedByUsg: true,
    });
  }

  if (!pe.invoices) {
    issues.push({
      id: "invoices-missing",
      level: "fail",
      title: "Final invoices are missing",
      detail: RULES.postEvent.quote,
      confirmedByUsg: true,
    });
  }

  for (const i of funded) {
    const inv = pe.lineInvoices?.[i.id];
    if (!inv || !inv.fileName) {
      issues.push({
        id: `invoice-${i.id}`,
        level: "warn",
        title: `No final invoice for ${i.item}`,
        detail: `Approved line ${money(i.total)}. Attach the final invoice for this vendor.`,
        confirmedByUsg: true,
      });
    } else if (Math.abs(inv.amount - i.total) > 0.5) {
      issues.push({
        id: `amount-${i.id}`,
        level: "warn",
        title: `${i.item}: invoice amount differs from the award line`,
        detail: `Approved ${money(i.total)}; invoice ${money(inv.amount)}.`,
        confirmedByUsg: true,
      });
    }
  }

  const due = postEventDueDate(app);
  if (due && today >= due && app.status === "post_event_due") {
    issues.push({
      id: "window-closing",
      level: "fail",
      title: `3-business-day window ends ${due}`,
      detail: "Section 9: evaluation, photos, and final invoices are due within 3 business days of the event.",
      confirmedByUsg: true,
    });
  } else if (due && today > addBusinessDays(app.event.date, 1) && app.status === "post_event_due") {
    issues.push({
      id: "window-soon",
      level: "warn",
      title: `Post-event window closes ${due}`,
      detail: "Submit the EngageSC evaluation, photos, and invoices soon.",
      confirmedByUsg: true,
    });
  }

  void POST_EVENT_FIELDS;
  return issues;
}

/** Map issues into Check-shaped objects for UI reuse (not mixed into runChecks). */
export function postEventAsChecks(app: Application, today = todayISO()): Check[] {
  return postEventConsistency(app, today).map((x) => ({
    id: x.id,
    ruleId: "post-event",
    level: x.level,
    title: x.title,
    detail: x.detail,
    quote: RULES.postEvent.quote,
    section: x.confirmedByUsg ? RULES.postEvent.section : "Pending confirmation",
    heuristic: !x.confirmedByUsg,
  }));
}
