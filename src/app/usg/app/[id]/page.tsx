"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowRight, Check, CheckCheck, ChevronRight, FileCheck2, FileX2, Pencil, RotateCcw, Send, Sparkles, X } from "lucide-react";
import { BOARDS } from "@/data/rules";
import { documentList, fmtDate, money, requestItems, requestTotal, runChecks } from "@/lib/engine";
import { store, useStore } from "@/lib/store";
import type { AiComment, Check as CheckT } from "@/lib/types";
import { BudgetTable } from "@/components/BudgetTable";
import { decisionSupport, type DecisionSupport } from "@/lib/decision";
import { REASONS, awardError, decisionFacts, defaultOutcome, emailProblems, excludedLines, fixDeadline, suggestedAmount, type Outcome, type ReasonId } from "@/lib/decisionGuard";
import { checkKey, todayISO } from "@/lib/engine";
import { AiTag, LEVEL, Spinner, StatusPill, useToast } from "@/components/ui";

const OPEN = ["submitted", "in_review", "needs_info"];

export default function Review() {
  const { id } = useParams<{ id: string }>();
  const { apps, clubs } = useStore();
  const app = apps.find((a) => a.id === id);
  const club = clubs.find((c) => c.id === app?.clubId);
  const checks = useMemo(() => (app && club ? runChecks(app, club) : []), [app, club]);
  const [toast, say] = useToast();
  const [aiOffline, setAiOffline] = useState<boolean | null>(null);
  const [pickedOutcome, setOutcome] = useState<Outcome | null>(null);
  const [amount, setAmount] = useState<number | null>(null);
  const [pickedReason, setReason] = useState<ReasonId | null>(null);
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
  const due = fixDeadline(app, todayISO());
  const excluded = excludedLines(app, checks);
  const fixes = checks.filter((c) => c.level === "fail");
  const outcome: Outcome = pickedOutcome ?? (due?.overdue ? "denied" : defaultOutcome(checks));
  const reason: ReasonId = pickedReason ?? (due?.overdue ? "not-fixed" : excluded.length ? "partial-ineligible" : fixes.length ? "missing-docs" : "complete");
  const fundable = total - excluded.reduce((s, x) => s + x.total, 0);
  // Fund part on a request where every line passes: no suggestion, the reviewer types the amount.
  const askAmount = outcome === "partial" && excluded.length === 0 && amount === null;
  const amt = amount ?? (askAmount ? 0 : suggestedAmount(app, club, checks, outcome));
  const amtError = askAmount ? null : awardError(outcome, amt, app, club, checks);
  const blocked = Boolean(amtError) || askAmount;
  const facts = (notes: string[]) => decisionFacts(app, club, checks, outcome, amt, reason, notes);
  const emailIssues = email ? emailProblems(email, facts([])) : [];
  const fastLane = OPEN.includes(app.status) && app.status !== "needs_info" && checks.every((c) => c.level !== "fail" && c.level !== "warn") && !awardError("approved", total, app, club, checks);
  const decided = Boolean(app.decision);
  const ds = decisionSupport(app, club, apps, clubs);
  const docs = documentList(app);
  const missing = docs.filter((d) => !app.docs[d.key]);
  const loading = app.aiComments.length === 0 && OPEN.includes(app.status) && aiOffline === null;
  const handled = app.aiComments.filter((c) => c.action !== "pending").length;
  const nextApp = apps.find((a) => a.id !== app.id && OPEN.includes(a.status));

  const act = (cid: string, action: AiComment["action"], edited?: string) => store.patchApp(app.id, (a) => ({ aiComments: a.aiComments.map((c) => (c.id === cid ? { ...c, action, edited: edited ?? c.edited } : c)) }));
  const agreeAll = () => store.patchApp(app.id, (a) => ({ aiComments: a.aiComments.map((c) => (c.action === "pending" ? { ...c, action: "agree" } : c)) }));

  async function draftEmail(over?: { outcome: Outcome; amount: number; reason: ReasonId }) {
    setDrafting(true);
    try {
      const notes = app!.aiComments
        .filter((c) => c.action === "agree" || c.action === "edited")
        .map((c) => ({ c, ck: checks.find((x) => x.id === c.checkId) }))
        .filter(({ c, ck }) => c.action === "edited" || (ck && (ck.level === "fail" || ck.level === "warn")))
        .map(({ c, ck }) => (c.action === "edited" ? `${c.edited} (${ck?.section ?? "Guidelines"})` : `${ck!.title}. ${ck!.detail} (${ck!.section})`));
      const r = await fetch("/api/decision", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(over ? decisionFacts(app!, club!, checks, over.outcome, over.amount, over.reason, notes) : facts(notes)) });
      const j = await r.json();
      setEmail(j.data);
      setEmailOffline(Boolean(j.offline));
    } finally {
      setDrafting(false);
    }
  }

  function send() {
    const at = new Date().toISOString().slice(0, 10);
    store.moveApp(app!.id, outcome, "usg", outcome === "denied" ? "Denied. Explanation emailed to the club." : `${outcome === "partial" ? "Partly funded" : "Approved"}: ${money(amt)}. Explanation emailed to the club.`, { decision: { outcome, amount: outcome === "denied" ? 0 : amt, reasonCode: reason, email, sentAt: at } });
    if (outcome !== "denied") store.patchClub(club!.id, { receivedThisYear: club!.receivedThisYear + amt, eventsThisSemester: club!.eventsThisSemester + 1 });
    say("Decision sent. The club sees it now");
  }

  function sendBack(items: { text: string; checkId?: string }[], note: string) {
    const list = items.map((x, i) => `${i + 1}. ${x.text}`).join("; ") + ".";
    store.moveApp(app!.id, "needs_info", "usg", `Sent back to fix: ${list}${note ? ` Note: ${note}` : ""} 2 business days to fix.`, { fixRequest: { at: todayISO(), items, note } });
    say("Sent back to the club with the fix list. The 2-business-day clock started");
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

      {due && (
        <div className={"card card-pad row small"} style={{ gap: 10, flexWrap: "nowrap", borderLeft: "4px solid " + (due.overdue ? "var(--fix)" : "var(--check)") }} role="status">
          <AlertTriangle style={{ width: 18, flex: "none", color: due.overdue ? "var(--fix)" : "var(--check)" }} />
          <span>{due.overdue
            ? <><strong>Overdue since {fmtDate(due.due, { month: "short", day: "numeric" })}.</strong> Returned {fmtDate(due.returned, { month: "short", day: "numeric" })} with 2 business days to fix, and nothing came back. The decision below starts on Deny for that reason.</>
            : <>Returned {fmtDate(due.returned, { month: "short", day: "numeric" })}. The club has until {fmtDate(due.due, { weekday: "short", month: "short", day: "numeric" })} to send the missing items.</>}</span>
        </div>
      )}

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
          {!decided && <SupportCard ds={ds} onUse={(v) => { setOutcome(v >= total && excluded.length === 0 ? "approved" : "partial"); setAmount(v); setEmail(""); }} />}
          {!decided ? (
            <div className="card card-pad stack">
              <h2>Decision</h2>
              {fastLane && !email && (
                <div className="inset stack-xs" style={{ padding: 12, borderLeft: "4px solid var(--clear)" }}>
                  <strong className="small">Fast lane: every rule passes</strong>
                  <span className="tiny faint">Nothing to fix or check, so the full {money(total)} is within the guidelines and the club&apos;s cap. You still read the email and press Send.</span>
                  <button className="btn btn-primary" style={{ justifySelf: "start" }} disabled={drafting} onClick={() => { setOutcome("approved"); setAmount(null); setReason("complete"); void draftEmail({ outcome: "approved", amount: total, reason: "complete" }); }}>{drafting ? <><Spinner />Writing</> : <><CheckCheck />Fund in full and draft the email</>}</button>
                </div>
              )}
              <div className="segmented" role="radiogroup" aria-label="Outcome">
                {(["approved", "partial", "denied"] as const).map((o) => (
                  <button key={o} role="radio" aria-checked={outcome === o} onClick={() => { setOutcome(o); setAmount(null); setEmail(""); }}>
                    {o === "approved" ? "Approve" : o === "partial" ? "Fund part" : "Deny"}
                  </button>
                ))}
              </div>
              {outcome !== "denied" && (
                <label className="field"><span className="lbl">Amount awarded</span><input id="amount" className="input num" style={{ textAlign: "left", fontSize: 18, fontWeight: 600 }} type="number" min={0} max={total} value={askAmount ? "" : amt} placeholder="Amount to fund" aria-invalid={Boolean(amtError)} aria-describedby="amount-msg" onChange={(e) => { setAmount(Number(e.target.value)); setEmail(""); }} />
                  {amtError
                    ? <span id="amount-msg" className="small field-error" role="alert"><AlertTriangle />{amtError}</span>
                    : <span id="amount-msg" className="tiny faint">{askAmount ? `Every line passes the rules. Enter the part of the ${money(total)} you will fund.` : outcome === "partial" ? `Suggested: every line that passes the rules (${money(fundable)}), within the club's yearly cap.` : `The full request, ${money(total)}.`}</span>}
                </label>
              )}
              <label className="field"><span className="lbl">Reason</span>
                <select id="reason" className="select" value={reason} onChange={(e) => { setReason(e.target.value as ReasonId); setEmail(""); }}>{REASONS.map((r) => <option key={r.id} value={r.id}>{r.label}{r.section ? ` (${r.section})` : ""}</option>)}</select>
              </label>
              {outcome === "approved" && fixes.length > 0 && !amtError && <p className="small field-warn" role="status"><AlertTriangle />{fixes.length} rule {fixes.length === 1 ? "problem is" : "problems are"} still open. Approving in full ignores them.</p>}
              {reason === "complete" && (excluded.length > 0 || outcome !== "approved") && <p className="small field-warn" role="status"><AlertTriangle />&ldquo;Complete and within the guidelines&rdquo; does not match this decision. Pick the reason that does.</p>}
              <button className="btn" onClick={() => draftEmail()} disabled={drafting || blocked}>{drafting ? <><Spinner />Writing</> : <><Sparkles />Draft the email to the club</>}</button>
              {email && (
                <>
                  {emailOffline !== null && <AiTag offline={emailOffline} />}
                  <textarea id="decision-email" className="textarea email" style={{ minHeight: 260 }} value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Decision email" />
                  {emailIssues.length > 0 && <div className="small field-error" role="alert" style={{ display: "grid", gap: 4 }}><span><AlertTriangle />The email doesn&apos;t match the decision:</span>{emailIssues.map((x) => <span key={x}>· {x}</span>)}</div>}
                  <button className="btn btn-primary btn-lg" onClick={send} disabled={blocked || emailIssues.length > 0 || (reason === "complete" && (excluded.length > 0 || outcome !== "approved"))}><Send />Send decision</button>
                </>
              )}
              {app.status !== "needs_info" && (fixes.length > 0 || missing.length > 0) && <><hr className="hr" /><SendBack checks={fixes} missing={missing.map((m) => m.label.split(" (")[0])} onSend={sendBack} /></>}
            </div>
          ) : (
            <div className="card card-pad stack-sm" style={{ borderTop: "4px solid var(--gold)" }}>
              <span className="eyebrow">Sent {fmtDate(app.decision!.sentAt, { month: "short", day: "numeric" })}</span>
              <h2>{app.decision!.outcome === "denied" ? "Denied" : `Awarded ${money(app.decision!.amount)}`}</h2>
              <div className="email small muted">{app.decision!.email}</div>
              {nextApp ? <Link href={`/usg/app/${nextApp.id}`} className="btn btn-dark" style={{ justifySelf: "start" }}>Next in queue: {nextApp.event.title}<ArrowRight /></Link> : <Link href="/usg" className="btn" style={{ justifySelf: "start" }}>Queue is clear</Link>}
            </div>
          )}
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

/**
 * USG's real practice (from a Funding Department officer): when one thing is wrong, they don't deny the
 * application; they email the club to fix it. This turns that email into a numbered list the club sees
 * on its request, with each item linked to the field to fix.
 */
function SendBack({ checks, missing, onSend }: { checks: CheckT[]; missing: string[]; onSend: (items: { text: string; checkId?: string }[], note: string) => void }) {
  const options = [
    ...checks.map((c) => ({ key: c.id, text: c.title, checkId: checkKey(c) })),
    ...missing.map((m) => ({ key: "doc-" + m, text: `Attach: ${m}`, checkId: undefined })),
  ];
  const [picked, setPicked] = useState<Set<string>>(() => new Set(options.map((o) => o.key)));
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(false);
  const chosen = options.filter((o) => picked.has(o.key));
  if (!open)
    return <button className="btn btn-ghost" style={{ color: "var(--fix)", justifySelf: "start" }} onClick={() => setOpen(true)}><RotateCcw />Send back to fix instead ({options.length})</button>;
  return (
    <div className="stack-sm">
      <strong className="small">Send back to fix</strong>
      <span className="tiny faint">The club gets this list by email and on its request, fixes each item, and resubmits. Nothing is denied.</span>
      {options.map((o) => (
        <label key={o.key} className="row small" style={{ gap: 8, flexWrap: "nowrap", alignItems: "flex-start", cursor: "pointer" }}>
          <input type="checkbox" className="check-input" checked={picked.has(o.key)} onChange={(e) => { const n = new Set(picked); if (e.target.checked) n.add(o.key); else n.delete(o.key); setPicked(n); }} />
          <span>{o.text}</span>
        </label>
      ))}
      <textarea className="textarea" style={{ minHeight: 60 }} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note to the club" aria-label="Note to the club" />
      <div className="row">
        <button className="btn btn-primary" disabled={!chosen.length} onClick={() => onSend(chosen.map(({ text, checkId }) => ({ text, checkId })), note.trim())}><Send />Send {chosen.length} {chosen.length === 1 ? "fix" : "fixes"} to the club</button>
        <button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </div>
  );
}
