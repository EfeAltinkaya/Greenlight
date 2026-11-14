"use client";
import Link from "next/link";
import { useState } from "react";
import { BOARDS, type BoardId } from "@/data/rules";
import { fmtDate, lookupDeadline, money, requestTotal, runChecks, score } from "@/lib/engine";
import { store, useStore } from "@/lib/store";
import type { Status } from "@/lib/types";
import { StatusChip } from "@/components/ui";

const OPEN: Status[] = ["submitted", "in_review", "needs_info"];
const TABS = [
  { id: "open", label: "To review", match: (s: Status) => OPEN.includes(s) },
  { id: "done", label: "Decided", match: (s: Status) => ["approved", "partial", "denied", "post_event_due", "closed"].includes(s) },
  { id: "all", label: "All", match: (s: Status) => s !== "draft" },
] as const;

export default function UsgQueue() {
  const { apps, clubs } = useStore();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("open");
  const [board, setBoard] = useState<BoardId | "all">("all");
  const t = TABS.find((x) => x.id === tab)!;
  const rows = apps
    .filter((a) => t.match(a.status) && (board === "all" || a.event.board === board))
    .sort((a, b) => (a.submittedAt ?? "").localeCompare(b.submittedAt ?? ""));

  const awarded = (b: BoardId) => apps.filter((a) => a.event.board === b && a.decision).reduce((s, a) => s + (a.decision?.amount ?? 0), 0);
  const pending = (b: BoardId) => apps.filter((a) => a.event.board === b && OPEN.includes(a.status)).reduce((s, a) => s + requestTotal(a), 0);

  return (
    <main className="page stack" style={{ gap: 28 }}>
      <section className="between" style={{ alignItems: "flex-end" }}>
        <div className="stack-sm">
          <span className="label">Funding Department</span>
          <h1>Review queue</h1>
          <p className="muted" style={{ margin: 0, maxWidth: 620 }}>Every application arrives checked against the 2026-27 guidelines. The AI suggests; you decide every dollar.</p>
        </div>
        <button className="btn ghost sm" onClick={() => { store.reset(); }}>Reset demo data</button>
      </section>

      <section aria-label="Board money" style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))" }}>
        {(Object.keys(BOARDS) as BoardId[]).map((b) => {
          const B = BOARDS[b];
          const used = awarded(b);
          const pct = Math.min(1, used / B.fy26Budget);
          return (
            <button key={b} className="sheet sheet-pad stack-sm" style={{ textAlign: "left", cursor: "pointer", font: "inherit", color: "inherit", borderColor: board === b ? "var(--ink)" : undefined }} onClick={() => setBoard(board === b ? "all" : b)} aria-pressed={board === b}>
              <div className="between"><strong>{B.short}</strong><span className="mono small faint">{money(B.fy26Budget)}</span></div>
              <div className="bar" title="The line marks 50%: past it before fall ends, the CFO may close the board until spring"><span style={{ width: `${pct * 100}%` }} /><i className="half" /></div>
              <div className="between small">
                <span><span className="money">{money(used)}</span> <span className="faint">awarded here</span></span>
                <span className="faint">{money(pending(b))} waiting</span>
              </div>
            </button>
          );
        })}
      </section>
      <p className="small faint" style={{ marginTop: -18 }}>Board totals are the FY26 budgets from USG&apos;s financial report. Awards count only decisions made in Greenlight.</p>

      <section className="stack-sm">
        <div className="between">
          <div className="roles" style={{ marginLeft: 0 }} role="tablist">
            {TABS.map((x) => (
              <a key={x.id} href="#" role="tab" aria-selected={tab === x.id} aria-current={tab === x.id ? "page" : undefined} onClick={(e) => { e.preventDefault(); setTab(x.id); }}>
                {x.label} <span className="mono" style={{ opacity: 0.7 }}>{apps.filter((a) => x.match(a.status)).length}</span>
              </a>
            ))}
          </div>
          {board !== "all" && <button className="btn sm ghost" onClick={() => setBoard("all")}>Showing {BOARDS[board].short} only. Show all</button>}
        </div>
        {rows.length === 0 ? (
          <div className="empty">Nothing here. New submissions from clubs appear in this list.</div>
        ) : (
          <div className="sheet tablewrap">
            <table className="ledger">
              <thead>
                <tr><th>Club and event</th><th>Event date</th><th>Board</th><th className="num">Requested</th><th>Checks</th><th>On time</th><th>Status</th><th /></tr>
              </thead>
              <tbody>
                {rows.map((a) => {
                  const club = clubs.find((c) => c.id === a.clubId)!;
                  const sc = score(runChecks(a, club, a.submittedAt ?? undefined));
                  const dl = lookupDeadline(a.event.date, a.event.travel, a.submittedAt ?? undefined);
                  const onTime = dl.kind === "ok" && !dl.passed;
                  return (
                    <tr key={a.id}>
                      <td><strong>{a.event.title}</strong> {a.sample && <span className="sample">Sample</span>}<div className="small faint">{club.name}</div></td>
                      <td className="mono small">{fmtDate(a.event.date)}</td>
                      <td className="small">{BOARDS[a.event.board].short}</td>
                      <td className="num">{money(requestTotal(a))}</td>
                      <td>
                        <span className="row" style={{ gap: 6, flexWrap: "nowrap" }}>
                          {sc.fail > 0 && <span className="chip fail">{sc.fail} fix</span>}
                          {sc.warn > 0 && <span className="chip warn">{sc.warn} check</span>}
                          {sc.fail === 0 && sc.warn === 0 && <span className="chip pass">Clear</span>}
                        </span>
                      </td>
                      <td className="small">{onTime ? <span className="chip pass">Yes</span> : <span className="chip fail">Late</span>}</td>
                      <td><StatusChip s={a.status} /></td>
                      <td style={{ textAlign: "right" }}><Link className="btn sm" href={`/usg/app/${a.id}`}>Review</Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
