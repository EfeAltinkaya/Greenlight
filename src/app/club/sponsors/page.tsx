"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Building2, Check, Copy, ExternalLink, HandCoins, Plus, Search, Sparkles, Trash2, Users } from "lucide-react";
import { buildPackages } from "@/lib/ai-shared";
import { fmtDate, money, sponsorAsks, todayISO } from "@/lib/engine";
import { needsFrom, rankSponsors } from "@/lib/sponsorMatch";
import { newId, store, useCurrentClub, useStore } from "@/lib/store";
import type { Outreach, OutreachStatus, SponsorPackage } from "@/lib/types";
import { MAJORS, SCHOOL_MAJORS, SPONSORS, linkedInAlumni, linkedInRecruiters, universityPage, type Major, type Sponsor } from "@/data/sponsors";
import { AiTag, Spinner, useToast } from "@/components/ui";
import { Reveal } from "@/components/Motion";
import { SponsorInbox } from "@/components/Inbox";

const STAGES: { id: OutreachStatus; label: string }[] = [
  { id: "shortlist", label: "To contact" },
  { id: "emailed", label: "Emailed" },
  { id: "replied", label: "Talking" },
  { id: "committed", label: "Committed" },
  { id: "declined", label: "Declined" },
];
const plusDays = (d: string, n: number) => new Date(Date.parse(d + "T12:00:00Z") + n * 86_400_000).toISOString().slice(0, 10);

