"use client";
import Link from "next/link";
import { announceNav } from "@/components/Motion";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Inbox } from "lucide-react";
import { BOARDS, type BoardId } from "@/data/rules";
import { fmtDate, lookupDeadline, money, requestTotal, runChecks, score, todayISO } from "@/lib/engine";
import { fixDeadline } from "@/lib/decisionGuard";
import { useStore } from "@/lib/store";
import type { Status } from "@/lib/types";
import { CountPills, StatusPill } from "@/components/ui";

const OPEN: Status[] = ["submitted", "in_review", "needs_info"];
const TABS = [
  { id: "open", label: "To review", match: (s: Status) => OPEN.includes(s) },
  { id: "done", label: "Decided", match: (s: Status) => ["approved", "partial", "denied", "post_event_due", "closed"].includes(s) },
  { id: "all", label: "All", match: (s: Status) => s !== "draft" },
] as const;

export default function Queue() {
  const { apps, clubs } = useStore();
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("open");
  const [board, setBoard] = useState<BoardId | "all">("all");
  const t = TABS.find((x) => x.id === tab)!;
  const rows = apps.filter((a) => t.match(a.status) && (board === "all" || a.event.board === board)).sort((a, b) => (a.submittedAt ?? "").localeCompare(b.submittedAt ?? ""));
  const open = apps.filter((a) => OPEN.includes(a.status));
  const clean = open.filter((a) => { const c = clubs.find((x) => x.id === a.clubId); if (!c || a.status === "needs_info") return false; const sc = score(runChecks(a, c)); return sc.fail === 0 && sc.warn === 0; });
  const awarded = (b: BoardId) => apps.filter((a) => a.event.board === b && a.decision).reduce((s, a) => s + (a.decision?.amount ?? 0), 0);
  const pending = (b: BoardId) => open.filter((a) => a.event.board === b).reduce((s, a) => s + requestTotal(a), 0);

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Funding Department</span>
          <h1>Review queue</h1>
          <p className="lede">Every application arrives checked against the 2026-27 guidelines. The AI suggests; you decide every dollar.</p>
        </div>
      </div>

      <section className="grid cols-4 stats">
        <div className="card card-pad stack-xs"><span className="small muted">Waiting for review</span><span className="big-num">{open.length}</span></div>
        <div className="card card-pad stack-xs"><span className="small muted">Requested, waiting</span><span className="big-num">{money(open.reduce((s, a) => s + requestTotal(a), 0))}</span></div>
        <div className="card card-pad stack-xs"><span className="small muted">Ready to decide</span><span className="big-num" style={{ color: "var(--clear)" }}>{clean.length}</span><span className="tiny faint">Nothing to fix or check</span></div>
        <div className="card card-pad stack-xs"><span className="small muted">Returned to clubs</span><span className="big-num">{apps.filter((a) => a.status === "needs_info").length}</span><span className="tiny faint">2 business days to fix</span></div>
      </section>

      <section className="grid cols-4">
        {(Object.keys(BOARDS) as BoardId[]).map((b) => {
          const B = BOARDS[b];
          const used = awarded(b);
          const on = board === b;
          return (
            <button key={b} className="card card-pad stack-sm" style={{ textAlign: "left", cursor: "pointer", border: 0, outline: on ? "2px solid var(--cardinal)" : undefined }} onClick={() => setBoard(on ? "all" : b)} aria-pressed={on}>
              <div className="between"><h3>{B.short}</h3><span className="tiny faint num">{money(B.fy26Budget)}</span></div>
              <div className="meter" title="The line marks 50%: past it before fall ends, the CFO may close the board until spring"><span style={{ width: `${Math.min(1, used / B.fy26Budget) * 100}%` }} /><i className="tick" style={{ left: "50%" }} /></div>
              <div className="between tiny"><span><strong className="num">{money(used)}</strong> <span className="faint">awarded</span></span><span className="faint">{money(pending(b))} waiting</span></div>
            </button>
          );
        })}
      </section>

      <section className="stack-sm">
        <div className="between">
          <div className="segmented" role="group" aria-label="Show">
            {TABS.map((x) => <button key={x.id} aria-pressed={tab === x.id} onClick={() => setTab(x.id)}>{x.label} <span className="faint">{apps.filter((a) => x.match(a.status)).length}</span></button>)}
          </div>
          {board !== "all" && <button className="btn btn-sm btn-ghost" onClick={() => setBoard("all")}>Showing {BOARDS[board].short} only · Show all</button>}
        </div>
        {rows.length === 0 ? (
          <div className="card empty"><Inbox /><strong>Nothing here</strong><span className="small">New submissions from clubs appear in this list.</span></div>
        ) : (
          <div className="card table-wrap">
            <table className="table stackable">
              <thead><tr><th>Club and event</th><th>Event date</th><th>Board</th><th className="r">Requested</th><th>Checks</th><th>On time</th><th>Status</th></tr></thead>
              <tbody>
                {rows.map((a) => {
                  const club = clubs.find((c) => c.id === a.clubId)!;
                  const sc = score(runChecks(a, club));
                  const dl = lookupDeadline(a.event.date, a.event.travel, a.submittedAt ?? undefined);
                  const onTime = dl.kind === "ok" && !dl.passed;
                  const due = fixDeadline(a, todayISO());
                  return (
                    <tr key={a.id} className="click" onClick={() => { announceNav(); router.push(`/usg/app/${a.id}`); }}>
                      <td><Link href={`/usg/app/${a.id}`} className="stack-xs"><strong>{a.event.title}</strong><span className="tiny faint">{club.name}{a.sample ? " · Sample" : ""}</span></Link></td>
                      <td data-label="Event date" className="small num" style={{ whiteSpace: "nowrap" }}>{fmtDate(a.event.date)}</td>
                      <td data-label="Board" className="small">{BOARDS[a.event.board].short}</td>
                      <td data-label="Requested" className="r">{money(requestTotal(a))}</td>
                      <td data-label="Checks"><CountPills fail={sc.fail} warn={sc.warn} /></td>
                      <td data-label="On time">{onTime ? <span className="pill pill-clear">On time</span> : <span className="pill pill-fix">Late</span>}</td>
                      <td data-label="Status"><span className="row" style={{ gap: 6 }}><StatusPill s={a.status} />{due?.overdue && <span className="pill pill-fix">Overdue since {fmtDate(due.due, { month: "short", day: "numeric" })}</span>}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="tiny faint">Board totals are FY26 budgets from USG&apos;s financial report. Awards count decisions made in Greenlight.</p>
      </section>
    </>
  );
}
