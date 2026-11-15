"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Download, Trash2, Wallet } from "lucide-react";
import { money } from "@/lib/engine";
import {
  doubleCoveredKeys,
  exportLedgerCsv,
  ledgerSourceLabel,
  needsSection6,
  SECTION6_ADVICE,
  SECTION6_QUOTE,
  SECTION6_SECTION,
  stackByEvent,
  totalsBySource,
  usgSemesterStats,
} from "@/lib/ledger";
import { store, useCurrentClub, useStore } from "@/lib/store";

type View = "event" | "source" | "lines";

export default function LedgerPage() {
  const { ledger } = useStore();
  const club = useCurrentClub();
  const [view, setView] = useState<View>("event");

  useEffect(() => {
    if (!club.sample) store.ensureExampleLedger(club.id);
  }, [club.id, club.sample]);

  const mine = useMemo(
    () => (ledger ?? []).filter((l) => l.clubId === club.id),
    [ledger, club.id],
  );
  const stacks = stackByEvent(mine, club);
  const bySource = totalsBySource(mine, club);
  const stats = usgSemesterStats(mine, club);
  const doubled = doubleCoveredKeys(mine.filter((l) => l.status !== "declined"));
  const hasExample = mine.some((l) => l.example);

  function downloadCsv() {
    const blob = new Blob([exportLedgerCsv(mine)], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${club.name.replace(/\s+/g, "-").toLowerCase()}-ledger.csv`;
    a.click();
  }

  function printPdf() {
    window.print();
  }

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Ledger</span>
          <h1>Ledger</h1>
          <p className="lede">Every dollar for every event: what it costs, who is covering each line, what has been paid and what is still open. USG and sponsors pay vendors directly, so the club never holds the money; this is the record.</p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button type="button" className="btn" onClick={downloadCsv}><Download />CSV</button>
          <button type="button" className="btn" onClick={printPdf}><Download />Print / PDF</button>
        </div>
      </div>

      <section className="grid cols-3 stats">
        <div className="card card-pad stack-xs">
          <span className="small muted">USG this year</span>
          <span className="big-num">{money(stats.awarded)} <span className="faint" style={{ fontSize: 16 }}>/ {money(stats.cap)}</span></span>
          <div className="meter"><span style={{ width: `${Math.min(100, (stats.awarded / stats.cap) * 100)}%` }} /></div>
        </div>
        <div className="card card-pad stack-xs">
          <span className="small muted">USG events this semester</span>
          <span className="big-num">{stats.eventsUsed} <span className="faint" style={{ fontSize: 16 }}>of {stats.eventsCap}</span></span>
        </div>
        <div className="card card-pad stack-xs">
          <span className="small muted">Events on the ledger</span>
          <span className="big-num">{stacks.length}</span>
        </div>
      </section>

      {hasExample && (
        <div className="card card-pad between" style={{ borderLeft: "4px solid var(--gold)" }}>
          <div className="stack-xs">
            <strong>Example: your first event</strong>
            <span className="small muted">Walkthrough rows with $0. They do not count toward your totals. Delete when you start a real event.</span>
          </div>
          <button type="button" className="btn btn-sm" onClick={() => store.deleteExampleLedger(club.id)}><Trash2 />Delete example</button>
        </div>
      )}

      {stacks.some((s) => needsSection6(mine, s.eventId)) && (
        <div className="card card-pad stack-xs" style={{ borderLeft: "4px solid var(--check)" }} role="status">
          <div className="row" style={{ gap: 8 }}><AlertTriangle style={{ color: "var(--check)" }} /><strong>Combining USG with another University source</strong></div>
          <p className="small muted">&ldquo;{SECTION6_QUOTE}&rdquo; <span className="tiny faint">({SECTION6_SECTION})</span></p>
          <p className="small">{SECTION6_ADVICE}</p>
        </div>
      )}

      {doubled.length > 0 && (
        <div className="card card-pad stack-xs" style={{ borderLeft: "4px solid var(--fail)" }} role="alert">
          <div className="row" style={{ gap: 8 }}><AlertTriangle style={{ color: "var(--fail)" }} /><strong>Double coverage</strong></div>
          <p className="small muted">One line should have one source. These items appear under more than one source on the same event.</p>
        </div>
      )}

      <div className="segmented" role="tablist" aria-label="Ledger views" style={{ alignSelf: "start" }}>
        {([["event", "By event"], ["source", "By source"], ["lines", "All lines"]] as const).map(([id, label]) => (
          <button key={id} role="tab" aria-selected={view === id} onClick={() => setView(id)}>{label}</button>
        ))}
      </div>

      {view === "event" && (
        stacks.length === 0 ? (
          <div className="card empty"><Wallet /><strong>No ledger lines yet</strong><span className="small">Plan an event and Greenlight writes every dollar here.</span><Link href="/club/new" className="btn btn-primary">Plan an event</Link></div>
        ) : (
          <div className="stack appear">
            {stacks.map((s) => {
              const pct = (n: number) => (s.total ? Math.round((n / s.total) * 100) : 0);
              return (
                <section key={s.eventId} className="card card-pad stack-sm">
                  <div className="between">
                    <div className="stack-xs">
                      <h2>{s.title}</h2>
                      {s.sample && <span className="tiny faint">Sample</span>}
                    </div>
                    <strong className="num">{money(s.total)}</strong>
                  </div>
                  <div className="moneybar" aria-label="Coverage by source" style={{ display: "flex", height: 14, borderRadius: 99, overflow: "hidden", background: "var(--line-2)" }}>
                    {s.usg > 0 && <span style={{ width: `${pct(s.usg)}%`, background: "var(--cardinal)" }} title={`USG ${money(s.usg)}`} />}
                    {s.otherUsc > 0 && <span style={{ width: `${pct(s.otherUsc)}%`, background: "var(--gold)" }} title={`Other USC ${money(s.otherUsc)}`} />}
                    {s.sponsors > 0 && <span style={{ width: `${pct(s.sponsors)}%`, background: "var(--clear)" }} title={`Sponsors ${money(s.sponsors)}`} />}
                    {s.unfunded > 0 && <span style={{ width: `${pct(s.unfunded)}%`, background: "var(--ink-3)" }} title={`Open ${money(s.unfunded)}`} />}
                  </div>
                  <div className="row small muted" style={{ gap: 12, flexWrap: "wrap" }}>
                    <span>USG {money(s.usg)}{s.sample ? " · Sample" : ""}</span>
                    <span>Other USC {money(s.otherUsc)}</span>
                    <span>Sponsors {money(s.sponsors)}</span>
                    <span>Open {money(s.unfunded)}</span>
                  </div>
                  {needsSection6(mine, s.eventId) && (
                    <p className="tiny faint">{SECTION6_ADVICE}</p>
                  )}
                  <ul className="stack-xs" style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {mine.filter((l) => l.eventId === s.eventId).map((l) => (
                      <li key={l.id} className="between small" style={{ padding: "6px 0", borderTop: "1px solid var(--line-2)" }}>
                        <span>{l.item}{l.vendor ? ` · ${l.vendor}` : ""} · {ledgerSourceLabel(l.source)} · {l.status.replace(/_/g, " ")}</span>
                        <span className="num">{money(l.amount)}{l.sample || l.example ? <span className="tiny faint"> Sample</span> : null}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )
      )}

      {view === "source" && (
        <div className="card table-wrap">
          <table className="table">
            <thead><tr><th>Source</th><th>Group</th><th className="r">Amount</th></tr></thead>
            <tbody>
              {bySource.map((s) => (
                <tr key={s.id}>
                  <td>{s.label}</td>
                  <td className="small muted">{s.group.replace("_", " ")}</td>
                  <td className="r num">{money(s.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {view === "lines" && (
        <div className="card table-wrap">
          <table className="table stackable">
            <thead><tr><th>Event</th><th>Item</th><th>Source</th><th>Status</th><th className="r">Amount</th></tr></thead>
            <tbody>
              {mine.map((l) => (
                <tr key={l.id}>
                  <td>{l.eventTitle}</td>
                  <td>{l.item}{l.vendor ? <span className="tiny faint"> · {l.vendor}</span> : null}</td>
                  <td className="small">{ledgerSourceLabel(l.source)}</td>
                  <td className="small">{l.status.replace(/_/g, " ")}</td>
                  <td className="r num">{money(l.amount)}{(l.sample || l.example) && <span className="tiny faint"> Sample</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="tiny faint">Stacked bar: cardinal = USG, gold = other USC, green = sponsors, gray = still open. Sample amounts are demo figures, not real vendor prices.</p>
    </>
  );
}
