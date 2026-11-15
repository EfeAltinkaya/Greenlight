"use client";
import { BOARDS, RULES, type BoardId } from "@/data/rules";
import { fmtDate, money, requestTotal, runChecks, todayISO } from "@/lib/engine";
import { useStore } from "@/lib/store";
import type { Application, Status } from "@/lib/types";
import { VERDICT_FILTERS, greenlightVerdict } from "@/lib/verdict";

const DAY = 86_400_000;
const QUEUE_STAGES = ["submitted", "in_review", "needs_info"] as const satisfies readonly Status[];

function parseDay(iso: string) {
  return Date.parse(iso + "T12:00:00Z");
}

function stageDaysByStatus(app: Application, today: string): Record<(typeof QUEUE_STAGES)[number], number> {
  const totals = { submitted: 0, in_review: 0, needs_info: 0 };
  const hist = app.history;
  for (let i = 0; i < hist.length; i++) {
    const status = hist[i].status;
    if (!QUEUE_STAGES.includes(status as (typeof QUEUE_STAGES)[number])) continue;
    const start = hist[i].at;
    const end = i + 1 < hist.length ? hist[i + 1].at : app.status === status ? today : start;
    totals[status as (typeof QUEUE_STAGES)[number]] += Math.max(0, Math.floor((parseDay(end) - parseDay(start)) / DAY));
  }
  return totals;
}

function avgStageDays(apps: Application[], today: string) {
  const sums = { submitted: 0, in_review: 0, needs_info: 0 };
  const counts = { submitted: 0, in_review: 0, needs_info: 0 };
  for (const a of apps) {
    const d = stageDaysByStatus(a, today);
    for (const k of QUEUE_STAGES) {
      if (a.history.some((h) => h.status === k)) {
        sums[k] += d[k];
        counts[k]++;
      }
    }
  }
  return QUEUE_STAGES.map((k) => ({
    id: k,
    label: k === "submitted" ? "Submitted" : k === "in_review" ? "In review" : "Needs info",
    avg: counts[k] ? Math.round((sums[k] / counts[k]) * 10) / 10 : null,
    n: counts[k],
  }));
}

