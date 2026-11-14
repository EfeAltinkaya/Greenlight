"use client";
import { useState } from "react";
import { buildPackages } from "@/lib/ai-shared";
import { money } from "@/lib/engine";
import { store } from "@/lib/store";
import type { Application, Club } from "@/lib/types";
import { SPONSOR_NOTE } from "@/data/sponsors";
import { Spinner, useToast } from "./ui";

export function SponsorPanel({ app, club, asks }: { app: Application; club: Club; asks: { itemId: string; label: string; amount: number; reason: string }[] }) {
  const [busy, setBusy] = useState(false);
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
      if (j.offline) say("Ranked with the offline matcher");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!plan?.email) return;
    const text = `Subject: ${plan.email.subject}\n\n${plan.email.body}`;
    try {
      await navigator.clipboard.writeText(text);
      say("Email copied. Send it from your own inbox.");
    } catch {
      say("Select the email text and copy it.");
    }
  }

  return (
    <section className="section">
      {toast}
      <div className="section-head">
        <h2>Sponsors</h2>
        <span className="label">{money(total)} for sponsors to cover</span>
      </div>
      <div className="sheet sheet-pad stack">
        <p className="small muted" style={{ margin: 0 }}>
          Sponsors pay the vendor directly or give in kind; the money never passes through the club. Campus Activities approves in-kind donations.
        </p>
        <div className="stack-sm">
          {asks.map((a) => (
            <div key={a.itemId} className="between" style={{ padding: "8px 0", borderBottom: "1px dashed var(--rule)" }}>
              <div className="stack-sm" style={{ gap: 2 }}>
                <strong>{a.label}</strong>
                <span className="small faint">{a.reason}</span>
              </div>
              <span className="money">{money(a.amount)}</span>
            </div>
          ))}
        </div>
        {!plan ? (
          <button className="btn primary" style={{ justifySelf: "start" }} onClick={find} disabled={busy || asks.length === 0}>
            {busy ? <Spinner /> : null} Find sponsors
          </button>
        ) : (
          <>
            <div className="stack-sm">
              <span className="label">Packages</span>
              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                {plan.packages.map((p) => (
                  <div key={p.title} className="sheet" style={{ padding: 14, background: "var(--sheet-2)" }}>
                    <div className="between"><strong>{p.title}</strong><span className="money">{money(p.amount)}</span></div>
                    <ul className="small muted" style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                      {p.offer.map((o) => <li key={o}>{o}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
            <div className="stack-sm">
              <span className="label">Best fits</span>
              {plan.picks.map((p, i) => (
                <div key={p.sponsorId} className="row" style={{ alignItems: "flex-start", gap: 12, padding: "8px 0", borderBottom: "1px dashed var(--rule)" }}>
                  <span className="mono small faint" style={{ width: 18 }}>{i + 1}</span>
                  <div className="stack-sm" style={{ gap: 2, flex: 1 }}>
                    <div className="between"><strong>{p.name}</strong><span className="chip">{p.packageTitle}</span></div>
                    <span className="small muted">{p.reason}</span>
                  </div>
                </div>
              ))}
              <span className="small faint">{SPONSOR_NOTE}</span>
            </div>
            {plan.email && (
              <div className="stack-sm">
                <div className="between"><span className="label">Draft to {plan.email.to}</span><div className="row"><button className="btn sm ghost" onClick={find} disabled={busy}>Redo</button><button className="btn sm" onClick={copy}>Copy email</button></div></div>
                <div className="sheet" style={{ padding: 16 }}>
                  <div className="small" style={{ marginBottom: 8 }}><span className="faint">Subject </span><strong>{plan.email.subject}</strong></div>
                  <textarea
                    id="sponsor-email"
                    className="textarea email"
                    style={{ minHeight: 220, border: 0, padding: 0 }}
                    value={plan.email.body}
                    onChange={(e) => store.patchApp(app.id, { sponsorPlan: { ...plan, email: { ...plan.email!, body: e.target.value } } })}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
