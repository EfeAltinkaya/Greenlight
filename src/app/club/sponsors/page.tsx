"use client";
import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { AlertTriangle, Building2, Check, Copy, ExternalLink, HandCoins, Handshake, MessageSquareReply, Plus, Repeat, Search, Sparkles, Store, Trash2, Users } from "lucide-react";
import { authFetch } from "@/lib/apiClient";
import { buildPackages } from "@/lib/ai-shared";
import { fmtDate, money, sponsorAsks, todayISO } from "@/lib/engine";
import { needsFrom, rankSponsors } from "@/lib/sponsorMatch";
import { learn, rerank, tally, type Tallies } from "@/lib/sponsorLearning";
import { newId, store, useCurrentClub, useStore } from "@/lib/store";
import type { Outreach, OutreachStatus, SponsorPackage } from "@/lib/types";
import { MAJORS, SCHOOL_MAJORS, SPONSORS, linkedInAlumni, linkedInRecruiters, universityPage, type Major, type Sponsor } from "@/data/sponsors";
import { AiTag, Spinner, useToast } from "@/components/ui";
import { Reveal } from "@/components/Motion";
import { SponsorInbox } from "@/components/Inbox";
import { followUpAllowed, outreachProblems } from "@/lib/outreachGuard";
import { supabase } from "@/lib/session";

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
  // Learned layer: reply counts from every club (server, counts only) or, in demo mode, from this browser.
  const [pooled, setPooled] = useState<{ tallies: Tallies; outcomes: number } | null>(null);
  useEffect(() => {
    if (!supabase) return;
    let off = false;
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) return;
      fetch("/api/learning", { headers: { authorization: `Bearer ${data.session.access_token}` } })
        .then((r) => r.json())
        .then((j) => { if (!off && j.pooled) setPooled({ tallies: j.tallies, outcomes: j.outcomes }); })
        .catch(() => {});
    });
    return () => { off = true; };
  }, [outreach]);
  const tallies = useMemo(() => pooled?.tallies ?? tally(outreach ?? [], today), [pooled, outreach, today]);
  const evidence = Object.values(tallies).reduce((n, t) => n + t.replies + t.misses, 0);
  const learned = useMemo(() => learn(pool, tallies, `${club.id}-${today}`), [pool, tallies, club.id, today]);
  const ranked = rerank(rankSponsors(pool, majors, needs), learned).filter((m) => (!tieOnly || m.sponsor.tie) && (!q || `${m.sponsor.name} ${m.sponsor.industry} ${m.sponsor.hires.join(" ")}`.toLowerCase().includes(q.toLowerCase())));
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
    otherClubsTalking(s.id, club.id).then((n) => { if (n > 0) say(`Heads up: ${n} other USC club${n === 1 ? " is" : "s are"} already talking to ${s.name}. Coordinate before you email.`, "error"); });
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

  const tab = useSyncExternalStore(
    (cb) => { window.addEventListener("popstate", cb); return () => window.removeEventListener("popstate", cb); },
    () => new URLSearchParams(window.location.search).get("tab") ?? "find",
    () => "find",
  );
  const setTab = (t: string) => {
    const u = new URL(window.location.href);
    u.searchParams.set("tab", t);
    history.replaceState(null, "", u.toString());
    window.dispatchEvent(new Event("popstate"));
  };

  return (
    <>
      {toast}
      <div className="page-head">
        <div>
          <span className="eyebrow">Cover the gap · {club.name}</span>
          <h1>Sponsors</h1>
          <p className="lede">USG won&apos;t pay some lines. Pick a path. Find companies, browse inbound offers, or advance deals. Sponsors pay vendors directly, never the club.</p>
        </div>
      </div>

      <div className="segmented" role="tablist" aria-label="Sponsor paths" style={{ alignSelf: "start" }}>
        {([["find", "Find companies"], ["outreach", "Outreach"], ["offers", "Offers"], ["deals", "Deals"]] as const).map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {tab === "offers" && (
        <section className="card card-pad stack-sm">
          <div className="row" style={{ gap: 12 }}><span className="icon-tile"><Store /></span><div className="stack-xs"><h2>Sponsor offers</h2><p className="small muted">Companies that posted what they will give and what they ask for. Request one to start a deal.</p></div></div>
          <Link href="/club/offers" className="btn btn-primary" style={{ justifySelf: "start" }}>Open sponsor offers <ExternalLink /></Link>
        </section>
      )}
      {tab === "deals" && (
        <section className="card card-pad stack-sm">
          <div className="row" style={{ gap: 12 }}><span className="icon-tile"><Handshake /></span><div className="stack-xs"><h2>Deals</h2><p className="small muted">Agreements in progress, from request through vendor payment and post-event recap.</p></div></div>
          <Link href="/club/deals" className="btn btn-primary" style={{ justifySelf: "start" }}>Open deals <ExternalLink /></Link>
        </section>
      )}

      {(tab === "find" || tab === "outreach") && (
        <>
      <section className="grid cols-4 stats">
        <div className="card card-pad stack-xs"><span className="small muted">To raise</span><span className="big-num">{money(toRaise)}</span><span className="tiny faint">From {withAsks.length} request{withAsks.length === 1 ? "" : "s"}</span></div>
        <div className="card card-pad stack-xs"><span className="small muted">Committed</span><span className="big-num" style={{ color: committed > 0 ? "var(--clear)" : undefined }}>{money(committed)}</span><div className="meter"><span style={{ width: `${toRaise ? Math.min(1, committed / toRaise) * 100 : 0}%`, background: "var(--clear)" }} /></div></div>
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
          <p className="tiny faint learn-note">Ranked by fit to your event and by how likely each company is to answer. The reply chance learns from {evidence} outreach {evidence === 1 ? "result" : "results"} so far{pooled ? " across USC clubs" : " (sample data in demo mode)"}: every reply or silence you record makes the next ranking better.</p>
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
          {shown.map(({ sponsor: s, score, reasons, parts, learned: l }) => {
            const tracked = mine.some((o) => o.sponsorId === s.id && o.appId === (target?.a.id ?? null));
            return (
              <div key={s.id} className="card card-pad stack-sm" style={{ alignContent: "start" }}>
                <div className="between" style={{ flexWrap: "nowrap", alignItems: "flex-start" }}>
                  <div className="row" style={{ gap: 12, flexWrap: "nowrap" }}><span className="icon-tile" style={{ width: 36, height: 36 }}><Building2 style={{ width: 18, height: 18 }} /></span><div className="stack-xs"><strong>{s.name}</strong><span className="tiny faint">{s.industry}</span></div></div>
                  <span className="pill num" title={parts.map((p) => `+${p.points} ${p.why}`).join(", ") || "No match signals"}>{score}</span>
                </div>
                {l && <span className="tiny learned-line" title={`Reply chance is learned from outreach results: ${l.basis}. Ranking samples from it (Thompson sampling), so companies with little history still get tried.`}><span className="learned-dot" aria-hidden="true" />Reply chance about {Math.round(l.mean * 100)}% · {l.seen ? `${l.replies} of ${l.seen} replied` : l.basis === "no results yet" ? "no results yet, being tried" : "from similar companies"}</span>}
                <span className="tiny faint">Score: {parts.length ? parts.map((p) => `+${p.points} ${p.why}`).join(" · ") : "no overlap with this event yet"}</span>
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
      )}
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

function OutreachDetail({ o, pool, say, onClose }: { o: Outreach; pool: Sponsor[]; say: (m: string, kind?: "ok" | "error") => void; onClose: () => void }) {
  const { apps, clubs } = useStore();
  const [busy, setBusy] = useState(false);
  const [extra, setExtra] = useState<{ kind: "follow-up" | "reply"; subject: string; body: string } | null>(null);
  const [theirs, setTheirs] = useState("");
  const [note, setNote] = useState("");
  const [others, setOthers] = useState(0);
  useEffect(() => { otherClubsTalking(o.sponsorId, o.clubId).then(setOthers); }, [o.sponsorId, o.clubId]);
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

  const pkgFor = () => (app ? buildPackages(sponsorAsks(app), app.event.attendance).find((p) => p.title === o.packageTitle) : undefined) ?? { title: o.packageTitle, covers: o.packageTitle, amount: o.amount, offer: ["Logo on event materials", "Thank-you in the recap"] };
  const eventFor = () => app?.event ?? { title: `${club?.name ?? "Club"} event`, type: "event", date: "", location: "USC", onCampus: true, attendance: 50, openToAll: true, ticketed: false, privateResidence: false, travel: false, international: false, food: false, description: "", board: "social" as const, boardReason: "" };
  const checks = o.email ? outreachProblems(o.email, { sponsorName: s.name, eventTitle: eventFor().title, amounts: [o.amount, pkgFor().amount], hasTie: Boolean(s.tie) }) : [];

  async function more(kind: "follow-up" | "reply") {
    setBusy(true);
    try {
      const r = await fetch("/api/outreach-email", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sponsor: s, pkg: pkgFor(), event: eventFor(), clubName: club?.name ?? "our club", contactName: o.contactName, firstSubject: o.email?.subject, ...(kind === "follow-up" ? { followUp: true } : { reply: { theirMessage: theirs, note } }) }) });
      const j = await r.json();
      if (!r.ok) return say(j.error ?? "Could not draft that", "error");
      setExtra({ kind, ...j.data });
    } finally {
      setBusy(false);
    }
  }

  async function draft() {
    setBusy(true);
    try {
      const pkg = app ? buildPackages(sponsorAsks(app), app.event.attendance).find((p) => p.title === o.packageTitle) : undefined;
      const event = app?.event ?? { title: `${club?.name ?? "Club"} event`, type: "event", date: "", location: "USC", onCampus: true, attendance: 50, openToAll: true, ticketed: false, privateResidence: false, travel: false, international: false, food: false, description: "", board: "social" as const, boardReason: "" };
      const r = await authFetch("/api/outreach-email", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sponsor: s, pkg: pkg ?? { title: o.packageTitle, covers: o.packageTitle, amount: o.amount, offer: ["Logo on event materials", "Thank-you in the recap"] }, event, clubName: club?.name ?? "our club", contactName: o.contactName }) });
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
      {others > 0 && <p className="small field-warn" role="status"><AlertTriangle />{others} other USC club{others === 1 ? " is" : "s are"} already talking to {s.name} this month. One conversation per company works better: coordinate with them, or wait.</p>}
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
              {checks.length > 0
                ? <div className="small field-warn" role="status" style={{ display: "grid", gap: 2 }}><span><AlertTriangle />Check before you send:</span>{checks.map((c) => <span key={c}>· {c}</span>)}</div>
                : <span className="tiny" style={{ color: "var(--clear)" }}>Passes the checks: names the company and event, no invented amounts or filler.</span>}
              <div className="row"><button className="btn btn-sm" onClick={copy}><Copy />Copy</button>{o.status === "shortlist" && <button className="btn btn-sm btn-primary" onClick={() => setStatus("emailed")}><Check />I sent it</button>}</div>
            </div>
          )}
          {followUpAllowed(o.status, o.followUp, today) && (
            <button className="btn btn-sm" onClick={() => more("follow-up")} disabled={busy}><Repeat />Draft a follow-up</button>
          )}
          {o.status === "replied" && (
            <div className="inset stack-xs" style={{ padding: 12 }}>
              <strong className="small">Answer their reply</strong>
              <textarea className="textarea" style={{ minHeight: 80, fontSize: 13.5 }} value={theirs} onChange={(e) => setTheirs(e.target.value)} placeholder="Paste what they wrote" aria-label="Their message" />
              <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Your answer in a few words, e.g. yes tues 3pm works, ask about their budget" aria-label="Your short answer" />
              <span className="tiny faint">Greenlight writes the full reply from your note and never adds a date, amount or promise you did not give.</span>
              <button className="btn btn-sm" style={{ justifySelf: "start" }} onClick={() => more("reply")} disabled={busy || !note.trim()}><MessageSquareReply />Write the reply</button>
            </div>
          )}
          {extra && (
            <div className="inset stack-xs" style={{ padding: 12 }}>
              <span className="tiny faint">{extra.kind === "follow-up" ? "Follow-up" : "Reply"}, ready to copy into your inbox</span>
              <input className="input" style={{ fontWeight: 600, fontSize: 13 }} value={extra.subject} onChange={(e) => setExtra({ ...extra, subject: e.target.value })} aria-label="Subject" />
              <textarea className="textarea email" style={{ minHeight: 180, fontSize: 13.5 }} value={extra.body} onChange={(e) => setExtra({ ...extra, body: e.target.value })} aria-label="Email body" />
              <div className="row"><button className="btn btn-sm" onClick={async () => { try { await navigator.clipboard.writeText(`Subject: ${extra.subject}\n\n${extra.body}`); say("Copied. Send it from your own inbox"); } catch { say("Select the text and copy it", "error"); } }}><Copy />Copy</button>{extra.kind === "follow-up" && <button className="btn btn-sm btn-primary" onClick={() => { set({ followUp: plusDays(today, 7) }); setExtra(null); say("Next check-in set for a week from now"); }}><Check />I sent it</button>}</div>
            </div>
          )}
          <SponsorInbox email={o.contactInfo} name={s.name} />
          <button className="btn btn-sm btn-ghost" style={{ color: "var(--fix)", justifySelf: "start" }} onClick={() => { store.removeOutreach(o.id); onClose(); }}><Trash2 />Remove from outreach</button>
        </div>
      </div>
    </div>
  );
}

/** How many other clubs are in an active conversation with this company (count only, never which clubs). */
async function otherClubsTalking(sponsorId: string, clubId: string): Promise<number> {
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      try {
        const r = await fetch(`/api/claims?sponsor=${encodeURIComponent(sponsorId)}`, { headers: { authorization: `Bearer ${data.session.access_token}` } });
        return ((await r.json()) as { active: number }).active ?? 0;
      } catch {
        return 0;
      }
    }
  }
  // Demo mode: every club lives in this browser, so count locally.
  return (store.get().outreach ?? []).filter((x) => x.sponsorId === sponsorId && x.clubId !== clubId && (x.status === "emailed" || x.status === "replied")).length;
}