// Plain-language names for each rule, used to group issues across applications.
const ISSUE: Record<string, string> = {
  "food-per-person": "Food over $35 per person",
  "vendor-list": "Vendor not on USG's list",
  "food-docs": "Food permit or insurance missing",
  "food-why": "Food purpose not explained",
  "hotel-compare": "Hotel price comparison missing",
  "other-university-funding": "Other University funding flagged",
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

function forecastWeeks(budget: number, awarded: number, pending: number, decidedCount: number) {
  const remainingToHalf = budget * 0.5 - awarded;
  if (remainingToHalf <= 0) return { kind: "past50" as const };
  const avgAward = decidedCount > 0 ? awarded / decidedCount : 0;
  // Pace: assume pending clears over the next 4 review weeks, plus recent average if any.
  const weekly = Math.max(pending / 4, avgAward);
  if (weekly <= 0) return { kind: "idle" as const };
  const weeks = Math.ceil(remainingToHalf / weekly);
  return { kind: "pace" as const, weeks, weekly };
}

export default function Insights() {
  const { apps, clubs } = useStore();
  const today = todayISO();
  const sent = apps.filter((a) => a.status !== "draft");
  const decided = apps.filter((a) => a.decision);
  const open = apps.filter((a) => ["submitted", "in_review", "needs_info"].includes(a.status));
  const awardedTotal = decided.reduce((s, a) => s + (a.decision?.amount ?? 0), 0);
  const requestedDecided = decided.reduce((s, a) => s + requestTotal(a), 0);
  const pendingTotal = open.reduce((s, a) => s + requestTotal(a), 0);

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

  const verdictCounts = new Map<string, number>();
  for (const a of sent) {
    const club = clubs.find((c) => c.id === a.clubId);
    if (!club) continue;
    const v = greenlightVerdict(runChecks(a, club));
    verdictCounts.set(v.id, (verdictCounts.get(v.id) ?? 0) + 1);
  }
  const verdictRows = VERDICT_FILTERS.filter((f) => f.id !== "all").map((f) => ({
    ...f,
    n: verdictCounts.get(f.id) ?? 0,
  }));
  const maxVerdict = Math.max(1, ...verdictRows.map((r) => r.n));

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Insights</span>
          <h1>Where the money goes.</h1>
          <p className="lede">A live view of requests, awards, burn pace toward the 50% CFO line, and the problems that slow applications down.</p>
          <p className="tiny faint">Internal only. Queue timing and Greenlight Check verdicts are for USG staff, not clubs.</p>
        </div>
      </div>

      <section className="grid cols-4 stats">
        <div className="card card-pad stack-xs"><span className="small muted">Applications sent</span><span className="big-num">{sent.length}</span></div>
        <div className="card card-pad stack-xs"><span className="small muted">Decided</span><span className="big-num">{decided.length}</span></div>
        <div className="card card-pad stack-xs"><span className="small muted">Awarded</span><span className="big-num">{money(awardedTotal)}</span></div>
        <div className="card card-pad stack-xs"><span className="small muted">Waiting in queue</span><span className="big-num">{money(pendingTotal)}</span><span className="tiny faint">{open.length} open</span></div>
      </section>

      <section className="card card-pad stack">
        <div className="stack-xs">
          <h2>Board burn forecast</h2>
          <span className="small muted">Greenlight awards vs each board&apos;s FY26 budget. The tick is 50%: past it before fall ends, the CFO may close the board. Pace uses the open queue (cleared over ~4 review weeks) and average award so far.</span>
        </div>
        <div className="grid cols-2" style={{ gap: 20 }}>
          {(Object.keys(BOARDS) as BoardId[]).map((b) => {
            const B = BOARDS[b];
            const aw = apps.filter((a) => a.event.board === b && a.decision).reduce((s, a) => s + (a.decision?.amount ?? 0), 0);
            const pend = open.filter((a) => a.event.board === b).reduce((s, a) => s + requestTotal(a), 0);
            const nDec = apps.filter((a) => a.event.board === b && a.decision).length;
            const fc = forecastWeeks(B.fy26Budget, aw, pend, nDec);
            const usedPct = Math.round((aw / B.fy26Budget) * 100);
            return (
              <div key={b} className="stack-sm" style={{ padding: "12px 0", borderTop: "1px solid var(--line-2)" }}>
                <div className="between"><strong>{B.name}</strong><span className="faint num">{money(aw)} of {money(B.fy26Budget)}</span></div>
                <div className="meter"><span style={{ width: `${Math.min(1, aw / B.fy26Budget) * 100}%` }} /><i className="tick" style={{ left: "50%" }} /></div>
                <div className="between tiny">
                  <span>{usedPct}% awarded · {money(pend)} waiting</span>
                  <span className="faint">FY26 was {Math.round(B.fy26Used * 100)}% used</span>
                </div>
                <p className="small muted" style={{ margin: 0 }}>
                  {fc.kind === "past50" && "Already at or past 50% on awards in Greenlight."}
                  {fc.kind === "idle" && "No pending spend to project yet."}
                  {fc.kind === "pace" && `At this pace (~${money(fc.weekly)}/week), about ${fc.weeks} week${fc.weeks === 1 ? "" : "s"} to the 50% line.`}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card card-pad stack">
        <div className="stack-xs">
          <h2>Time in queue by board</h2>
          <span className="small muted">Average days per application in each queue stage, from status history through {fmtDate(today, { month: "short", day: "numeric" })}.</span>
        </div>
        <div className="grid cols-2" style={{ gap: 20 }}>
          {(Object.keys(BOARDS) as BoardId[]).map((b) => {
            const B = BOARDS[b];
            const boardApps = sent.filter((a) => a.event.board === b);
            const avgs = avgStageDays(boardApps, today);
            return (
              <div key={b} className="stack-sm" style={{ padding: "12px 0", borderTop: "1px solid var(--line-2)" }}>
                <strong>{B.name}</strong>
                {boardApps.length === 0 ? (
                  <span className="small faint">No applications yet.</span>
                ) : (
                  <dl className="stack-xs small" style={{ margin: 0, gap: 6 }}>
                    {avgs.map((row) => (
                      <div key={row.id} className="between" style={{ gap: 12 }}>
                        <dt className="muted" style={{ margin: 0 }}>{row.label}</dt>
                        <dd className="num" style={{ margin: 0, fontWeight: 600 }}>
                          {row.avg != null ? `${row.avg} day${row.avg === 1 ? "" : "s"} avg` : "No data"}
                          {row.n > 0 && <span className="faint" style={{ fontWeight: 500 }}> · n={row.n}</span>}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="card card-pad stack">
        <div className="stack-xs">
          <h2>Greenlight Check verdicts</h2>
          <span className="small muted">How many sent applications fall in each verdict bucket from the rules engine (not AI).</span>
        </div>
        {verdictRows.every((r) => r.n === 0) ? (
          <span className="small faint">No sent applications yet.</span>
        ) : (
          <div className="stack-sm">
            {verdictRows.map((row) => (
              <div key={row.id} className="stack-xs">
                <div className="between small"><span>{row.label}</span><strong className="num">{row.n}</strong></div>
                <div className="meter"><span style={{ width: `${(row.n / maxVerdict) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        )}
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
          <div className="stack-xs"><h2>Funding share</h2><span className="small muted">Of decided requests in Greenlight, how much of what clubs asked for was awarded.</span></div>
          <div className="big-num">{requestedDecided ? Math.round((awardedTotal / requestedDecided) * 100) : 0}%</div>
          <div className="meter gold"><span style={{ width: `${requestedDecided ? Math.min(1, awardedTotal / requestedDecided) * 100 : 0}%` }} /></div>
          <span className="tiny faint">{money(awardedTotal)} awarded of {money(requestedDecided)} requested on decided apps</span>
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
