"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Building2, HandCoins } from "lucide-react";
import { SPONSORS, SPONSOR_NOTE } from "@/data/sponsors";
import { money, sponsorAsks } from "@/lib/engine";
import { useCurrentClub, useStore } from "@/lib/store";

export default function Sponsors() {
  const { apps } = useStore();
  const club = useCurrentClub();
  const [tieOnly, setTieOnly] = useState(false);
  const withAsks = apps.filter((a) => a.clubId === club.id).map((a) => ({ a, asks: sponsorAsks(a) })).filter((x) => x.asks.length);
  const total = withAsks.reduce((s, x) => s + x.asks.reduce((t, k) => t + k.amount, 0), 0);
  const list = SPONSORS.filter((s) => !tieOnly || s.uscTie);

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Sponsors</span>
          <h1>Cover what USG won&apos;t.</h1>
          <p className="lede">Gift cards, performers and food above $35 a person are never USG-fundable. Companies that recruit Trojans often cover them in kind.</p>
        </div>
        <div className="stack-xs" style={{ textAlign: "right" }}><span className="small faint">Open asks</span><span className="big-num">{money(total)}</span></div>
      </div>

      <section className="stack-sm">
        <h2>Your open asks</h2>
        {withAsks.length === 0 ? (
          <div className="card empty"><HandCoins /><strong>No sponsor asks yet</strong><span className="small">In a request, move any line USG won&apos;t fund to sponsors.</span></div>
        ) : (
          <div className="card">
            {withAsks.map(({ a, asks }, i) => (
              <Link key={a.id} href={`/club/app/${a.id}#sponsors`} className="between" style={{ padding: "16px 20px", borderTop: i ? "1px solid var(--line-2)" : 0 }}>
                <div className="stack-xs"><strong>{a.event.title}</strong><span className="small muted">{asks.map((k) => k.label).join(" · ")}</span></div>
                <div className="row" style={{ flexWrap: "nowrap" }}><strong className="num">{money(asks.reduce((t, k) => t + k.amount, 0))}</strong><span className="pill">{a.sponsorPlan ? "Matched" : "Not matched"}</span><ArrowRight style={{ width: 18, height: 18, color: "var(--ink-3)" }} /></div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="stack-sm">
        <div className="between">
          <h2>Companies</h2>
          <div className="segmented" role="group" aria-label="Filter">
            <button aria-pressed={!tieOnly} onClick={() => setTieOnly(false)}>All {SPONSORS.length}</button>
            <button aria-pressed={tieOnly} onClick={() => setTieOnly(true)}>With a USC tie</button>
          </div>
        </div>
        <div className="grid cols-3">
          {list.map((s) => (
            <div key={s.id} className="card card-pad stack-sm">
              <div className="row" style={{ gap: 12, flexWrap: "nowrap" }}><span className="icon-tile" style={{ width: 36, height: 36 }}><Building2 style={{ width: 18, height: 18 }} /></span><div className="stack-xs"><strong>{s.name}</strong><span className="tiny faint">{s.industry}</span></div></div>
              <span className="small muted">{s.la}. Hires {s.hires.slice(0, 2).join(" and ")}.</span>
              {s.uscTie ? <span className="pill pill-gold" style={{ justifySelf: "start", whiteSpace: "normal", height: "auto", padding: "5px 10px", lineHeight: 1.3 }}>{s.uscTie}</span> : <span className="tiny faint">No USC tie on record</span>}
              <span className="tiny faint">Could cover: {s.inKind.join(", ")}</span>
            </div>
          ))}
        </div>
        <p className="tiny faint">{SPONSOR_NOTE}</p>
      </section>
    </>
  );
}
