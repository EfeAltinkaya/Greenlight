"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, ChevronRight, CircleCheck, Download, FileCheck2, FileUp, MoveRight, Send, Sparkles, X } from "lucide-react";
import { BOARDS, RULES, type BoardId } from "@/data/rules";
import { budgetCsv, documentList, fmtDate, lookupDeadline, money, nineWeekReason, requestItems, requestTotal, runChecks, score, sponsorAsks, UEPA_RE } from "@/lib/engine";
import { store, useStore } from "@/lib/store";
import type { Application, Check as CheckT, EventInfo, LineItem } from "@/lib/types";
import { BudgetTable } from "@/components/BudgetTable";
import { Reveal } from "@/components/Motion";
import { SponsorPanel } from "@/components/SponsorPanel";
import { AiTag, CheckItem, CountPills, Spinner, StatusPill, stepOf, useToast, type StepId } from "@/components/ui";

type Step = StepId | "status" | "sponsors";
const DRAFT_STEPS: { id: Step; title: string; sub: string }[] = [
  { id: "event", title: "Event", sub: "Date, place, board" },
  { id: "budget", title: "Budget", sub: "USG's budget sheet" },
  { id: "documents", title: "Documents", sub: "Quotes, permits, UEPA" },
  { id: "answers", title: "Form answers", sub: "Draft with AI, then edit" },
  { id: "submit", title: "Review and submit", sub: "Send to USG's queue" },
];
const DAY = 86_400_000;
const subHash = (cb: () => void) => { window.addEventListener("hashchange", cb); return () => window.removeEventListener("hashchange", cb); };

