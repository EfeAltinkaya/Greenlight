"use client";
import { useState } from "react";
import { DEADLINES, DEADLINES_URL } from "@/data/deadlines";
import { findWeek, fmtDate, lookupDeadline, todayISO } from "@/lib/engine";

const short = (d: string) => fmtDate(d, { month: "short", day: "numeric" });

export default function Deadlines() {
  const today = todayISO();
  const [date, setDate] = useState("2027-02-18");
  const [travel, setTravel] = useState(false);
  const r = date ? lookupDeadline(date, travel, today) : null;
  const week = date ? findWeek(date) : null;

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Deadlines</span>
          <h1>When do you have to apply?</h1>
          <p className="lede">USG counts in academic weeks and skips breaks, so the answer is rarely what you expect. Pick your event date.</p>
        </div>
      </div>

      <section className="grid cols-2" style={{ alignItems: "stretch" }}>
        <div className="card card-pad stack" style={{ gap: 18 }}>
          <label className="field"><span className="lbl">Event date</span><input id="dl-date" className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ fontSize: 17 }} /></label>
          <div className="segmented" role="group" aria-label="Vendor type">
            <button aria-pressed={!travel} onClick={() => setTravel(false)}>Vendors on USG&apos;s list</button>
            <button aria-pressed={travel} onClick={() => setTravel(true)}>Travel or a new vendor</button>
          </div>
          <p className="tiny faint">6 academic weeks for approved vendors, 9 for travel and vendors not on the list. Applications are due Wednesdays at 11:59 PM.</p>
        </div>
        {r && r.kind === "ok" ? (
          <div className={"deadline" + (r.passed ? " late" : "")} style={{ alignContent: "center" }}>
            <div><div className="dl-days">{r.passed ? "Late" : r.daysLeft}</div><div className="dl-unit">{r.passed ? "passed" : "days left"}</div></div>
            <div className="stack-xs">
              <div className="dl-date">{r.passed ? "Passed on" : "Submit by"} {fmtDate(r.deadline, { weekday: "long", month: "long", day: "numeric" })}</div>
              <div className="dl-sub">For events the week of {short(r.row.weekStart)} to {short(r.row.weekEnd)}.{r.cliff ? ` One week later, the deadline is ${short(r.cliff.deadline)}: ${r.cliff.gainDays} more days.` : ""}</div>
            </div>
          </div>
        ) : r ? (
          <div className="deadline late"><div className="dl-days" style={{ fontSize: 34 }}>No</div><div className="stack-xs"><div className="dl-date">No USG funding for this date</div><div className="dl-sub">{r.reason}</div></div></div>
        ) : null}
      </section>

      <section className="stack-sm">
        <div className="between"><h2>USG&apos;s 2026-27 deadline sheet</h2><a className="link small" href={DEADLINES_URL} target="_blank" rel="noreferrer">Source</a></div>
        <div className="card table-wrap">
          <table className="table stackable">
            <thead><tr><th>Event week</th><th>Approved vendors (6 weeks)</th><th>Travel or new vendor (9 weeks)</th></tr></thead>
            <tbody>
              {DEADLINES.map((d) => {
                const mine = week === d;
                const fmt = (x: string | null) => (x ? <span className={x < today ? "faint" : ""} style={x < today ? { textDecoration: "line-through" } : undefined}>{fmtDate(x, { weekday: "short", month: "short", day: "numeric" })}</span> : <span className="faint">No funding</span>);
                return (
                  <tr key={d.weekStart} className={mine ? "hl click" : "click"} onClick={() => setDate(d.weekStart)}>
                    <td className="num" style={{ whiteSpace: "nowrap", fontWeight: mine ? 600 : 400 }}>{d.weekStart === "2026-12-07" ? "Dec 5 – Jan 12 (no funding)" : `${short(d.weekStart)} – ${short(d.weekEnd)}`}{d.weekStart === "2027-01-11" ? <span className="tiny faint"> · events from Jan 13</span> : null}</td>
                    <td data-label="Approved vendors (6 wk)" className="num">{fmt(d.six)}</td>
                    <td data-label="Travel or new vendor (9 wk)" className="num">{fmt(d.nine)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="tiny faint">Crossed-out dates have passed. Events from Dec 5, 2026 to Jan 12, 2027 and after May 1, 2027 are not funded (sample application, Application Timelines).</p>
      </section>
    </>
  );
}
