"use client";
import { BOARDS, RULES, type BoardId } from "@/data/rules";
import { money, requestTotal, runChecks } from "@/lib/engine";
import { useStore } from "@/lib/store";

// Plain-language names for each rule, used to group issues across applications.
const ISSUE: Record<string, string> = {
  "food-per-person": "Food over $35 per person",
  "vendor-list": "Vendor not on USG's list",
  "food-docs": "Food permit or insurance missing",
  uepa: "UEPA missing or invalid",
  late: "Late or near the deadline",
  "annual-cap": "Over the club's $8,000 yearly cap",
  "over-4k": "Event over $4,000",
  "venue-cap": "Venue and staff over $4,000",
  "quote-needed": "Price is an estimate, no quote",
  "quote-mismatch": "Quote does not match budget",
  "tshirt-vendor": "T-shirt vendor not confirmed",
  "startup-merch": "Merch outside the Startup fund",
  "open-to-all": "Not open to all students",
};

export default function Insights() {
  const { apps, clubs } = useStore();
  const sent = apps.filter((a) => a.status !== "draft");
  const decided = apps.filter((a) => a.decision);
  const awardedTotal = decided.reduce((s, a) => s + (a.decision?.amount ?? 0), 0);
  const requestedDecided = decided.reduce((s, a) => s + requestTotal(a), 0);

  const counts = new Map<string, number>();
  // Count problems on undecided requests only: after a decision the award itself changes the cap math.
  for (const a of apps.filter((x) => !x.decision)) {
    const club = clubs.find((c) => c.id === a.clubId);
    if (!club) continue;
    const seen = new Set<string>();
    for (const c of runChecks(a, club)) {
      if (c.level !== "fail" && c.level !== "warn") continue;
      const key = c.ruleId.startsWith("ineligible") ? "Item USG never funds" : ISSUE[c.ruleId] ?? c.title;
      if (seen.has(key)) continue;
      seen.add(key);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  const issues = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxIssue = Math.max(1, ...issues.map((i) => i[1]));

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Insights</span>
          <h1>Where the money goes.</h1>
          <p className="lede">A live view of requests, awards and the problems that slow applications down, from every application in Greenlight.</p>
        </div>
      </div>

      <section className="grid cols-4 stats">
        <div className="card card-pad stack-xs"><span className="small muted">Applications sent</span><span className="big-num">{sent.length}</span></div>
        <div className="card card-pad stack-xs"><span className="small muted">Decided</span><span className="big-num">{decided.length}</span></div>
        <div className="card card-pad stack-xs"><span className="small muted">Awarded</span><span className="big-num">{money(awardedTotal)}</span></div>
        <div className="card card-pad stack-xs"><span className="small muted">Share of request funded</span><span className="big-num">{requestedDecided ? Math.round((awardedTotal / requestedDecided) * 100) : 0}%</span></div>
      </section>

      <section className="grid cols-2" style={{ alignItems: "start" }}>
        <div className="card card-pad stack">
          <div className="stack-xs"><h2>What trips clubs up</h2><span className="small muted">Applications with each problem. Fixing these upstream saves reviewers the most time.</span></div>
          {issues.length === 0 ? <span className="small faint">No problems found.</span> : (
            <div className="stack-sm">
              {issues.map(([k, n]) => (
                <div key={k} className="stack-xs">
                  <div className="between small"><span>{k}</span><strong className="num">{n}</strong></div>
                  <div className="meter"><span style={{ width: `${(n / maxIssue) * 100}%` }} /></div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card card-pad stack">
          <div className="stack-xs"><h2>Boards</h2><span className="small muted">Awarded in Greenlight against each board&apos;s FY26 budget. The line marks 50%.</span></div>
          {(Object.keys(BOARDS) as BoardId[]).map((b) => {
            const aw = apps.filter((a) => a.event.board === b && a.decision).reduce((s, a) => s + (a.decision?.amount ?? 0), 0);
            const req = apps.filter((a) => a.event.board === b && a.status !== "draft").reduce((s, a) => s + requestTotal(a), 0);
            return (
              <div key={b} className="stack-xs">
                <div className="between small"><strong>{BOARDS[b].name}</strong><span className="faint num">{money(aw)} of {money(BOARDS[b].fy26Budget)}</span></div>
                <div className="meter"><span style={{ width: `${Math.min(1, aw / BOARDS[b].fy26Budget) * 100}%` }} /><i className="tick" style={{ left: "50%" }} /></div>
                <span className="tiny faint">{money(req)} requested so far</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="stack-sm">
        <h2>Clubs</h2>
        <div className="card table-wrap">
          <table className="table">
            <thead><tr><th>Club</th><th>School</th><th className="r">Received this year</th><th style={{ width: "34%" }}>Toward the $8,000 cap</th><th className="r">Events this semester</th></tr></thead>
            <tbody>
              {[...clubs].sort((a, b) => b.receivedThisYear - a.receivedThisYear).map((c) => (
                <tr key={c.id}>
                  <td><strong>{c.name}</strong></td>
                  <td className="small">{c.school}</td>
                  <td className="r">{money(c.receivedThisYear)}</td>
                  <td><div className="meter gold"><span style={{ width: `${(c.receivedThisYear / RULES.annualCap.limit) * 100}%` }} /></div></td>
                  <td className="r">{c.eventsThisSemester} of 4</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="tiny faint">Sample clubs are made up. In production these numbers come from EngageSC with USG&apos;s permission.</p>
      </section>
    </>
  );
}
