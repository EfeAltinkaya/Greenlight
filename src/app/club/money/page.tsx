"use client";
import Link from "next/link";
import { ArrowRight, Wallet } from "lucide-react";
import { fmtDate, money, requestItems, requestTotal } from "@/lib/engine";
import { useCurrentClub, useStore } from "@/lib/store";
import { DEAL_FLOW } from "@/lib/workflow";
import { StatusPill } from "@/components/ui";

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
    const covered = usg + sponsorCommitted + alt;
    return { a, budget, usg, ds, sponsorCommitted, sponsorPaid, alt, covered, gap: Math.max(0, budget - covered) };
  });
  const totals = rows.reduce((t, r) => ({ budget: t.budget + r.budget, covered: t.covered + r.covered, gap: t.gap + r.gap }), { budget: 0, covered: 0, gap: 0 });

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Money</span>
          <h1>Money tracker</h1>
          <p className="lede">For each event: the full budget, what USG awarded, what sponsors committed and paid, and what is still missing. USG and sponsors pay vendors directly, so this tracks the money without the club holding it.</p>
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
                {r.alt > 0 && <span style={{ flex: r.alt, background: "var(--note)" }} title={`Other USC sources ${money(r.alt)}`} />}
                {r.gap > 0 && <span style={{ flex: r.gap, background: "var(--line)" }} title={`Missing ${money(r.gap)}`} />}
              </div>
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
