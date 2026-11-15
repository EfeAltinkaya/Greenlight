"use client";
import { useState } from "react";
import { Plus, Store } from "lucide-react";
import { MAJORS } from "@/data/sponsors";
import { fmtDate, money, todayISO } from "@/lib/engine";
import { newId, store, useStore } from "@/lib/store";
import { useSession } from "@/lib/session";
import { Reveal } from "@/components/Motion";
import { useToast } from "@/components/ui";

export default function SponsorHome() {
  const { offers, deals } = useStore();
  const session = useSession();
  const org = session.user?.org ?? "";
  const [toast, say] = useToast();
  const mine = (offers ?? []).filter((o) => !org || o.sponsorName === org);
  const [open, setOpen] = useState(mine.length === 0);
  const [f, setF] = useState({ name: org, title: "", themes: "", majors: [] as string[], start: todayISO(), end: "2027-04-30", gives: "", max: 500, asks: "Logo on event slides, Mention in the recap" });

  function post() {
    if (!f.name.trim() || !f.title.trim() || !f.gives.trim()) return say("Add your organization, a title and what you give");
    store.addOffer({ id: "of" + newId(), sponsorName: f.name.trim(), sponsorEmail: session.user?.email ?? "", title: f.title.trim(), themes: f.themes.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean), majors: f.majors, windowStart: f.start, windowEnd: f.end, gives: f.gives.trim(), maxAmount: Number(f.max) || 0, asks: f.asks.split(",").map((a) => a.trim()).filter(Boolean), createdAt: todayISO() });
    say("Offer posted. Clubs can see it now");
    setOpen(false);
    setF({ ...f, title: "", themes: "", gives: "" });
  }

  return (
    <>
      {toast}
      <div className="page-head">
        <div>
          <span className="eyebrow">Sponsor</span>
          <h1>My offers</h1>
          <p className="lede">Tell USC clubs what you want to support. Clubs whose events fit request details, Greenlight drafts a standard agreement, and you pay vendors directly.</p>
        </div>
        <button className="btn btn-primary btn-lg" onClick={() => setOpen((v) => !v)}><Plus />Post an offer</button>
      </div>

      {open && (
        <Reveal k="form">
          <section className="card card-pad stack">
            <h2>New offer</h2>
            <div className="grid cols-2">
              <label className="field"><span className="lbl">Organization</span><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} disabled={Boolean(org)} /></label>
              <label className="field"><span className="lbl">Title</span><input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Food for engineering workshops" /></label>
              <label className="field"><span className="lbl">Events from</span><input className="input" type="date" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} /></label>
              <label className="field"><span className="lbl">Events until</span><input className="input" type="date" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} /></label>
              <label className="field"><span className="lbl">Themes (comma separated)</span><input className="input" value={f.themes} onChange={(e) => setF({ ...f, themes: e.target.value })} placeholder="hackathon, robotics, career" /></label>
              <label className="field"><span className="lbl">Up to (USD)</span><input className="input" type="number" value={f.max} onChange={(e) => setF({ ...f, max: Number(e.target.value) })} /></label>
            </div>
            <label className="field"><span className="lbl">What you give</span><input className="input" value={f.gives} onChange={(e) => setF({ ...f, gives: e.target.value })} placeholder="Catered lunch, paid directly to the caterer" /></label>
            <label className="field"><span className="lbl">What you ask for in return (comma separated)</span><input className="input" value={f.asks} onChange={(e) => setF({ ...f, asks: e.target.value })} /></label>
            <div className="stack-xs"><span className="small" style={{ fontWeight: 600 }}>Students you want to reach</span>
              <div className="row" style={{ gap: 6 }}>{MAJORS.map((m) => { const on = f.majors.includes(m); return <button key={m} className="chip-btn" aria-pressed={on} style={on ? { background: "var(--cardinal)", borderColor: "var(--cardinal)", color: "#fff" } : undefined} onClick={() => setF({ ...f, majors: on ? f.majors.filter((x) => x !== m) : [...f.majors, m] })}>{m}</button>; })}</div>
            </div>
            <div className="row"><button className="btn btn-primary" onClick={post}>Post offer</button><button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button></div>
            <p className="tiny faint">Support is in kind or paid straight to the vendor; clubs never receive cash. Student contact details are shared only if students opt in.</p>
          </section>
        </Reveal>
      )}

      {mine.length === 0 ? (
        <div className="card empty"><Store /><strong>No offers yet</strong><span className="small">Post your first offer above.</span></div>
      ) : (
        <div className="grid cols-2 appear">
          {mine.map((o) => {
            const reqs = (deals ?? []).filter((d) => d.offerId === o.id);
            return (
              <div key={o.id} className="card card-pad stack-sm">
                <span className="tiny faint">{o.sponsorName}</span>
                <h3>{o.title}</h3>
                <span className="small muted">{fmtDate(o.windowStart, { month: "short", day: "numeric" })} to {fmtDate(o.windowEnd, { month: "short", day: "numeric" })} · up to {money(o.maxAmount)}</span>
                <span className="small">{o.gives}</span>
                <span className="pill" style={{ justifySelf: "start" }}>{reqs.length} club request{reqs.length === 1 ? "" : "s"}</span>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