export default function Workspace() {
  const { id } = useParams<{ id: string }>();
  const { apps, clubs } = useStore();
  const app = apps.find((a) => a.id === id);
  const club = clubs.find((c) => c.id === app?.clubId);
  const checks = useMemo(() => (app && club ? runChecks(app, club) : []), [app, club]);
  const [toast, say] = useToast();
  const [drafting, setDrafting] = useState(false);
  const [answersOffline, setAnswersOffline] = useState<boolean | null>(null);
  const locked = app ? app.status !== "draft" && app.status !== "needs_info" : true;
  const hash = useSyncExternalStore(subHash, () => window.location.hash.slice(1), () => "") as Step | "";
  const [picked, setPicked] = useState<Step | null>(null);
  const step: Step = picked ?? (hash || (locked ? "status" : "event"));
  const go = (s: Step, field?: string) => {
    setPicked(s);
    history.replaceState(null, "", "#" + s);
    if (!field) return window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => { const el = document.getElementById(field); el?.scrollIntoView({ behavior: "smooth", block: "center" }); (el as HTMLInputElement | null)?.focus({ preventScroll: true }); }, 350);
  };
  const autoDrafted = useRef<string | null>(null);
  // The first time the answers step opens with empty answers, draft them automatically.
  useEffect(() => {
    if (step === "answers" && app && !locked && !app.answers.description && autoDrafted.current !== app.id) {
      autoDrafted.current = app.id;
      draft(); // function declaration below, hoisted
    }
  }, [step, app, locked]);

  if (!app || !club) {
    return <div className="card empty"><strong>This request is not on this device.</strong><Link href="/club" className="link">Back to your requests <ArrowRight /></Link></div>;
  }

  const s = score(checks);
  const patch = (p: Partial<Application>) => store.patchApp(app.id, p);
  const setEvent = (p: Partial<EventInfo>) => patch({ event: { ...app.event, ...p } });
  const setItems = (items: LineItem[]) => patch({ items });
  const needsNine = app.event.travel || checks.some((c) => c.ruleId === "vendor-list" && c.level === "fail");
  const dl = app.event.date ? lookupDeadline(app.event.date, needsNine) : null;
  const docs = documentList(app);
  const asks = sponsorAsks(app);
  const stepChecks = (st: StepId) => checks.filter((c) => stepOf(c) === st);
  const stepState = (st: StepId) => {
    if (st === "answers") return app.answers.description && app.answers.missionFit ? "done" : "todo";
    if (st === "documents") { const miss = docs.filter((d) => !app.docs[d.key]).length; return stepChecks("documents").some((c) => c.level === "fail") || miss ? "todo" : "done"; }
    if (st === "submit") return "todo";
    return stepChecks(st).some((c) => c.level === "fail") ? "bad" : "done";
  };

  const steps: { id: Step; title: string; sub: string }[] = locked
    ? [{ id: "status", title: "Status", sub: "Where it is now" }, ...(asks.length || app.decision ? [{ id: "sponsors" as Step, title: "Sponsors", sub: "Cover what USG won't" }] : []), ...DRAFT_STEPS.slice(0, 4).map((x) => ({ ...x, sub: "Read only" }))]
    : [...DRAFT_STEPS, ...(app.items.some((i) => i.toSponsor) ? [{ id: "sponsors" as Step, title: "Sponsors", sub: "Cover what USG won't" }] : [])];

  function fix(c: CheckT) {
    if (!c.fix) return;
    if (c.fix.action === "to-sponsor" && c.itemId) {
      setItems(app!.items.map((i) => (i.id === c.itemId ? { ...i, toSponsor: true } : i)));
      say("Moved to your sponsor list");
    }
    if (c.fix.action === "cap-food") {
      const food = requestItems(app!).filter((i) => i.category === "food");
      const total = food.reduce((t, i) => t + i.total, 0);
      const max = RULES.foodPerPerson.limit * app!.event.attendance;
      const extra = Math.round((total - max) * 100) / 100;
      const ratio = max / total;
      const capped = app!.items.map((i) => (food.some((f) => f.id === i.id) ? { ...i, total: Math.round(i.total * ratio * 100) / 100, unitPrice: Math.round((i.total * ratio * 100) / Math.max(i.quantity, 1)) / 100, estimate: false, quote: undefined } : i));
      capped.push({ id: "spill-" + Date.now(), item: "Catering above $35 per person", vendor: food[0]?.vendor ?? "", link: "", justification: "", quantity: 1, unitPrice: extra, total: extra, orderBy: "", category: "food", estimate: false, toSponsor: true });
      setItems(capped);
      say(`Food capped at ${money(max)}. ${money(extra)} moved to sponsors`);
    }
  }

  function moveWeek() {
    if (dl?.kind !== "ok" || !dl.cliff) return;
    const offset = Math.round((Date.parse(app!.event.date) - Date.parse(dl.row.weekStart)) / DAY);
    const nd = new Date(Date.parse(dl.cliff.weekStart) + offset * DAY).toISOString().slice(0, 10);
    setEvent({ date: nd });
    say(`Event moved to ${fmtDate(nd)}. New deadline ${fmtDate(dl.cliff.deadline)}`);
  }

  async function attachQuote(itemId: string, file: File) {
    const fd = new FormData();
    fd.append("file", file);
    const r = await fetch("/api/quote", { method: "POST", body: fd });
    const j = await r.json();
    if (!r.ok) return say(j.error ?? "Could not read that file");
    const line = app!.items.find((i) => i.id === itemId)!;
    const total: number | null = j.data.total;
    const matches = total != null && Math.abs(total - line.total) <= Math.max(1, line.total * 0.01);
    const note = total == null ? "No total found on the quote." : matches ? `Quote total ${money(total)} matches this line.` : `Quote total ${money(total)} vs budget ${money(line.total)}. Update the line or get a new quote.`;
    setItems(app!.items.map((i) => (i.id === itemId ? { ...i, quote: { fileName: file.name, vendor: j.data.vendor, total, matches, note } } : i)));
    patch({ docs: { ...app!.docs, quotes: true }, docFiles: { ...(app!.docFiles ?? {}), quotes: file.name } });
    say(matches ? `Quote read: ${money(total!)} matches` : "Quote read, but the total differs");
  }

  async function draft() {
    setDrafting(true);
    try {
      const r = await fetch("/api/answers", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ app, clubName: club!.name, mission: club!.mission ?? "" }) });
      const j = await r.json();
      patch({ answers: { ...j.data, otherSources: app!.answers.otherSources } });
      setAnswersOffline(Boolean(j.offline));
      say("Answers drafted. Read and edit them before you submit");
    } finally {
      setDrafting(false);
    }
  }

  function submit() {
    store.moveApp(app!.id, "submitted", "club", app!.status === "needs_info" ? "Resubmitted with the missing items" : "Submitted to USG");
    say("Submitted to USG");
    go("status");
  }

  function downloadCsv() {
    const blob = new Blob([budgetCsv(app!)], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `RSO_${club!.name.replace(/\W+/g, "")}_BudgetProposal.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const idx = steps.findIndex((x) => x.id === step);
  const next = steps[idx + 1];
  const railChecks = step === "event" || step === "budget" || step === "documents" ? stepChecks(step) : checks.filter((c) => c.level === "fail" || c.level === "warn");
  const blockers = checks.filter((c) => c.level === "fail");
  const answersReady = Boolean(app.answers.description.trim() && app.answers.missionFit.trim() && app.answers.otherSources.trim());

  return (
    <>
      {toast}
      <div className="stack-sm">
        <nav className="crumbs" aria-label="Breadcrumb"><Link href="/club">Requests</Link><ChevronRight /><span>{app.event.title}</span>{app.sample && <span className="sample-tag">Sample</span>}</nav>
        <div className="page-head">
          <div>
            <h1>{app.event.title}</h1>
            <span className="muted">{club.name} · {app.event.date ? fmtDate(app.event.date, { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : "No date yet"} · {app.event.location || "No location yet"}</span>
          </div>
          <div className="row"><StatusPill s={app.status} />{!locked && <CountPills fail={s.fail} warn={s.warn} />}</div>
        </div>
      </div>

      {!locked && dl && (
        dl.kind === "ok" ? (
          <section className={"deadline" + (dl.passed ? " late" : "")} aria-label="Submission deadline">
            <div>
              <div className="dl-days">{dl.passed ? "Late" : Math.max(dl.daysLeft, 0)}</div>
              <div className="dl-unit">{dl.passed ? `${-dl.daysLeft} days ago` : dl.daysLeft === 1 ? "day left" : "days left"}</div>
            </div>
            <div className="stack-sm">
              <div className="dl-date">{dl.passed ? "Deadline passed" : "Submit by"} {fmtDate(dl.deadline, { weekday: "long", month: "long", day: "numeric" })}{dl.passed ? "" : ", 11:59 PM"}</div>
              <div className="dl-sub">
                {dl.uses === "nine" ? `9-week deadline, because ${nineWeekReason(app) || "of travel or an unlisted vendor"}.` : "6-week deadline for vendors on USG's list."}
                {dl.cliff ? ` Holding it the week of ${fmtDate(dl.cliff.weekStart, { month: "short", day: "numeric" })} instead moves the deadline to ${fmtDate(dl.cliff.deadline, { month: "short", day: "numeric" })}, ${dl.cliff.gainDays} more days.` : ""}
              </div>
              {dl.cliff && <div><button className="btn btn-sm" onClick={moveWeek}><MoveRight />Move to the week of {fmtDate(dl.cliff.weekStart, { month: "short", day: "numeric" })}</button></div>}
            </div>
          </section>
        ) : (
          <section className="deadline late"><div className="dl-days" style={{ fontSize: 34 }}>No</div><div className="stack-xs"><div className="dl-date">USG cannot fund this date</div><div className="dl-sub">{dl.reason}</div></div></section>
        )
      )}

      <div className="split split-left">
        <nav className="steps" aria-label="Steps">
          {steps.map((st, i) => {
            const state = ["event", "budget", "documents", "answers", "submit"].includes(st.id) && !locked ? stepState(st.id as StepId) : "plain";
            return (
              <button key={st.id} className="step" aria-current={step === st.id ? "step" : undefined} onClick={() => go(st.id)}>
                <span className={"step-num " + (step !== st.id ? (state === "done" ? "done" : state === "bad" ? "bad" : "") : "")}>
                  {step !== st.id && state === "done" ? <Check strokeWidth={3} /> : step !== st.id && state === "bad" ? <X strokeWidth={3} /> : i + 1}
                </span>
                <span><span className="step-title">{st.title}</span><span className="step-sub">{st.sub}</span></span>
              </button>
            );
          })}
        </nav>

        <Reveal k={step}>
          <div className="steps-compact">
            <button className="btn btn-sm btn-ghost" disabled={idx <= 0} onClick={() => go(steps[idx - 1].id)} aria-label="Previous step"><ArrowLeft /></button>
            <span className="small"><strong>Step {idx + 1} of {steps.length}</strong> · {steps[idx]?.title}</span>
            <button className="btn btn-sm btn-ghost" disabled={!next} onClick={() => next && go(next.id)} aria-label="Next step"><ArrowRight /></button>
          </div>
          {!locked && railChecks.some((c) => c.level === "fail" || c.level === "warn") && (
            <details className="card card-pad mobile-only" open>
              <summary className="small"><strong>{railChecks.filter((c) => c.level === "fail").length} to fix · {railChecks.filter((c) => c.level === "warn").length} to check</strong> on this step</summary>
              <div className="appear" style={{ marginTop: 8 }}>{railChecks.filter((c) => c.level === "fail" || c.level === "warn").map((c) => <CheckItem key={c.id} c={c} onFix={fix} />)}</div>
            </details>
          )}
          {step === "event" && (
            <section className="card card-pad stack" style={{ gap: 18 }}>
              <div className="stack-xs"><h2>Event details</h2><p className="small muted">Read from your description. Change anything that is off; checks update as you type.</p></div>
              <div className="grid cols-2">
                <label className="field"><span className="lbl">Event name</span><input id="ev-title" className="input" disabled={locked} value={app.event.title} onChange={(e) => setEvent({ title: e.target.value })} /></label>
                <label className="field"><span className="lbl">Date</span><input id="ev-date" className="input" type="date" disabled={locked} value={app.event.date} aria-invalid={dl?.kind === "blackout"} aria-describedby="ev-date-msg" onChange={(e) => setEvent({ date: e.target.value })} />
                  {dl?.kind === "blackout"
                    ? <span id="ev-date-msg" className="small field-error" role="alert"><AlertTriangle />{app.event.date ? fmtDate(app.event.date, { weekday: "long" }) + ": " : ""}USG does not fund events from Dec 5 to Jan 12 or after May 1.</span>
                    : <span id="ev-date-msg" className="tiny faint">{app.event.date ? fmtDate(app.event.date, { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : "Pick the day of the event"}</span>}
                </label>
                <label className="field"><span className="lbl">Location</span><input id="ev-loc" className="input" disabled={locked} value={app.event.location} onChange={(e) => setEvent({ location: e.target.value })} /></label>
                <label className="field"><span className="lbl">Expected attendance</span><input id="ev-att" className="input" type="number" min={1} disabled={locked} value={app.event.attendance} onChange={(e) => setEvent({ attendance: Number(e.target.value) })} /></label>
              </div>
              <label className="field">
                <span className="lbl">Funding board</span>
                <select id="ev-board" className="select" disabled={locked} value={app.event.board} onChange={(e) => setEvent({ board: e.target.value as BoardId })}>
                  {(Object.keys(BOARDS) as BoardId[]).map((b) => <option key={b} value={b}>{BOARDS[b].name}</option>)}
                </select>
                <span className="small muted">{app.event.boardReason}</span>
                {BOARDS[app.event.board].formName !== BOARDS[app.event.board].name && <span className="tiny faint">Called &quot;{BOARDS[app.event.board].formName}&quot; on USG&apos;s application form.</span>}
              </label>
              <div className="grid cols-3" style={{ gap: 10 }}>
                {([["onCampus", "On campus"], ["openToAll", "Open to all students"], ["food", "Food served"], ["travel", "Involves travel"], ["ticketed", "Sells tickets"], ["international", "International travel"]] as const).map(([k, label]) => (
                  <label key={k} className="inset row" style={{ padding: "10px 12px", gap: 10, cursor: "pointer", flexWrap: "nowrap" }}>
                    <input id={"ev-" + k} className="check-input" type="checkbox" disabled={locked} checked={app.event[k]} onChange={(e) => setEvent({ [k]: e.target.checked } as Partial<EventInfo>)} />
                    <span className="small" style={{ fontWeight: 550 }}>{label}</span>
                  </label>
                ))}
              </div>
            </section>
          )}

          {step === "budget" && (
            <section className="stack">
              <div className="stack-xs"><h2>Budget</h2><p className="small muted">The same columns as USG&apos;s budget sheet. Anything USG won&apos;t fund can go to your sponsor list instead of being deleted.</p></div>
              <BudgetTable items={app.items} checks={checks} editable={!locked} onChange={setItems} onQuote={attachQuote} />
              {!locked && (
                <div><button className="btn btn-sm" onClick={() => setItems([...app.items, { id: "n" + Date.now(), item: "New item", vendor: "", link: "", justification: "", quantity: 1, unitPrice: 0, total: 0, orderBy: "", category: "supplies", estimate: true, toSponsor: false }])}>Add a line</button></div>
              )}
            </section>
          )}

          {step === "documents" && (
            <section className="card card-pad stack" style={{ gap: 18 }}>
              <div className="stack-xs"><h2>Documents</h2><p className="small muted">Built from USG&apos;s form for this event. Files stay on your device; Greenlight keeps the file name so your checklist is complete.</p></div>
              <label className="field" style={{ maxWidth: 280 }}>
                <span className="lbl">UEPA number</span>
                <input id="uepa" className="input code" placeholder="A12345" disabled={locked} value={app.uepa} aria-invalid={Boolean(app.uepa) && !UEPA_RE.test(app.uepa)} aria-describedby="uepa-msg" onChange={(e) => patch({ uepa: e.target.value.trim().toUpperCase() })} />
                {app.uepa && !UEPA_RE.test(app.uepa)
                  ? <span id="uepa-msg" className="small field-error" role="alert"><AlertTriangle />Must start with A, then 5 or 6 digits (e.g. A12345).</span>
                  : <span id="uepa-msg" className="tiny faint">Starts with A, then 5 or 6 digits. Required with food, university funds or 25+ people.</span>}
              </label>
              <hr className="hr" />
              <div className="stack-sm">
                {docs.map((d) => {
                  const done = Boolean(app.docs[d.key]);
                  const file = app.docFiles?.[d.key];
                  return (
                    <div key={d.key} className="doc-row">
                      <label id={`doc-${d.key}`} className={"drop" + (done ? " done" : "")} style={locked ? { pointerEvents: "none" } : undefined}>
                        {done ? <FileCheck2 /> : <FileUp />}
                        <span className="stack-xs" style={{ flex: 1 }}>
                          <span className="wrap-any" style={{ fontWeight: 600, fontSize: 14 }}>{d.label}</span>
                          <span className="tiny faint wrap-any">{file ? `Attached: ${file}` : d.why}</span>
                        </span>
                        {!locked && (
                          <>
                            <span className="btn btn-sm" aria-hidden="true">{done ? "Replace" : "Attach"}</span>
                            <input type="file" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) { patch({ docs: { ...app.docs, [d.key]: true }, docFiles: { ...(app.docFiles ?? {}), [d.key]: f.name } }); say(`${f.name} attached`); } e.target.value = ""; }} aria-label={`Attach ${d.label}`} />
                          </>
                        )}
                      </label>
                      {!locked && (
                        <label className="have-it">
                          <input type="checkbox" className="check-input" checked={done} onChange={(e) => patch({ docs: { ...app.docs, [d.key]: e.target.checked } })} />
                          <span className="small">I have it</span>
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {step === "answers" && (
            <section className="card card-pad stack" style={{ gap: 18 }}>
              <div className="between">
                <div className="stack-xs"><h2>Form answers</h2><p className="small muted">USG&apos;s form asks these three questions. Greenlight drafts them from your event; you edit.</p></div>
                {!locked && <button className="btn" onClick={draft} disabled={drafting}>{drafting ? <><Spinner />Writing</> : <><Sparkles />{app.answers.description ? "Redraft" : "Draft with AI"}</>}</button>}
              </div>
              {answersOffline !== null && <AiTag offline={answersOffline} />}
              {!locked && (
                <label className="field">
                  <span className="lbl">Your club&apos;s mission, in one line</span>
                  <input id="club-mission" className="input" value={club.mission ?? ""} placeholder="e.g. We help USC students build robots and get hired in hardware" onChange={(e) => store.patchClub(club.id, { mission: e.target.value })} />
                  <span className="tiny faint">Saved for your club and used to draft the mission answer.</span>
                </label>
              )}
              {drafting && <div className="row small muted"><Spinner />Writing your answers</div>}
              {([["description", "Description of event"], ["missionFit", "How does the event align with your mission, vision or goals?"]] as const).map(([k, label]) => (
                <label key={k} className="field">
                  <span className="lbl">{label}</span>
                  <textarea id={"ans-" + k} className="textarea" style={{ minHeight: 120 }} disabled={locked} value={app.answers[k]} placeholder="Draft with AI, then make it yours" onChange={(e) => patch({ answers: { ...app.answers, [k]: e.target.value } })} />
                </label>
              ))}
              <OtherSources value={app.answers.otherSources} locked={locked} onChange={(v) => patch({ answers: { ...app.answers, otherSources: v } })} />
            </section>
          )}

          {step === "submit" && (
            <section className="card card-pad stack" style={{ gap: 20 }}>
              <div className="stack-xs"><h2>Review and submit</h2><p className="small muted">This is what USG will see.</p></div>
              <dl className="kv">
                <dt>Board</dt><dd>{BOARDS[app.event.board].name}</dd>
                <dt>Requested</dt><dd><strong>{money(requestTotal(app))}</strong> <span className="faint">· {money(RULES.annualCap.limit - club.receivedThisYear)} left now · {money(RULES.annualCap.limit - club.receivedThisYear - requestTotal(app))} after this request</span></dd>
                <dt>Deadline</dt><dd>{dl?.kind === "ok" ? `${fmtDate(dl.deadline, { weekday: "long", month: "long", day: "numeric" })}${dl.passed ? " (passed)" : ""}` : "None for this date"}</dd>
                <dt>Documents</dt><dd>{docs.filter((d) => app.docs[d.key]).length} of {docs.length} ready</dd>
                <dt>For sponsors</dt><dd>{asks.length ? asks.map((a) => `${a.label} (${money(a.amount)})`).join(", ") : "Nothing"}</dd>
              </dl>
              {blockers.length > 0 && (
                <div className="inset stack-sm" style={{ padding: 16 }}>
                  <strong className="small">Fix these first</strong>
                  {blockers.map((c) => <button key={c.id} className="row small" style={{ border: 0, background: "none", padding: 0, cursor: "pointer", color: "var(--fix)", textAlign: "left", flexWrap: "nowrap" }} onClick={() => go(stepOf(c), fieldFor(c))}><X style={{ width: 14, height: 14, flex: "none" }} />{c.title}<ArrowRight style={{ width: 14, height: 14, flex: "none" }} /></button>)}
                </div>
              )}
              {!answersReady && !blockers.length && <button className="small field-warn" style={{ border: 0, background: "none", padding: 0, cursor: "pointer", textAlign: "left" }} onClick={() => go("answers", !app.answers.otherSources.trim() ? "other-sources" : "ans-description")}><AlertTriangle />Finish the form answers, including other funding sources, before you submit.</button>}
              <div className="row">
                <button className="btn btn-primary btn-lg" disabled={blockers.length > 0 || !answersReady} onClick={submit}><Send />Submit to USG</button>
                <button className="btn btn-lg" onClick={downloadCsv}><Download />Budget sheet (CSV)</button>
              </div>
              <p className="tiny faint">Submit sends this to USG reviewers in Greenlight; nothing is sent before you press it. USG still needs the official copy in EngageSC: upload the budget sheet CSV there. Traveler details and payments stay in EngageSC.</p>
            </section>
          )}

          {step === "status" && <StatusView app={app} onSponsors={() => go("sponsors")} />}
          {step === "sponsors" && <SponsorPanel app={app} club={club} asks={asks} />}

          {next && step !== "submit" && (
            <div className="between">
              <span className="small faint">Step {idx + 1} of {steps.length}</span>
              <button className="btn btn-dark" onClick={() => go(next.id)}>{next.title}<ArrowRight /></button>
            </div>
          )}
        </Reveal>

        <aside className="sticky stack-sm" aria-label="Checks">
          {step === "status" || step === "sponsors" ? (
            <div className="card card-pad stack-sm">
              <h3>What happens next</h3>
              <ol className="small muted" style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 8 }}>
                <li>A board director reviews it, then a graduate advisor and Campus Activities staff.</li>
                <li>If something is missing you get 2 business days to send it.</li>
                <li>USG does not fund reimbursements (Section 5: &quot;Any reimbursements&quot;).</li>
                <li>After the event: confirm post-event steps with USG.</li>
              </ol>
            </div>
          ) : (
            <div className="card card-pad">
              <div className="between" style={{ marginBottom: 8 }}>
                <h3>{step === "answers" || step === "submit" ? "Open items" : "Rule check"}</h3>
                <span className="tiny faint">2026-27 guidelines</span>
              </div>
              {railChecks.length === 0 ? (
                <div className="row small" style={{ color: "var(--clear)", padding: "8px 0" }}><CircleCheck style={{ width: 18, height: 18 }} />Nothing to fix here.</div>
              ) : (
                <div className="appear" key={step}>{[...railChecks].sort((a, b) => "fwpi".indexOf(a.level[0]) - "fwpi".indexOf(b.level[0])).map((c) => <CheckItem key={c.id} c={c} onFix={locked ? undefined : fix} />)}</div>
              )}
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

function StatusView({ app, onSponsors }: { app: Application; onSponsors: () => void }) {
  const d = app.decision;
  return (
    <section className="stack">
      {d && (
        <div className="card card-pad stack-sm" style={{ borderTop: `4px solid ${d.outcome === "denied" ? "var(--fix)" : "var(--gold)"}` }}>
          <span className="eyebrow">{d.outcome === "denied" ? "Decision" : "Funded"}</span>
          <h2 style={{ fontSize: 28 }}>{d.outcome === "denied" ? "USG denied this request" : `USG awarded ${money(d.amount)}`}</h2>
          <div className="email small muted">{d.email}</div>
          <div id="funding" className="row">{d.outcome !== "denied" && <button className="btn btn-primary" onClick={onSponsors}>Cover the rest with sponsors<ArrowRight /></button>}{d.outcome !== "approved" && <Link href="/club/funding" className={"btn" + (d.outcome === "denied" ? " btn-primary" : "")}>Apply to other USC funding<ArrowRight /></Link>}</div>
        </div>
      )}
      <div className="card card-pad stack-sm">
        <h2>Timeline</h2>
        <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 0 }}>
          {[...app.history].reverse().map((h, i) => (
            <li key={i} className="row" style={{ alignItems: "flex-start", gap: 14, padding: "12px 0", borderTop: i ? "1px solid var(--line-2)" : 0, flexWrap: "nowrap" }}>
              <span className="small faint num" style={{ width: 86, flex: "none" }}>{fmtDate(h.at, { month: "short", day: "numeric" })}</span>
              <span className="stack-xs"><span><StatusPill s={h.status} /></span><span className="small">{h.note}</span></span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** Where on the page a rule problem can be fixed, so "Fix these first" can jump straight to it. */
function fieldFor(c: CheckT): string | undefined {
  if (c.itemId) return `item-${c.itemId}`;
  if (c.ruleId === "uepa") return "uepa";
  if (c.ruleId === "food-docs") return "doc-healthPermit";
  if (c.ruleId === "late" || c.ruleId === "blackout") return "ev-date";
  if (c.ruleId === "open-to-all") return "ev-openToAll";
  if (c.ruleId === "ticket-sales") return "ev-ticketed";
  if (c.ruleId === "international-travel") return "ev-international";
  return undefined;
}

/** USG's "other funding sources" question. Never filled in by AI: getting other University money is a denial reason. */
function OtherSources({ value, locked, onChange }: { value: string; locked: boolean; onChange: (v: string) => void }) {
  const none = value === "None" || /^n\/?a\.?$/i.test(value.trim());
  const [yes, setYes] = useState(Boolean(value) && !none);
  return (
    <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
      <legend className="lbl">List of other funding sources</legend>
      <span className="small muted">Are you getting money for this event from Viterbi, a department, an assembly, another USC office or sponsors?</span>
      <div className="segmented" role="radiogroup" aria-label="Other funding" id="other-sources">
        <button type="button" role="radio" aria-checked={none} disabled={locked} onClick={() => { setYes(false); onChange("None"); }}>No other money</button>
        <button type="button" role="radio" aria-checked={yes} disabled={locked} onClick={() => { setYes(true); if (none) onChange(""); }}>Yes</button>
      </div>
      {yes && <textarea id="ans-otherSources" className="textarea" style={{ minHeight: 64 }} disabled={locked} value={none ? "" : value} placeholder="Who, how much, and what it covers" onChange={(e) => onChange(e.target.value)} />}
      <span className="tiny faint">Greenlight never fills this in for you. Money from another University source can change USG&apos;s decision (Section 6).</span>
    </fieldset>
  );
}
