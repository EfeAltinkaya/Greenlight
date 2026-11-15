"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, CheckCheck, ChevronRight, FileCheck2, FileX2, Pencil, RotateCcw, Send, Sparkles, X } from "lucide-react";
import { BOARDS } from "@/data/rules";
import { documentList, fmtDate, money, requestItems, requestTotal, runChecks } from "@/lib/engine";
import { store, useStore } from "@/lib/store";
import type { AiComment, Check as CheckT } from "@/lib/types";
import { BudgetTable } from "@/components/BudgetTable";
import { decisionSupport, type DecisionSupport } from "@/lib/decision";
import { AiTag, LEVEL, Spinner, StatusPill, useToast } from "@/components/ui";

const REASONS = [
  { id: "complete", label: "Complete and within the guidelines" },
  { id: "partial-ineligible", label: "Some lines are not fundable under Section 5" },
  { id: "over-4k", label: "Over $4,000: funded the core costs only (Section 3)" },
  { id: "food-cap", label: "Food above $35 per person (Section 5)" },
  { id: "late", label: "Submitted after the deadline (Section 1)" },
  { id: "missing-docs", label: "Missing required documents (Section 2)" },
  { id: "low-funds", label: "Low remaining funds due to high utilization (Section 6)" },
  { id: "other-university", label: "Already funded by another University source (Section 6)" },
];
const OPEN = ["submitted", "in_review", "needs_info"];