export default function Sponsors() {
  const { apps, audience, customSponsors, outreach } = useStore();
  const club = useCurrentClub();
  const [toast, say] = useToast();
  const today = todayISO();

  const withAsks = apps.filter((a) => a.clubId === club.id).map((a) => ({ a, asks: sponsorAsks(a) })).filter((x) => x.asks.length);
  const [pickedApp, setPickedApp] = useState<string | null>(null);
  const target = withAsks.find((x) => x.a.id === pickedApp) ?? withAsks[0] ?? null;
  const packages: SponsorPackage[] = target ? buildPackages(target.asks, target.a.event.attendance) : [];
  const majors = (audience?.[club.id] ?? SCHOOL_MAJORS[club.school] ?? []) as Major[];
  const pool: Sponsor[] = useMemo(() => [...SPONSORS, ...(customSponsors ?? [])], [customSponsors]);
  const needs = needsFrom(packages.map((p) => p.covers));

  const [q, setQ] = useState("");
  const [tieOnly, setTieOnly] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const ranked = rankSponsors(pool, majors, needs).filter((m) => (!tieOnly || m.sponsor.tie) && (!q || `${m.sponsor.name} ${m.sponsor.industry} ${m.sponsor.hires.join(" ")}`.toLowerCase().includes(q.toLowerCase())));
  const shown = showAll ? ranked : ranked.slice(0, 9);

  const mine = (outreach ?? []).filter((o) => o.clubId === club.id);
  const toRaise = withAsks.reduce((s, x) => s + x.asks.reduce((t, k) => t + k.amount, 0), 0);
  const committed = mine.filter((o) => o.status === "committed").reduce((s, o) => s + (o.committed || o.amount), 0);
  const talking = mine.filter((o) => o.status === "emailed" || o.status === "replied").length;
  const due = mine.filter((o) => o.followUp && o.followUp <= today && (o.status === "emailed" || o.status === "replied")).length;

  function bestPackage(s: Sponsor) {
    return packages.find((p) => needsFrom([p.covers]).some((n) => s.inKind.includes(n))) ?? packages[0];
  }

  function add(s: Sponsor) {
    const pkg = bestPackage(s);
    store.addOutreach({
      id: newId(), clubId: club.id, appId: target?.a.id ?? null, sponsorId: s.id,
      packageTitle: pkg?.title ?? "General support", amount: pkg?.amount ?? 0, status: "shortlist",
      contactName: "", contactInfo: "", notes: "", committed: 0, followUp: "", updatedAt: today, email: null,
    });
    say(`${s.name} added to To contact`);
  }

  const [selected, setSelected] = useState<string | null>(null);
  const sel = mine.find((o) => o.id === selected) ?? null;
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", industry: "", hires: "", gives: "" });
  function addCompany() {
    if (!form.name.trim()) return say("Add the company name");
    const hires = form.hires.split(",").map((x) => x.trim()).filter((x): x is Major => (MAJORS as readonly string[]).includes(x));
    const gives = form.gives.split(",").map((x) => x.trim().toLowerCase()).filter((x): x is Sponsor["inKind"][number] => ["food", "swag", "prizes", "speakers", "credits", "venue", "tours", "workshops", "supplies"].includes(x));
    store.addSponsor({ id: "c-" + newId(), name: form.name.trim(), industry: form.industry.trim() || "Not set", hires, la: "Added by your club", tie: null, tieSource: null, inKind: gives, custom: true });
    setForm({ name: "", industry: "", hires: "", gives: "" });
    setAdding(false);
    say(`${form.name.trim()} added to the company list`);
  }

  return (
    <>
      {toast}
      <div className="page-head">
        <div>
          <span className="eyebrow">Sponsors · {club.name}</span>
          <h1>Sponsors</h1>
          <p className="lede">Companies ranked for your event and audience, with links to their recruiters and to USC alumni who work there. Track every conversation until the money is committed.</p>
        </div>
      </div>

      <section className="grid cols-4 stats">
        <div className="card card-pad stack-xs"><span className="small muted">To raise</span><span className="big-num">{money(toRaise)}</span><span className="tiny faint">From {withAsks.length} request{withAsks.length === 1 ? "" : "s"}</span></div>
        <div className="card card-pad stack-xs"><span className="small muted">Committed</span><span className="big-num" style={{ color: "var(--clear)" }}>{money(committed)}</span><div className="meter"><span style={{ width: `${toRaise ? Math.min(1, committed / toRaise) * 100 : 0}%`, background: "var(--clear)" }} /></div></div>
        <div className="card card-pad stack-xs"><span className="small muted">In conversation</span><span className="big-num">{talking}</span><span className="tiny faint">{mine.length} companies tracked</span></div>
        <div className="card card-pad stack-xs"><span className="small muted">Follow-ups due</span><span className="big-num" style={due ? { color: "var(--cardinal)" } : undefined}>{due}</span><span className="tiny faint">5 days after each email</span></div>
      </section>

      <section className="grid cols-2" style={{ alignItems: "stretch" }}>
        <div className="card card-pad stack-sm">
          <h2>Raising for</h2>
          {withAsks.length === 0 ? (
            <p className="small muted">No sponsor asks yet. In a request, move a line USG won&apos;t fund to sponsors, or <Link href="/club/new" className="link">start a request</Link>. You can still browse and track companies below.</p>
          ) : (
            <>
              <select className="select" value={target?.a.id} onChange={(e) => setPickedApp(e.target.value)} aria-label="Request">
                {withAsks.map(({ a, asks }) => <option key={a.id} value={a.id}>{a.event.title} · {money(asks.reduce((t, k) => t + k.amount, 0))}</option>)}
              </select>
              <div className="stack-xs">
                {target?.asks.map((k) => (
                  <div key={k.itemId} className="between small" style={{ padding: "8px 0", borderTop: "1px solid var(--line-2)" }}>
                    <span className="row" style={{ gap: 8, flexWrap: "nowrap" }}><HandCoins style={{ width: 15, height: 15, color: "var(--gold-deep)" }} />{k.label}</span><strong className="num">{money(k.amount)}</strong>
                  </div>
                ))}
              </div>
              <span className="tiny faint">Looking for companies that can give: {needs.length ? needs.join(", ") : "general support"}</span>
            </>
          )}
        </div>
        <div className="card card-pad stack-sm">
          <h2>Who comes to your events</h2>
          <p className="small muted">Companies that hire these majors rank higher. Starts from your club&apos;s school; change it to match your members.</p>
          <div className="row" style={{ gap: 6 }}>
            {MAJORS.map((m) => {
              const on = majors.includes(m);
              return (
                <button key={m} className="chip-btn" aria-pressed={on} style={on ? { background: "var(--cardinal)", borderColor: "var(--cardinal)", color: "#fff" } : undefined} onClick={() => store.setAudience(club.id, on ? majors.filter((x) => x !== m) : [...majors, m])}>
                  {on && <Check style={{ width: 13, height: 13, marginRight: 4, verticalAlign: -2 }} />}{m}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="stack-sm">
        <div className="between">
          <h2>Best matches</h2>
          <div className="row">
            <label className="card row" style={{ padding: "0 12px", gap: 8, flexWrap: "nowrap", borderRadius: 999 }}>
              <Search style={{ width: 16, height: 16, color: "var(--ink-3)" }} />
              <input className="input" style={{ border: 0, boxShadow: "none", padding: "8px 0", width: 180, background: "transparent" }} placeholder="Search companies" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search companies" />
            </label>
            <div className="segmented" role="group" aria-label="Filter">
              <button aria-pressed={!tieOnly} onClick={() => setTieOnly(false)}>All</button>
              <button aria-pressed={tieOnly} onClick={() => setTieOnly(true)}>USC tie</button>
            </div>
            <button className="btn btn-sm" onClick={() => setAdding((v) => !v)}><Plus />Add a company</button>
          </div>
        </div>

        {adding && (
          <div className="card card-pad stack-sm">
            <h3>Add a company you know</h3>
            <div className="grid cols-2">
              <label className="field"><span className="lbl">Company</span><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Trader Joe's on Figueroa" /></label>
              <label className="field"><span className="lbl">Industry</span><input className="input" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} placeholder="Grocery" /></label>
              <label className="field"><span className="lbl">Majors they hire (comma separated)</span><input className="input" value={form.hires} onChange={(e) => setForm({ ...form, hires: e.target.value })} placeholder="Business, Communication" /></label>
              <label className="field"><span className="lbl">Could give (food, swag, prizes, speakers…)</span><input className="input" value={form.gives} onChange={(e) => setForm({ ...form, gives: e.target.value })} placeholder="food, prizes" /></label>
            </div>
            <div className="row"><button className="btn btn-primary" onClick={addCompany}>Add company</button><button className="btn btn-ghost" onClick={() => setAdding(false)}>Cancel</button></div>
          </div>
        )}

        <div className="grid cols-3 appear" key={majors.join() + needs.join() + tieOnly + q}>
          {shown.map(({ sponsor: s, score, reasons }) => {
            const tracked = mine.some((o) => o.sponsorId === s.id && o.appId === (target?.a.id ?? null));
            return (
              <div key={s.id} className="card card-pad stack-sm" style={{ alignContent: "start" }}>
                <div className="between" style={{ flexWrap: "nowrap", alignItems: "flex-start" }}>
                  <div className="row" style={{ gap: 12, flexWrap: "nowrap" }}><span className="icon-tile" style={{ width: 36, height: 36 }}><Building2 style={{ width: 18, height: 18 }} /></span><div className="stack-xs"><strong>{s.name}</strong><span className="tiny faint">{s.industry}</span></div></div>
                  <span className="pill num" title="Match score from majors, what they can give, and USC ties">{score}</span>
                </div>
                <div className="row" style={{ gap: 6 }}>{reasons.map((r) => <span key={r} className="pill" style={{ height: "auto", padding: "4px 8px", whiteSpace: "normal" }}>{r}</span>)}</div>
                {s.tie && <a className="tiny wrap-any" style={{ color: "var(--gold-deep)", fontWeight: 600 }} href={s.tieSource ?? undefined} target="_blank" rel="noreferrer">{s.tie}<ExternalLink style={{ width: 11, height: 11, marginLeft: 3, verticalAlign: -1 }} /></a>}
                <span className="tiny faint">{s.la}</span>
                <div className="row" style={{ gap: 4 }}>
                  <a className="btn btn-sm btn-ghost" href={linkedInRecruiters(s.name)} target="_blank" rel="noreferrer"><Users />Recruiters</a>
                  <a className="btn btn-sm btn-ghost" href={linkedInAlumni(s.name)} target="_blank" rel="noreferrer"><Users />USC alumni</a>
                </div>
                {tracked ? <span className="pill pill-clear" style={{ justifySelf: "start" }}><Check />In your outreach</span> : <button className="btn btn-sm btn-primary" style={{ justifySelf: "start" }} onClick={() => add(s)}><Plus />Add to outreach</button>}
              </div>
            );
          })}
        </div>
        {ranked.length > 9 && <div><button className="btn btn-sm" onClick={() => setShowAll((v) => !v)}>{showAll ? "Show fewer" : `Show all ${ranked.length}`}</button></div>}
        <p className="tiny faint">LinkedIn links open a search in your own browser. Greenlight does not collect people&apos;s data; you add the contact you choose.</p>
      </section>

      <section className="stack-sm">
        <div className="between"><h2>Outreach</h2><span className="small faint">{mine.length} companies</span></div>
        {mine.length === 0 ? (
          <div className="card empty"><HandCoins /><strong>No companies yet</strong><span className="small">Add a match above to start tracking it.</span></div>
        ) : (
          <div className="pipeline">
            {STAGES.map((st) => {
              const items = mine.filter((o) => o.status === st.id);
              return (
                <div key={st.id} className="pipe-col">
                  <div className="between" style={{ padding: "0 4px" }}><strong className="small">{st.label}</strong><span className="tiny faint">{items.length}</span></div>
                  {items.map((o) => <OutreachCard key={o.id} o={o} pool={pool} active={o.id === selected} onOpen={() => setSelected(o.id === selected ? null : o.id)} />)}
                  {items.length === 0 && <div className="tiny faint" style={{ padding: "10px 4px" }}>Nothing here</div>}
                </div>
              );
            })}
          </div>
        )}
        {sel && <Reveal k={sel.id}><OutreachDetail o={sel} pool={pool} say={say} onClose={() => setSelected(null)} /></Reveal>}
      </section>
    </>
  );
}

function OutreachCard({ o, pool, active, onOpen }: { o: Outreach; pool: Sponsor[]; active: boolean; onOpen: () => void }) {
  const { apps } = useStore();
  const s = pool.find((x) => x.id === o.sponsorId);
  const app = apps.find((a) => a.id === o.appId);
  const today = todayISO();
  if (!s) return null;
  const due = o.followUp && o.followUp <= today && (o.status === "emailed" || o.status === "replied");
  return (
    <button className="card" onClick={onOpen} aria-pressed={active} style={{ padding: 14, textAlign: "left", border: 0, cursor: "pointer", outline: active ? "2px solid var(--cardinal)" : undefined, borderTop: due ? "3px solid var(--cardinal)" : undefined }}>
      <span className="stack-xs">
        <strong className="small">{s.name}</strong>
        <span className="tiny faint">{o.packageTitle} · {money(o.status === "committed" ? o.committed || o.amount : o.amount)}{app ? ` · ${app.event.title}` : ""}</span>
        {o.contactName && <span className="tiny">{o.contactName}</span>}
        {due && <span className="tiny" style={{ color: "var(--cardinal)", fontWeight: 600 }}>Follow up today</span>}
        {!due && o.followUp && <span className="tiny faint">Follow up {fmtDate(o.followUp, { month: "short", day: "numeric" })}</span>}
        {o.email && <span className="tiny faint">Email drafted</span>}
      </span>
    </button>
  );
}

function OutreachDetail({ o, pool, say, onClose }: { o: Outreach; pool: Sponsor[]; say: (m: string) => void; onClose: () => void }) {
  const { apps, clubs } = useStore();
  const [busy, setBusy] = useState(false);
  const [offline, setOffline] = useState<boolean | null>(null);
  const s = pool.find((x) => x.id === o.sponsorId);
  const app = apps.find((a) => a.id === o.appId);
  const club = clubs.find((c) => c.id === o.clubId);
  const today = todayISO();
  if (!s) return null;
  const due = o.followUp && o.followUp <= today && (o.status === "emailed" || o.status === "replied");
  const set = (p: Partial<Outreach>) => store.patchOutreach(o.id, p);

  function setStatus(status: OutreachStatus) {
    set({ status, followUp: status === "emailed" ? plusDays(today, 5) : status === "replied" ? plusDays(today, 3) : "", committed: status === "committed" && !o.committed ? o.amount : o.committed });
    say(status === "emailed" ? "Follow-up set for 5 days from now" : `Moved to ${STAGES.find((x) => x.id === status)!.label}`);
  }

  async function draft() {
    setBusy(true);
    try {
      const pkg = app ? buildPackages(sponsorAsks(app), app.event.attendance).find((p) => p.title === o.packageTitle) : undefined;
      const event = app?.event ?? { title: `${club?.name ?? "Club"} event`, type: "event", date: "", location: "USC", onCampus: true, attendance: 50, openToAll: true, ticketed: false, privateResidence: false, travel: false, international: false, food: false, description: "", board: "social" as const, boardReason: "" };
      const r = await fetch("/api/outreach-email", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sponsor: s, pkg: pkg ?? { title: o.packageTitle, covers: o.packageTitle, amount: o.amount, offer: ["Logo on event materials", "Thank-you in the recap"] }, event, clubName: club?.name ?? "our club", contactName: o.contactName }) });
      const j = await r.json();
      if (!r.ok) return say(j.error ?? "Could not draft the email");
      set({ email: j.data });
      setOffline(Boolean(j.offline));
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!o.email) return;
    try {
      await navigator.clipboard.writeText(`Subject: ${o.email.subject}\n\n${o.email.body}`);
      say("Email copied. Send it from your own inbox");
    } catch {
      say("Select the email text and copy it");
    }
  }

  return (
    <div className="card card-pad stack" style={{ gap: 18 }}>
      <div className="between">
        <div className="stack-xs"><h2>{s.name}</h2><span className="small muted">{o.packageTitle} · {money(o.amount)}{app ? ` · ${app.event.title}` : ""}</span></div>
        <button className="btn btn-sm btn-ghost" onClick={onClose}>Close</button>
      </div>
      {due && <div className="pill pill-cardinal" style={{ justifySelf: "start" }}>Follow-up due today</div>}
      <div className="grid cols-2" style={{ alignItems: "start", gap: 24 }}>
        <div className="stack-sm">
          <label className="field"><span className="lbl">Stage</span>
            <select className="select" value={o.status} onChange={(e) => setStatus(e.target.value as OutreachStatus)}>{STAGES.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select>
          </label>
          <label className="field"><span className="lbl">Contact name</span><input className="input" value={o.contactName} onChange={(e) => set({ contactName: e.target.value })} placeholder="From your LinkedIn search" /></label>
          <label className="field"><span className="lbl">Email or LinkedIn</span><input className="input" value={o.contactInfo} onChange={(e) => set({ contactInfo: e.target.value })} placeholder="name@company.com" /></label>
          <div className="row" style={{ gap: 4 }}>
            <a className="btn btn-sm btn-ghost" href={linkedInRecruiters(s.name)} target="_blank" rel="noreferrer"><Users />Recruiters</a>
            <a className="btn btn-sm btn-ghost" href={linkedInAlumni(s.name)} target="_blank" rel="noreferrer"><Users />USC alumni</a>
            <a className="btn btn-sm btn-ghost" href={universityPage(s.name)} target="_blank" rel="noreferrer"><ExternalLink />Recruiting page</a>
          </div>
          {o.status === "committed" && <label className="field"><span className="lbl">Committed amount</span><input className="input num" style={{ textAlign: "left" }} type="number" min={0} value={o.committed} onChange={(e) => set({ committed: Number(e.target.value) })} /></label>}
          <label className="field"><span className="lbl">Follow up on</span><input className="input" type="date" value={o.followUp} onChange={(e) => set({ followUp: e.target.value })} /></label>
          <label className="field"><span className="lbl">Notes</span><textarea className="textarea" style={{ minHeight: 60 }} value={o.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="What they said, who referred you" /></label>
        </div>
        <div className="stack-sm">
          <div className="between">
            <button className="btn btn-sm" onClick={draft} disabled={busy}>{busy ? <><Spinner />Writing</> : <><Sparkles />{o.email ? "Redraft email" : "Draft email"}</>}</button>
            {offline !== null && <AiTag offline={offline} />}
          </div>
          {o.email && (
            <div className="inset stack-xs" style={{ padding: 12 }}>
              <input className="input" style={{ fontWeight: 600, fontSize: 13 }} value={o.email.subject} onChange={(e) => set({ email: { ...o.email!, subject: e.target.value } })} aria-label="Subject" />
              <textarea className="textarea email" style={{ minHeight: 280, fontSize: 13.5 }} value={o.email.body} onChange={(e) => set({ email: { ...o.email!, body: e.target.value } })} aria-label="Email body" />
              <div className="row"><button className="btn btn-sm" onClick={copy}><Copy />Copy</button>{o.status === "shortlist" && <button className="btn btn-sm btn-primary" onClick={() => setStatus("emailed")}><Check />I sent it</button>}</div>
            </div>
          )}
          <SponsorInbox email={o.contactInfo} name={s.name} />
          <button className="btn btn-sm btn-ghost" style={{ color: "var(--fix)", justifySelf: "start" }} onClick={() => { store.removeOutreach(o.id); onClose(); }}><Trash2 />Remove from outreach</button>
        </div>
      </div>
    </div>
  );
}
