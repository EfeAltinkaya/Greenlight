"use client";
import { useState } from "react";
import { Copy, HandCoins, RefreshCw, Sparkles } from "lucide-react";
import { buildPackages } from "@/lib/ai-shared";
import { money } from "@/lib/engine";
import { store } from "@/lib/store";
import type { Application, Club } from "@/lib/types";
import { SPONSOR_NOTE } from "@/data/sponsors";
import { AiTag, Spinner, useToast } from "./ui";

export function SponsorPanel({ app, club, asks }: { app: Application; club: Club; asks: { itemId: string; label: string; amount: number; reason: string }[] }) {
  const [busy, setBusy] = useState(false);
  const [offline, setOffline] = useState<boolean | null>(null);
  const [toast, say] = useToast();
  const plan = app.sponsorPlan;
  const total = asks.reduce((s, a) => s + a.amount, 0);

  async function find() {
    setBusy(true);
    try {
      const packages = buildPackages(asks, app.event.attendance);
      const r = await fetch("/api/sponsors", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ app, clubName: club.name, packages }) });
      const j = await r.json();
      store.patchApp(app.id, { sponsorPlan: { packages, picks: j.data.picks, email: j.data.email } });
      setOffline(Boolean(j.offline));
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!plan?.email) return;
    try {
      await navigator.clipboard.writeText(`Subject: ${plan.email.subject}\n\n${plan.email.body}`);
      say("Email copied. Send it from your own inbox");
    } catch {
      say("Select the email text and copy it");
    }
  }

  return (
    <section className="stack">
      {toast}
      <div className="card card-pad stack" style={{ gap: 18 }}>
        <div className="between">
          <div className="stack-xs">
            <h2>Sponsors</h2>
            <p className="small muted">Sponsors pay the vendor directly or give in kind, so the money never passes through the club. Campus Activities approves in-kind donations.</p>
          </div>
          <div className="stack-xs" style={{ textAlign: "right" }}><span className="tiny faint">To cover</span><span className="big-num" style={{ fontSize: 26 }}>{money(total)}</span></div>
        </div>
        {asks.length === 0 ? (
          <p className="small muted">Nothing to cover yet. Lines you move to sponsors, and anything USG does not fund, show up here.</p>
        ) : (
          <div className="stack-sm">
            {asks.map((a) => (
              <div key={a.itemId} className="inset between" style={{ padding: "12px 14px" }}>
                <div className="row" style={{ gap: 12, flexWrap: "nowrap" }}><span className="icon-tile gold" style={{ width: 34, height: 34 }}><HandCoins style={{ width: 17, height: 17 }} /></span><div className="stack-xs"><strong className="small">{a.label}</strong><span className="tiny faint">{a.reason}</span></div></div>
                <strong className="num">{money(a.amount)}</strong>
              </div>
            ))}
          </div>
        )}
        {!plan && asks.length > 0 && (
          <div><button className="btn btn-primary btn-lg" onClick={find} disabled={busy}>{busy ? <><Spinner />Matching sponsors</> : <><Sparkles />Find sponsors</>}</button></div>
        )}
      </div>

      {plan && (
        <>
          <div className="grid cols-2">
            {plan.packages.map((p) => (
              <div key={p.title} className="card card-pad stack-sm">
                <span className="eyebrow">Package</span>
                <h3>{p.title}</h3>
                <span className="big-num" style={{ fontSize: 26 }}>{money(p.amount)}</span>
                <ul className="small muted" style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 4 }}>{p.offer.map((o) => <li key={o}>{o}</li>)}</ul>
              </div>
            ))}
          </div>
          <div className="card card-pad stack-sm">
            <div className="between"><h2>Best fits</h2>{offline !== null && <AiTag offline={offline} />}</div>
            {plan.picks.map((p, i) => (
              <div key={p.sponsorId} className="row" style={{ alignItems: "flex-start", gap: 14, padding: "14px 0", borderTop: i ? "1px solid var(--line-2)" : 0, flexWrap: "nowrap" }}>
                <span className="step-num" style={i === 0 ? { background: "var(--cardinal)", color: "#fff" } : undefined}>{i + 1}</span>
                <div className="stack-xs" style={{ flex: 1 }}>
                  <div className="between"><strong>{p.name}</strong><span className="pill">{p.packageTitle}</span></div>
                  <span className="small muted">{p.reason}</span>
                </div>
              </div>
            ))}
            <span className="tiny faint">{SPONSOR_NOTE}</span>
          </div>
          {plan.email && (
            <div className="card card-pad stack-sm">
              <div className="between">
                <div className="stack-xs"><h2>Draft email</h2><span className="small faint">To {plan.email.to}. You send it from your own inbox.</span></div>
                <div className="row"><button className="btn btn-sm btn-ghost" onClick={find} disabled={busy}>{busy ? <Spinner /> : <RefreshCw />}Redo</button><button className="btn btn-sm" onClick={copy}><Copy />Copy email</button></div>
              </div>
              <div className="inset" style={{ padding: 16 }}>
                <div className="small" style={{ marginBottom: 10 }}><span className="faint">Subject </span><strong>{plan.email.subject}</strong></div>
                <textarea id="sponsor-email" className="textarea email" style={{ minHeight: 240, border: 0, padding: 0, background: "transparent", boxShadow: "none" }} value={plan.email.body} onChange={(e) => store.patchApp(app.id, { sponsorPlan: { ...plan, email: { ...plan.email!, body: e.target.value } } })} aria-label="Email body" />
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