export default function Review() {
  const { id } = useParams<{ id: string }>();
  const { apps, clubs } = useStore();
  const app = apps.find((a) => a.id === id);
  const club = clubs.find((c) => c.id === app?.clubId);
  const checks = useMemo(() => (app && club ? runChecks(app, club) : []), [app, club]);
  const [toast, say] = useToast();
  const [aiOffline, setAiOffline] = useState<boolean | null>(null);
  const [outcome, setOutcome] = useState<"approved" | "partial" | "denied">("approved");
  const [amount, setAmount] = useState<number | null>(null);
  const [reason, setReason] = useState(REASONS[0].id);
  const [email, setEmail] = useState("");
  const [emailOffline, setEmailOffline] = useState<boolean | null>(null);
  const [drafting, setDrafting] = useState(false);
  const asked = useRef<string | null>(null);

  useEffect(() => {
    if (!app || asked.current === app.id) return;
    asked.current = app.id;
    if (app.status === "submitted") store.moveApp(app.id, "in_review", "usg", "Opened by the funding director");
    if (app.aiComments.length === 0 && OPEN.includes(app.status)) {
      fetch("/api/review", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ app, checks }) })
        .then((r) => r.json())
        .then((j: { data: { checkId: string; text: string }[]; offline?: boolean }) => {
          setAiOffline(Boolean(j.offline));
          const comments: AiComment[] = j.data.map((c, i) => {
            const ck = checks.find((x) => x.id === c.checkId);
            return { id: "c" + i, checkId: c.checkId, text: c.text, citation: ck ? `${ck.section}: "${ck.quote}"` : "", action: "pending" };
          });
          store.patchApp(app.id, { aiComments: comments });
        })
        .catch(() => setAiOffline(true));
    }
  }, [app, checks]);

  if (!app || !club) return <div className="card empty"><strong>Application not found.</strong><Link href="/usg" className="link">Back to the queue <ArrowRight /></Link></div>;

  const total = requestTotal(app);
  const fundable = requestItems(app).filter((i) => !checks.some((c) => c.itemId === i.id && c.level === "fail")).reduce((s, i) => s + i.total, 0);
  const amt = amount ?? (outcome === "denied" ? 0 : outcome === "partial" ? Math.min(fundable, 4000) : total);
  const decided = Boolean(app.decision);
  const ds = decisionSupport(app, club, apps, clubs);
  const docs = documentList(app);
  const missing = docs.filter((d) => !app.docs[d.key]);
  const loading = app.aiComments.length === 0 && OPEN.includes(app.status) && aiOffline === null;
  const handled = app.aiComments.filter((c) => c.action !== "pending").length;
  const nextApp = apps.find((a) => a.id !== app.id && OPEN.includes(a.status));

  const act = (cid: string, action: AiComment["action"], edited?: string) => store.patchApp(app.id, (a) => ({ aiComments: a.aiComments.map((c) => (c.id === cid ? { ...c, action, edited: edited ?? c.edited } : c)) }));
  const agreeAll = () => store.patchApp(app.id, (a) => ({ aiComments: a.aiComments.map((c) => (c.action === "pending" ? { ...c, action: "agree" } : c)) }));

  async function draftEmail() {
    setDrafting(true);
    try {
      const notes = app!.aiComments
        .filter((c) => c.action === "agree" || c.action === "edited")
        .map((c) => ({ c, ck: checks.find((x) => x.id === c.checkId) }))
        .filter(({ c, ck }) => c.action === "edited" || (ck && (ck.level === "fail" || ck.level === "warn")))
        .map(({ c, ck }) => (c.action === "edited" ? `${c.edited} (${ck?.section ?? "Guidelines"})` : `${ck!.title}. ${ck!.detail} (${ck!.section})`));
      const r = await fetch("/api/decision", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ app, clubName: club!.name, outcome, amount: amt, reasonLabel: REASONS.find((x) => x.id === reason)!.label, notes }) });
      const j = await r.json();
      setEmail(j.data);
      setEmailOffline(Boolean(j.offline));
    } finally {
      setDrafting(false);
    }
  }

  function send() {
    const at = new Date().toISOString().slice(0, 10);
    store.moveApp(app!.id, outcome, "usg", outcome === "denied" ? "Denied. Explanation emailed to the club." : `${outcome === "partial" ? "Partly funded" : "Approved"}: ${money(amt)}. Explanation emailed to the club.`, { decision: { outcome, amount: amt, reasonCode: reason, email, sentAt: at } });
    if (outcome !== "denied") store.patchClub(club!.id, { receivedThisYear: club!.receivedThisYear + amt, eventsThisSemester: club!.eventsThisSemester + 1 });
    say("Decision sent. The club sees it now");
  }

  function returnIncomplete() {
    store.moveApp(app!.id, "needs_info", "usg", `Returned as incomplete: ${missing.map((m) => m.label.split(" (")[0]).join("; ")}. 2 business days to fix.`);
    say("Returned to the club. The 2-business-day clock started");
  }

  return (
    <>
      {toast}
      <div className="stack-sm">
        <nav className="crumbs" aria-label="Breadcrumb"><Link href="/usg">Review queue</Link><ChevronRight /><span>{app.event.title}</span>{app.sample && <span className="sample-tag">Sample</span>}</nav>
        <div className="page-head">
          <div>
            <h1>{app.event.title}</h1>
            <span className="muted">{club.name} · {BOARDS[app.event.board].name} · {fmtDate(app.event.date, { weekday: "long", month: "long", day: "numeric" })} · {app.event.attendance} expected</span>
          </div>
          <div className="stack-xs" style={{ justifyItems: "end", textAlign: "right" }}>
            <StatusPill s={app.status} />
            <span className="big-num">{money(total)}</span>
            <span className="tiny faint">{money(8000 - club.receivedThisYear)} left of the club&apos;s $8,000</span>
          </div>
        </div>
      </div>

      <div className="split split-wide">
        <div className="stack" style={{ gap: 24 }}>
          <section className="stack-sm"><h2>Budget</h2><BudgetTable items={app.items} checks={checks} /></section>
          <section className="card card-pad stack">
            <h2>Form answers</h2>
            <dl className="kv">
              <dt>Description</dt><dd>{app.answers.description || <span className="faint">Not provided</span>}</dd>
              <dt>Mission fit</dt><dd>{app.answers.missionFit || <span className="faint">Not provided</span>}</dd>
              <dt>Other sources</dt><dd>{app.answers.otherSources || <span className="faint">Not provided</span>}</dd>
            </dl>
          </section>
          <section className="card card-pad stack-sm">
            <div className="between"><h2>Documents</h2><span className="small faint">{docs.length - missing.length} of {docs.length}</span></div>
            <div className="row small" style={{ gap: 10, flexWrap: "nowrap" }}>{app.uepa ? <FileCheck2 style={{ width: 18, color: "var(--clear)" }} /> : <FileX2 style={{ width: 18, color: "var(--fix)" }} />}UEPA <span className="code">{app.uepa || "missing"}</span></div>
            {docs.map((d) => (
              <div key={d.key} className="row small" style={{ gap: 10, flexWrap: "nowrap", alignItems: "flex-start" }}>
                {app.docs[d.key] ? <FileCheck2 style={{ width: 18, flex: "none", color: "var(--clear)" }} /> : <FileX2 style={{ width: 18, flex: "none", color: "var(--fix)" }} />}
                <span className="wrap-any">{d.label}{app.docFiles?.[d.key] ? <span className="faint"> · {app.docFiles[d.key]}</span> : null}</span>
              </div>
            ))}
          </section>
          <section className="card card-pad stack-sm">
            <h2>History</h2>
            {[...app.history].reverse().map((h, i) => (
              <div key={i} className="row" style={{ gap: 14, padding: "8px 0", borderTop: i ? "1px solid var(--line-2)" : 0, flexWrap: "nowrap", alignItems: "flex-start" }}>
                <span className="small faint num" style={{ width: 70, flex: "none" }}>{fmtDate(h.at, { month: "short", day: "numeric" })}</span>
                <span className="small">{h.note}</span>
              </div>
            ))}
          </section>
        </div>

        <aside className="sticky stack" style={{ gap: 16 }}>
          <div className="card card-pad stack-sm">
            <div className="between">
              <div className="row" style={{ gap: 8 }}><Sparkles style={{ width: 18, height: 18, color: "var(--cardinal)" }} /><h2>AI review</h2></div>
              <span className="tiny faint">{handled} of {app.aiComments.length} handled</span>
            </div>
            <p className="small muted">Suggestions only. Nothing reaches the club until you send a decision.</p>
            {aiOffline !== null && <AiTag offline={aiOffline} />}
            {loading && <div className="row small muted"><Spinner />Reading the application</div>}
            <div className="appear">{app.aiComments.map((c) => <Comment key={c.id} c={c} check={checks.find((x) => x.id === c.checkId)} locked={decided} onAct={act} />)}</div>
            {!decided && app.aiComments.some((c) => c.action === "pending") && <div><button className="btn btn-sm" onClick={agreeAll}><CheckCheck />Agree with the rest</button></div>}
          </div>

          {!decided && <SupportCard ds={ds} onUse={(v) => { setOutcome(v >= total ? "approved" : "partial"); setAmount(v); setEmail(""); }} />}
          {!decided ? (
            <div className="card card-pad stack">
              <h2>Decision</h2>
              <div className="segmented" role="radiogroup" aria-label="Outcome">
                {(["approved", "partial", "denied"] as const).map((o) => (
                  <button key={o} role="radio" aria-checked={outcome === o} onClick={() => { setOutcome(o); setAmount(null); setEmail(""); }}>
                    {o === "approved" ? "Approve" : o === "partial" ? "Fund part" : "Deny"}
                  </button>
                ))}
              </div>
              {outcome !== "denied" && (
                <label className="field"><span className="lbl">Amount awarded</span><input id="amount" className="input num" style={{ textAlign: "left", fontSize: 18, fontWeight: 600 }} type="number" min={0} max={total} value={amt} onChange={(e) => setAmount(Number(e.target.value))} />
                  {outcome === "partial" && <span className="tiny faint">Suggested: lines with no red flags, capped at $4,000 ({money(fundable)} fundable).</span>}
                </label>
              )}
              <label className="field"><span className="lbl">Reason</span>
                <select id="reason" className="select" value={reason} onChange={(e) => setReason(e.target.value)}>{REASONS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}</select>
              </label>
              <button className="btn" onClick={draftEmail} disabled={drafting}>{drafting ? <><Spinner />Writing</> : <><Sparkles />Draft the email to the club</>}</button>
              {email && (
                <>
                  {emailOffline !== null && <AiTag offline={emailOffline} />}
                  <textarea id="decision-email" className="textarea email" style={{ minHeight: 260 }} value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Decision email" />
                  <button className="btn btn-primary btn-lg" onClick={send}><Send />Send decision</button>
                </>
              )}
              {missing.length > 0 && app.status !== "needs_info" && (<><hr className="hr" /><button className="btn btn-ghost" style={{ color: "var(--fix)" }} onClick={returnIncomplete}><RotateCcw />Return as incomplete ({missing.length} missing)</button></>)}
            </div>
          ) : (
            <div className="card card-pad stack-sm" style={{ borderTop: "4px solid var(--gold)" }}>
              <span className="eyebrow">Sent {fmtDate(app.decision!.sentAt, { month: "short", day: "numeric" })}</span>
              <h2>{app.decision!.outcome === "denied" ? "Denied" : `Awarded ${money(app.decision!.amount)}`}</h2>
              <div className="email small muted">{app.decision!.email}</div>
              {nextApp ? <Link href={`/usg/app/${nextApp.id}`} className="btn btn-dark" style={{ justifySelf: "start" }}>Next in queue: {nextApp.event.title}<ArrowRight /></Link> : <Link href="/usg" className="btn" style={{ justifySelf: "start" }}>Queue is clear</Link>}
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

function Comment({ c, check, locked, onAct }: { c: AiComment; check?: CheckT; locked: boolean; onAct: (id: string, a: AiComment["action"], edited?: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(c.edited ?? c.text);
  const lvl = check?.level ?? "info";
  const { Icon, word } = LEVEL[lvl];
  return (
    <div className="check" style={{ opacity: c.action === "disagree" ? 0.5 : 1 }}>
      <span className={"check-ico " + lvl} role="img" aria-label={word}><Icon strokeWidth={2.6} /></span>
      <div className="stack-xs" style={{ gap: 8 }}>
        {check && <span className="check-title">{check.title}</span>}
        {editing ? (
          <>
            <textarea className="textarea" value={val} onChange={(e) => setVal(e.target.value)} style={{ minHeight: 80 }} aria-label="Edit comment" />
            <div className="row"><button className="btn btn-sm btn-primary" onClick={() => { onAct(c.id, "edited", val); setEditing(false); }}>Save</button><button className="btn btn-sm btn-ghost" onClick={() => setEditing(false)}>Cancel</button></div>
          </>
        ) : (
          <span className="small muted" style={{ textDecoration: c.action === "disagree" ? "line-through" : undefined }}>{c.edited ?? c.text}</span>
        )}
        {c.citation && <div className="quote">{c.citation}</div>}
        {!locked && !editing && (
          <div className="row" style={{ gap: 4 }}>
            <button className={"btn btn-sm " + (c.action === "agree" ? "" : "btn-ghost")} style={c.action === "agree" ? { color: "var(--clear)", borderColor: "var(--clear)" } : undefined} aria-pressed={c.action === "agree"} onClick={() => onAct(c.id, c.action === "agree" ? "pending" : "agree")}><Check />Agree</button>
            <button className={"btn btn-sm " + (c.action === "disagree" ? "" : "btn-ghost")} style={c.action === "disagree" ? { color: "var(--fix)", borderColor: "var(--fix)" } : undefined} aria-pressed={c.action === "disagree"} onClick={() => onAct(c.id, c.action === "disagree" ? "pending" : "disagree")}><X />Disagree</button>
            <button className="btn btn-sm btn-ghost" onClick={() => setEditing(true)}><Pencil />Edit</button>
          </div>
        )}
        {c.action === "edited" && !editing && <span className="tiny faint">Edited by you</span>}
      </div>
    </div>
  );
}

function SupportCard({ ds, onUse }: { ds: DecisionSupport; onUse: (v: number) => void }) {
  const per = Math.round(ds.costPerAttendee);
  const med = ds.boardMedianPerAttendee == null ? null : Math.round(ds.boardMedianPerAttendee);
  return (
    <div className="card card-pad stack-sm" style={{ borderTop: "4px solid var(--gold)" }}>
      <h2>Decision support</h2>
      <div className="between"><span className="small muted">Suggested range</span><strong className="num" style={{ fontSize: 20 }}>{money(ds.low)}{ds.high !== ds.low ? ` to ${money(ds.high)}` : ""}</strong></div>
      <ul className="small muted" style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 4 }}>{ds.basis.map((b) => <li key={b}>{b}</li>)}</ul>
      <div className="row"><button className="btn btn-sm" onClick={() => onUse(ds.high)}>Use {money(ds.high)}</button>{ds.low !== ds.high && <button className="btn btn-sm btn-ghost" onClick={() => onUse(ds.low)}>Use {money(ds.low)}</button>}</div>
      <hr className="hr" />
      <dl className="kv" style={{ gridTemplateColumns: "160px minmax(0,1fr)", fontSize: 13.5 }}>
        <dt>Cost per attendee</dt><dd>{money(per)}{med != null ? ` (board typical ${money(med)})` : ""}</dd>
        <dt>Club has left</dt><dd>{money(ds.clubLeft)} of $8,000</dd>
        <dt>Board after this</dt><dd style={{ color: ds.boardUsedAfter > 0.5 ? "var(--cardinal)" : undefined }}>{Math.round(ds.boardUsedAfter * 100)}% of its budget</dd>
      </dl>
      {ds.flags.length > 0 && <div className="row" style={{ gap: 6 }}>{ds.flags.map((f) => <span key={f} className="pill pill-gold" style={{ height: "auto", padding: "4px 10px", whiteSpace: "normal" }}>{f}</span>)}</div>}
      {ds.similar.length > 0 && (
        <div className="stack-xs">
          <span className="tiny faint">Similar past decisions on this board</span>
          {ds.similar.map((x) => <div key={x.title} className="between small"><span>{x.title} <span className="faint">· {x.club}</span></span><span className="num">{money(x.awarded)} of {money(x.requested)}</span></div>)}
        </div>
      )}
      <p className="tiny faint">Calculated in code from the 2026-27 rules and past decisions in Greenlight. A suggestion; you decide.</p>
    </div>
  );
}
