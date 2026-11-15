"use client";
import { useMemo } from "react";
import { CalendarDays, Download } from "lucide-react";
import { buildEventTimeline, exportTimelineIcs } from "@/lib/eventTimeline";
import { fmtDate, todayISO } from "@/lib/engine";
import type { Application, Club } from "@/lib/types";

const OUTDOOR_RE = /\b(outdoor|outside|lawn|plaza|patio|courtyard|quad|park|field|walkway|fountain|garden|rooftop)\b/i;

export function EventTimelineCard({ app, club, needsNine }: { app: Application; club: Club; needsNine: boolean }) {
  const today = todayISO();
  const outdoor = OUTDOOR_RE.test(app.event.location);
  const items = useMemo(
    () => buildEventTimeline({ eventDate: app.event.date, outdoor, needsNineWeeks: needsNine, today }),
    [app.event.date, outdoor, needsNine, today],
  );
  const firstTime = club.eventsThisSemester === 0 || club.startupEligible;
  if (!app.event.date || !items.length) return null;

  function download() {
    const ics = exportTimelineIcs(items, app.event.title || "Event");
    if (!ics) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    a.download = `${(app.event.title || "event").replace(/\W+/g, "")}_timeline.ics`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <section className="card card-pad stack" aria-labelledby="timeline-h">
      <div className="between">
        <div className="stack-xs">
          <span className="eyebrow">Event timeline</span>
          <h2 id="timeline-h" style={{ fontSize: 22 }}>Your checklist, counted back from {fmtDate(app.event.date)}</h2>
        </div>
        <button className="btn" onClick={download}><Download />Add to calendar (.ics)</button>
      </div>
      <ol className="stack-sm" style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {items.map((i) => (
          <li key={i.id} className="stack-xs" style={{ paddingBottom: 10, borderBottom: "1px solid var(--line-2)" }}>
            <div className="between">
              <strong>{i.title}</strong>
              <span className="small muted" style={{ whiteSpace: "nowrap" }}>
                <CalendarDays style={{ width: 14, height: 14, verticalAlign: -2, marginRight: 4 }} />
                {i.dueDate ? <>{fmtDate(i.dueDate, { weekday: "short" })}{i.dueDate < today ? " (date has passed)" : ""}</> : "Note, no fixed date"}
              </span>
            </div>
            <span className="tiny faint">Source: {i.source}</span>
            {firstTime && i.why && <span className="small muted">Why: {i.why}</span>}
          </li>
        ))}
      </ol>
      <p className="tiny faint">USG does not publish a review time, so no decision date is shown. Dates other than USG&apos;s deadline follow the standard lead times; confirm them with the office involved.</p>
    </section>
  );
}
