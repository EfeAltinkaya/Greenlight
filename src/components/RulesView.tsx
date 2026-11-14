"use client";
import { useState } from "react";
import { ExternalLink, Search, TriangleAlert } from "lucide-react";
import { BOARDS, GUIDELINES_URL, INELIGIBLE, RULES, type BoardId } from "@/data/rules";
import { DEADLINES_URL } from "@/data/deadlines";
import { money } from "@/lib/engine";

const GROUPS: { title: string; ids: (keyof typeof RULES)[] }[] = [
  { title: "Money limits", ids: ["annualCap", "eventsPerSemester", "venueCap", "overFourK"] },
  { title: "Food and lodging", ids: ["foodPerPerson", "foodDocs", "foodWhy", "hotelPerNight", "hotelCompare"] },
  { title: "Vendors, timing and paperwork", ids: ["vendorList", "late", "blackout", "uepa", "travelPurpose", "tshirts"] },
  { title: "Who and what qualifies", ids: ["openToAll", "ticketSales", "privateResidence", "internationalTravel", "startupMerch", "otherFunding"] },
];

const CONFLICTS = [
  { topic: "Travel deadline", a: "Guidelines: 9 academic weeks", b: "FAQ: 8 weeks, and elsewhere a four-week deadline" },
  { topic: "Fixing an incomplete application", a: "Guidelines and slides: 2 business days", b: "FAQ: 3 business days" },
  { topic: "What the deadline counts back from", a: "Guidelines: the initial payment due date", b: "FAQ: the event date" },
  { topic: "Vendors not on the list", a: "Guidelines: “We will not accept a vendor not on the list”", b: "FAQ: allows new vendors with 8 weeks' notice" },
  { topic: "Board names", a: "Guidelines: Performing and Visual Arts Fund", b: "Form: Performing, Visual Arts, & Cultural Fund" },
];

export function RulesView() {
  const [q, setQ] = useState("");
  const match = (s: string) => !q || s.toLowerCase().includes(q.toLowerCase());

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">USG rules, 2026-27</span>
          <h1>Every rule Greenlight checks.</h1>
          <p className="lede">Quoted word for word from USG&apos;s Funding Department Guidelines, current as of October 21, 2026. The checks run in code, never in the AI.</p>
        </div>
        <a className="btn" href={GUIDELINES_URL} target="_blank" rel="noreferrer">Open the guidelines<ExternalLink /></a>
      </div>

      <label className="card row" style={{ padding: "4px 16px", gap: 10, flexWrap: "nowrap" }}>
        <Search style={{ width: 18, height: 18, color: "var(--ink-3)" }} />
        <input id="rules-search" className="input" style={{ border: 0, boxShadow: "none", padding: "12px 0" }} placeholder="Search rules, for example “food” or “hotel”" value={q} onChange={(e) => setQ(e.target.value)} />
      </label>

      <section className="grid cols-2">
        {GROUPS.map((g) => {
          const rules = g.ids.map((id) => RULES[id]).filter((r) => match(r.quote + " " + g.title));
          if (!rules.length) return null;
          return (
            <div key={g.title} className="card card-pad stack-sm">
              <h2>{g.title}</h2>
              {rules.map((r) => (
                <div key={r.id} className="stack-xs" style={{ padding: "10px 0", borderTop: "1px solid var(--line-2)" }}>
                  <span className="tiny faint">{r.section}</span>
                  <span className="small">&ldquo;{r.quote}&rdquo;</span>
                </div>
              ))}
            </div>
          );
        })}
        {Object.values(INELIGIBLE).some((x) => match(x.label + x.quote + " never")) && (
          <div className="card card-pad stack-sm">
            <h2>Never fundable</h2>
            <p className="small muted">Section 5. Greenlight moves these to your sponsor list instead of deleting them.</p>
            <div className="row" style={{ gap: 6 }}>
              {Object.values(INELIGIBLE).filter((x) => match(x.label + x.quote + " never")).map((x) => <span key={x.label} className="pill pill-fix">{x.label}</span>)}
            </div>
          </div>
        )}
      </section>

      <section className="stack-sm">
        <h2>The four funding boards</h2>
        <div className="grid cols-4">
          {(Object.keys(BOARDS) as BoardId[]).map((b) => (
            <div key={b} className="card card-pad stack-sm">
              <h3>{BOARDS[b].short}</h3>
              <span className="big-num" style={{ fontSize: 24 }}>{money(BOARDS[b].fy26Budget)}</span>
              <div className="meter"><span style={{ width: `${Math.min(1, BOARDS[b].fy26Used) * 100}%` }} /></div>
              <span className="tiny faint">FY26: {Math.round(BOARDS[b].fy26Used * 100)}% used</span>
              <span className="small muted">&ldquo;{BOARDS[b].quote.slice(0, 120)}…&rdquo;</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card card-pad stack-sm">
        <div className="row" style={{ gap: 12 }}><span className="icon-tile gold"><TriangleAlert /></span><div className="stack-xs"><h2>Where USG&apos;s own documents disagree</h2><span className="small muted">Found while turning the rules into code. Greenlight follows the guidelines and flags the difference.</span></div></div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Topic</th><th>One document says</th><th>Another says</th></tr></thead>
            <tbody>{CONFLICTS.map((c) => <tr key={c.topic}><td><strong className="small">{c.topic}</strong></td><td className="small">{c.a}</td><td className="small">{c.b}</td></tr>)}</tbody>
          </table>
        </div>
      </section>

      <p className="tiny faint">Sources: <a className="link" href={GUIDELINES_URL} target="_blank" rel="noreferrer">26-27 Funding Department Guidelines</a> · <a className="link" href={DEADLINES_URL} target="_blank" rel="noreferrer">26-27 deadline sheet</a> · FY26 Funding Department Financial Report · USG Funding FAQ and application slides, all linked from usg.usc.edu/branches/funding.</p>
    </>
  );
}
