"use client";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Plus, Trash2, Wallet } from "lucide-react";
import { fmtDate, money, requestItems, requestTotal } from "@/lib/engine";
import {
  doubleCoveredLineIds,
  FUNDING_STACK_SOURCES,
  needsSection6Disclosure,
  SECTION6_OTHER_FUNDING_QUOTE,
  sourceLabel,
} from "@/lib/fundingStack";
import { newId, store, useCurrentClub, useStore } from "@/lib/store";
import type { Application, FundingStackEntry } from "@/lib/types";
import { DEAL_FLOW } from "@/lib/workflow";
import { StatusPill } from "@/components/ui";

function saveStack(app: Application, stack: FundingStackEntry[]) {
  store.patchApp(app.id, { fundingStack: stack });
}

function StackEditor({ app }: { app: Application }) {
  const stack = app.fundingStack ?? [];
  const doubled = doubleCoveredLineIds(stack);
  const section6 = needsSection6Disclosure(stack);

  const patch = (next: FundingStackEntry[]) => saveStack(app, next);

  const add = () => {
    patch([...stack, { id: newId(), source: "usg-funding", status: "planning", amount: 0, lineIds: [] }]);
  };

  const update = (id: string, part: Partial<FundingStackEntry>) => {
    patch(stack.map((e) => (e.id === id ? { ...e, ...part } : e)));
  };

  const remove = (id: string) => patch(stack.filter((e) => e.id !== id));

  const toggleLine = (entryId: string, lineId: string, on: boolean) => {
    const e = stack.find((x) => x.id === entryId);
    if (!e) return;
    const lineIds = on ? [...new Set([...e.lineIds, lineId])] : e.lineIds.filter((x) => x !== lineId);
    update(entryId, { lineIds });
  };

  return (
    <div className="stack-sm" style={{ borderTop: "1px solid var(--line-2)", paddingTop: 14 }}>
      <div className="between">
        <h3 className="small" style={{ fontWeight: 600 }}>Funding stack</h3>
        <button type="button" className="btn btn-sm" onClick={add}>
          <Plus /> Add source
        </button>
      </div>
      <p className="tiny faint">Log every source for this event and pick which budget line each one covers. Each line should have exactly one source.</p>

      {doubled.length > 0 && (
        <p className="small field-warn" role="alert">
          <AlertTriangle />
          Double coverage on {doubled.length === 1 ? "line" : "lines"}: {doubled.map((id) => app.items.find((i) => i.id === id)?.item ?? id).join(", ")}
        </p>
      )}

      {section6 && (
        <div className="inset stack-xs" style={{ padding: 12, borderColor: "var(--check)" }}>
          <span className="small field-warn" role="status">
            <AlertTriangle />
            USG Section 6: &ldquo;{SECTION6_OTHER_FUNDING_QUOTE}&rdquo;
          </span>
          <p className="small muted" style={{ margin: 0 }}>
            Tell USG about other University sources on this event and ask your board&apos;s director before combining them with USG money.
          </p>
        </div>
      )}

      {stack.length === 0 ? (
        <p className="small muted">No sources logged yet. Add USG, sponsors, dues, or other USC funding.</p>
      ) : (
        <div className="stack-sm">
          {stack.map((e) => (
            <div key={e.id} className="inset stack-sm" style={{ padding: 12 }}>
              <div className="grid" style={{ gap: 10, gridTemplateColumns: "1.4fr 1fr 1fr auto", alignItems: "end" }}>
                <label className="stack-xs">
                  <span className="tiny faint">Source</span>
                  <select className="select" value={e.source} onChange={(ev) => update(e.id, { source: ev.target.value })}>
                    {FUNDING_STACK_SOURCES.map((s) => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </label>
                <label className="stack-xs">
                  <span className="tiny faint">Status</span>
                  <select className="select" value={e.status} onChange={(ev) => update(e.id, { status: ev.target.value as FundingStackEntry["status"] })}>
                    <option value="planning">Planning</option>
                    <option value="applied">Applied</option>
                    <option value="awarded">Awarded</option>
                    <option value="declined">Declined</option>
                  </select>
                </label>
                <label className="stack-xs">
                  <span className="tiny faint">Amount</span>
                  <input className="input" type="number" min={0} step={0.01} value={e.amount || ""} onChange={(ev) => update(e.id, { amount: Number(ev.target.value) || 0 })} />
                </label>
                <button type="button" className="btn btn-sm btn-ghost" aria-label="Remove source" onClick={() => remove(e.id)}>
                  <Trash2 />
                </button>
              </div>
              <div className="stack-xs">
                <span className="tiny faint">Budget lines this source covers</span>
                <div className="row wrap" style={{ gap: 8 }}>
                  {app.items.map((item) => {
                    const on = e.lineIds.includes(item.id);
                    const conflict = on && doubled.includes(item.id);
                    return (
                      <label key={item.id} className={"row small" + (conflict ? " field-warn" : "")} style={{ gap: 6, cursor: "pointer" }}>
                        <input type="checkbox" checked={on} onChange={(ev) => toggleLine(e.id, item.id, ev.target.checked)} />
                        <span>{item.item}</span>
                        <span className="faint num">{money(item.total)}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {stack.length > 0 && (
        <ul className="small muted" style={{ margin: 0, paddingLeft: 18 }}>
          {stack.map((e) => (
            <li key={e.id}>
              {sourceLabel(e.source)} · {e.status} · {money(e.amount)}
              {e.lineIds.length > 0 ? ` · lines: ${e.lineIds.map((id) => app.items.find((i) => i.id === id)?.item ?? id).join(", ")}` : " · no lines assigned"}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Where every dollar for each event comes from and where it is in its journey to the vendor. */
export default function Money() {
  const { apps, deals } = useStore();
  const club = useCurrentClub();
  const mine = apps.filter((a) => a.clubId === club.id);
  const clubDeals = (deals ?? []).filter((d) => d.clubId === club.id);

  const rows = mine.map((a) => {
    const budget = a.items.reduce((s, i) => s + i.total, 0);
    const usg = a.decision && a.decision.outcome !== "denied" ? a.decision.amount : 0;
    const ds = clubDeals.filter((d) => d.appId === a.id && d.stage !== "declined");
    const sponsorCommitted = ds.filter((d) => ["signed", "vendor_invoiced", "paid", "event_done", "recap_sent"].includes(d.stage)).reduce((s, d) => s + d.amount, 0);
    const sponsorPaid = ds.filter((d) => ["paid", "event_done", "recap_sent"].includes(d.stage)).reduce((s, d) => s + d.amount, 0);
    const alt = (a.altRequests ?? []).filter((r) => r.status === "awarded").reduce((s, r) => s + r.amount, 0);
    const stackAwarded = (a.fundingStack ?? [])
      .filter((e) => e.status === "awarded" && e.source !== "usg-funding")
      .reduce((s, e) => s + e.amount, 0);
    const covered = usg + sponsorCommitted + alt + stackAwarded;
    return { a, budget, usg, ds, sponsorCommitted, sponsorPaid, alt, stackAwarded, covered, gap: Math.max(0, budget - covered) };
  });
  const totals = rows.reduce((t, r) => ({ budget: t.budget + r.budget, covered: t.covered + r.covered, gap: t.gap + r.gap }), { budget: 0, covered: 0, gap: 0 });

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Money</span>
          <h1>Money tracker</h1>
          <p className="lede">For each event: the full budget, what USG awarded, what sponsors committed and paid, and what is still missing. Log every funding source in the stack below. USG and sponsors pay vendors directly, so this tracks the money without the club holding it.</p>
        </div>
      </div>

      <section className="grid cols-3 stats">
        <div className="card card-pad stack-xs"><span className="small muted">Total event budgets</span><span className="big-num">{money(totals.budget)}</span></div>
        <div className="card card-pad stack-xs"><span className="small muted">Covered</span><span className="big-num" style={{ color: "var(--clear)" }}>{money(totals.covered)}</span><div className="meter"><span style={{ width: `${totals.budget ? Math.min(1, totals.covered / totals.budget) * 100 : 0}%`, background: "var(--clear)" }} /></div></div>
        <div className="card card-pad stack-xs"><span className="small muted">Still missing</span><span className="big-num" style={totals.gap ? { color: "var(--cardinal)" } : undefined}>{money(totals.gap)}</span></div>
      </section>

      {rows.length === 0 ? (
        <div className="card empty"><Wallet /><strong>No events yet</strong><Link href="/club/new" className="btn btn-primary">Start a request</Link></div>
      ) : (
        <div className="stack appear">
          {rows.map((r) => (
            <section key={r.a.id} className="card card-pad stack-sm">
              <div className="between">
                <div className="stack-xs"><h2>{r.a.event.title}</h2><span className="small muted">{r.a.event.date ? fmtDate(r.a.event.date, { weekday: "long", month: "long", day: "numeric" }) : "No date"}</span></div>
                <div className="row"><StatusPill s={r.a.status} /><Link href={`/club/app/${r.a.id}`} className="link small">Open<ArrowRight /></Link></div>
              </div>
              <div className="moneybar" aria-label="How the budget is covered">
                {r.usg > 0 && <span style={{ flex: r.usg, background: "var(--cardinal)" }} title={`USG ${money(r.usg)}`} />}
                {r.sponsorCommitted > 0 && <span style={{ flex: r.sponsorCommitted, background: "var(--gold)" }} title={`Sponsors ${money(r.sponsorCommitted)}`} />}
                {(r.alt + r.stackAwarded) > 0 && <span style={{ flex: r.alt + r.stackAwarded, background: "var(--note)" }} title={`Other sources ${money(r.alt + r.stackAwarded)}`} />}
                {r.gap > 0 && <span style={{ flex: r.gap, background: "var(--line)" }} title={`Missing ${money(r.gap)}`} />}
              </div>
              <StackEditor app={r.a} />
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Source</th><th className="r">Amount</th><th>Where it is</th><th>What happens next</th></tr></thead>
                  <tbody>
                    <tr>
                      <td><span className="dot" style={{ background: "var(--cardinal)", marginRight: 8 }} />USG Funding Department</td>
                      <td className="r">{money(r.usg || requestTotal(r.a))}{!r.usg && <span className="tiny faint"> requested</span>}</td>
                      <td className="small">{r.a.decision ? (r.a.decision.outcome === "denied" ? "Denied" : "Awarded") : r.a.status === "draft" ? "Not submitted" : "With USG"}</td>
                      <td className="small muted">{r.a.decision?.outcome === "denied" ? <Link className="link" href="/club/funding">Apply to other USC sources</Link> : r.usg ? `USG pays the vendors for ${requestItems(r.a).map((i) => i.vendor).filter(Boolean).slice(0, 2).join(" and ") || "the funded lines"}. Final invoices due 3 business days after the event.` : "Waiting for a decision."}</td>
                    </tr>
                    {r.ds.map((d) => (
                      <tr key={d.id}>
                        <td><span className="dot" style={{ background: "var(--gold)", marginRight: 8 }} />{d.sponsorName}</td>
                        <td className="r">{money(d.amount)}</td>
                        <td className="small">{DEAL_FLOW[d.stage].label}</td>
                        <td className="small"><Link className="link" href={`/club/deals/${d.id}`}>{DEAL_FLOW[d.stage].owner === "club" ? "Your turn" : "Open deal"}</Link></td>
                      </tr>
                    ))}
                    {(r.a.fundingStack ?? []).filter((e) => e.source !== "usg-funding").map((e) => (
                      <tr key={e.id}>
                        <td><span className="dot" style={{ background: "var(--note)", marginRight: 8 }} />{sourceLabel(e.source)}</td>
                        <td className="r">{money(e.amount)}</td>
                        <td className="small">{e.status}</td>
                        <td className="small"><Link className="link" href="/club/funding">Other funding</Link></td>
                      </tr>
                    ))}
                    {(r.a.altRequests ?? []).map((x) => (
                      <tr key={x.sourceId}>
                        <td><span className="dot" style={{ background: "var(--note)", marginRight: 8 }} />{x.sourceId.toUpperCase()}</td>
                        <td className="r">{money(x.amount)}</td>
                        <td className="small">{x.status}</td>
                        <td className="small"><Link className="link" href="/club/funding">Manage</Link></td>
                      </tr>
                    ))}
                    <tr><td><strong>Still missing</strong></td><td className="r"><strong>{money(r.gap)}</strong></td><td colSpan={2} className="small muted">{r.gap ? <Link className="link" href="/club/offers">Find a sponsor</Link> : "Fully covered"}</td></tr>
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}