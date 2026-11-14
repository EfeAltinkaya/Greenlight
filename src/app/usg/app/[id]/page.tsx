"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { BOARDS } from "@/data/rules";
import { documentList, fmtDate, money, requestItems, requestTotal, runChecks } from "@/lib/engine";
import { store, useStore } from "@/lib/store";
import type { AiComment, Check } from "@/lib/types";
import { BudgetTable } from "@/components/BudgetTable";
import { Spinner, StatusChip, useToast } from "@/components/ui";

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

export default function Review() {
  const { id } = useParams<{ id: string }>();
  const { apps, clubs } = useStore();
  const app = apps.find((a) => a.id === id);
  const club = clubs.find((c) => c.id === app?.clubId);
  const checks = useMemo(() => (app && club ? runChecks(app, club, app.submittedAt ?? undefined) : []), [app, club]);
  const [toast, say] = useToast();
  const [loading, setLoading] = useState(false);
  const [outcome, setOutcome] = useState<"approved" | "partial" | "denied">("approved");
  const [amount, setAmount] = useState<number | null>(null);
  const [reason, setReason] = useState(REASONS[0].id);
  const [email, setEmail] = useState("");
  const [drafting, setDrafting] = useState(false);
  const asked = useRef(false);

  // Opening a submitted application moves it to "In review" and asks the AI for comments once.
  useEffect(() => {
    if (!app) return;
    if (app.status === "submitted") store.setStatus(app.id, "in_review", "Opened by the funding director");
    if (app.aiComments.length === 0 && !asked.current && ["submitted", "in_review", "needs_info"].includes(app.status)) {
      asked.current = true;
      setLoading(true);
      fetch("/api/review", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ app, checks }) })
        .then((r) => r.json())
        .then((j: { data: { checkId: string; text: string }[] }) => {
          const comments: AiComment[] = j.data.map((c, i) => {
            const ck = checks.find((x) => x.id === c.checkId);
            return { id: "c" + i, checkId: c.checkId, text: c.text, citation: ck ? `${ck.section}: "${ck.quote}"` : "", action: "pending" };
          });
          store.patchApp(app.id, { aiComments: comments });
        })
        .finally(() => setLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app?.id]);

  if (!app || !club) return <main className="page"><div className="empty">Application not found. <Link href="/usg">Back to the queue</Link></div></main>;

  const total = requestTotal(app);
  const fundable = requestItems(app).filter((i) => !checks.some((c) => c.itemId === i.id && c.level === "fail")).reduce((s, i) => s + i.total, 0);
  const amt = amount ?? (outcome === "denied" ? 0 : outcome === "partial" ? Math.min(fundable, 4000) : total);
  const decided = Boolean(app.decision);
  const docs = documentList(app);
  const missing = docs.filter((d) => !app.docs[d.key]);

  const act = (cid: string, action: AiComment["action"], edited?: string) =>
    store.patchApp(app.id, (a) => ({ aiComments: a.aiComments.map((c) => (c.id === cid ? { ...c, action, edited: edited ?? c.edited } : c)) }));

  async function draftEmail() {
    setDrafting(true);
    try {
      // Only issues the reviewer accepted go to the club: the check itself for agreed comments, the reviewer's words for edited ones.
      const notes = app!.aiComments
        .filter((c) => c.action === "agree" || c.action === "edited")
        .map((c) => ({ c, ck: checks.find((x) => x.id === c.checkId) }))
        .filter(({ c, ck }) => c.action === "edited" || (ck && (ck.level === "fail" || ck.level === "warn")))
        .map(({ c, ck }) => (c.action === "edited" ? `${c.edited} (${ck?.section ?? "Guidelines"})` : `${ck!.title}. ${ck!.detail} (${ck!.section})`));
      const r = await fetch("/api/decision", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ app, clubName: club!.name, outcome, amount: amt, reasonLabel: REASONS.find((x) => x.id === reason)!.label, notes }) });
      const j = await r.json();
      setEmail(j.data);
    } finally {
      setDrafting(false);
    }
  }

  function send() {
    const at = new Date().toISOString().slice(0, 10);
    store.patchApp(app!.id, { decision: { outcome, amount: amt, reasonCode: reason, email, sentAt: at } });
    store.setStatus(app!.id, outcome, outcome === "denied" ? "Denied. Explanation emailed to the club." : `${outcome === "partial" ? "Partly funded" : "Approved"}: ${money(amt)}. Explanation emailed to the club.`);
    if (outcome !== "denied") store.patchClub(club!.id, { receivedThisYear: club!.receivedThisYear + amt, eventsThisSemester: club!.eventsThisSemester + 1 });
    say("Decision sent. The club sees it now.");
  }

  function returnIncomplete() {
    store.setStatus(app!.id, "needs_info", `Returned as incomplete: ${missing.map((m) => m.label.split(" (")[0]).join("; ")}. 2 business days to fix.`);
    say("Returned to the club. The 2-business-day clock started.");
  }

  const agreed = app.aiComments.filter((c) => c.action !== "pending").length;

  return (
    <main className="page">
      {toast}
      <div className="row small" style={{ marginBottom: 14 }}>
        <Link href="/usg" className="faint">Review queue</Link><span className="faint">/</span><span>{app.event.title}</span>
        {app.sample && <span className="sample">Sample</span>}
      </div>
      <header className="between" style={{ marginBottom: 24, alignItems: "flex-start" }}>
        <div className="stack-sm">
          <h1>{app.event.title}</h1>
          <div className="row small muted">
            <span>{club.name}</span><span>·</span><span>{BOARDS[app.event.board].name}</span><span>·</span>
            <span className="mono">{fmtDate(app.event.date, { weekday: "long", month: "long", day: "numeric" })}</span><span>·</span><span>{app.event.attendance} expected</span>
          </div>
        </div>
        <div className="stack-sm" style={{ justifyItems: "end" }}>
          <StatusChip s={app.status} />
          <span className="display" style={{ fontSize: 26 }}>{money(total)}</span>
          <span className="small faint">requested · {money(8000 - club.receivedThisYear)} left of the club&apos;s $8,000</span>
        </div>
      </header>

      <div className="grid-2 wide">
        <div className="stack" style={{ gap: 26 }}>
          <section className="section">
            <h2>Budget</h2>
            <BudgetTable items={app.items} checks={checks} />
          </section>
          <section className="section">
            <h2>Form answers</h2>
            <div className="sheet sheet-pad stack">
              {([["description", "Description of event"], ["missionFit", "Mission fit"], ["otherSources", "Other funding sources"]] as const).map(([k, l]) => (
                <div key={k} className="stack-sm" style={{ gap: 4 }}><span className="label">{l}</span><span>{app.answers[k] || <span className="faint">Not provided</span>}</span></div>
              ))}
            </div>
          </section>
          <section className="section">
            <div className="section-head"><h2>Documents</h2><span className="label">{docs.length - missing.length} of {docs.length}</span></div>
            <div className="sheet sheet-pad stack-sm">
              <div className="row small"><span className={"lamp " + (app.uepa ? "pass" : "fail")} /> UEPA <span className="mono">{app.uepa || "missing"}</span></div>
              {docs.map((d) => (
                <div key={d.key} className="row small"><span className={"lamp " + (app.docs[d.key] ? "pass" : "fail")} /> {d.label}</div>
              ))}
            </div>
          </section>
          <section className="section">
            <h2>History</h2>
            <div className="timeline">
              {[...app.history].reverse().map((h, i) => (<div key={i}><span className="mono small faint">{h.at}</span><span><StatusChip s={h.status} /> <span className="small">{h.note}</span></span></div>))}
            </div>
          </section>
        </div>

        <aside className="sticky stack" style={{ gap: 16 }}>
          <div className="sheet sheet-pad stack-sm">
            <div className="between">
              <h2>AI review</h2>
              <span className="small faint">{agreed} of {app.aiComments.length} handled</span>
            </div>
            <p className="small faint" style={{ margin: 0 }}>Suggestions only. Agree, disagree or edit each one; nothing reaches the club until you send a decision.</p>
            {loading && <div className="row small muted"><Spinner /> Reading the application</div>}
            <div className="checks">
              {app.aiComments.map((c) => <Comment key={c.id} c={c} check={checks.find((x) => x.id === c.checkId)} locked={decided} onAct={act} />)}
            </div>
          </div>

          {!decided ? (
            <div className="sheet sheet-pad stack-sm">
              <h2>Decision</h2>
              <div className="row" role="radiogroup" aria-label="Outcome">
                {(["approved", "partial", "denied"] as const).map((o) => (
                  <label key={o} className={"chip " + (outcome === o ? "dark" : "")} style={{ cursor: "pointer", padding: "8px 12px" }}>
                    <input type="radio" name="outcome" value={o} checked={outcome === o} onChange={() => { setOutcome(o); setAmount(null); setEmail(""); }} style={{ position: "absolute", opacity: 0 }} />
                    {o === "approved" ? "Approve" : o === "partial" ? "Fund part" : "Deny"}
                  </label>
                ))}
              </div>
              {outcome !== "denied" && (
                <label className="field"><span>Amount awarded</span><input id="amount" className="input mono" type="number" min={0} max={total} value={amt} onChange={(e) => setAmount(Number(e.target.value))} /></label>
              )}
              {outcome === "partial" && <span className="small faint">Suggested: lines with no red flags, capped at $4,000 ({money(fundable)} fundable).</span>}
              <label className="field"><span>Reason</span>
                <select id="reason" className="select" value={reason} onChange={(e) => setReason(e.target.value)}>{REASONS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}</select>
              </label>
              <button className="btn" onClick={draftEmail} disabled={drafting}>{drafting ? <Spinner /> : null} Draft the email to the club</button>
              {email && (
                <>
                  <textarea id="decision-email" className="textarea email" style={{ minHeight: 240 }} value={email} onChange={(e) => setEmail(e.target.value)} />
                  <button className="btn primary" onClick={send}>Send decision</button>
                </>
              )}
              {missing.length > 0 && app.status !== "needs_info" && (
                <>
                  <hr className="divider" />
                  <button className="btn ghost stop" onClick={returnIncomplete}>Return as incomplete ({missing.length} missing)</button>
                </>
              )}
            </div>
          ) : (
            <div className="sheet sheet-pad stack-sm">
              <h2>Sent {app.decision!.sentAt}</h2>
              <div className="email small">{app.decision!.email}</div>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}

function Comment({ c, check, locked, onAct }: { c: AiComment; check?: Check; locked: boolean; onAct: (id: string, a: AiComment["action"], edited?: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(c.edited ?? c.text);
  const lvl = check?.level ?? "info";
  return (
    <div className="check" style={{ opacity: c.action === "disagree" ? 0.55 : 1 }}>
      <span className={"lamp " + lvl} />
      <div className="stack-sm" style={{ gap: 6 }}>
        {editing ? (
          <>
            <textarea className="textarea" value={val} onChange={(e) => setVal(e.target.value)} style={{ minHeight: 70 }} aria-label="Edit comment" />
            <div className="row"><button className="btn sm primary" onClick={() => { onAct(c.id, "edited", val); setEditing(false); }}>Save</button><button className="btn sm ghost" onClick={() => setEditing(false)}>Cancel</button></div>
          </>
        ) : (
          <span style={{ textDecoration: c.action === "disagree" ? "line-through" : undefined }}>{c.edited ?? c.text}</span>
        )}
        {c.citation && <div className="rule-quote">{c.citation}</div>}
        {!locked && !editing && (
          <div className="row" style={{ gap: 4 }}>
            <button className={"btn sm " + (c.action === "agree" ? "go" : "ghost")} aria-pressed={c.action === "agree"} onClick={() => onAct(c.id, c.action === "agree" ? "pending" : "agree")}>✓ Agree</button>
            <button className={"btn sm " + (c.action === "disagree" ? "stop" : "ghost")} aria-pressed={c.action === "disagree"} onClick={() => onAct(c.id, c.action === "disagree" ? "pending" : "disagree")}>✕ Disagree</button>
            <button className="btn sm ghost" onClick={() => setEditing(true)}>Edit</button>
          </div>
        )}
      </div>
    </div>
  );
}
