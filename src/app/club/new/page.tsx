"use client";
import { useRouter } from "next/navigation";
import { announceNav } from "@/components/Motion";
import { useState, useEffect } from "react";
import { ArrowRight, CalendarSearch, ListChecks, ReceiptText, Sparkles, AlertTriangle } from "lucide-react";
import { authFetch } from "@/lib/apiClient";
import { newId, store, useCurrentClub } from "@/lib/store";
import { fmtDate, lookupDeadline, runChecks, todayISO } from "@/lib/engine";
import { makeRequestId } from "@/lib/requestId";
import type { Application, EventInfo } from "@/lib/types";
import type { Intake } from "@/lib/ai";
import { stepOf, Spinner, useToast } from "@/components/ui";
import { useSession } from "@/lib/session";

const EXAMPLES = [
  { label: "Hackathon with catering", text: "Hackathon for 120 students in Ginsburg Hall on Feb 18. Catering from Chipotle $5,400, Amazon swag $600, $600 in gift cards for winners." },
  { label: "Beach cleanup", text: "Beach cleanup at Dockweiler on March 6 for 45 volunteers. Gloves and trash bags from Amazon $280, boxed lunches from Panda Catering $630." },
  { label: "Dance showcase", text: "Spring dance showcase in Bovard Auditorium on April 15 for 500 students. Venue rental $3,200, lighting technician $600, posters and programs $350, DJ $500." },
];

export default function NewRequest() {
  const club = useCurrentClub();
  const session = useSession();
  const router = useRouter();
  // With accounts switched on, a new request needs an account: sign up first, then come straight back here.
  useEffect(() => {
    if (session.enabled && session.ready && !session.user) router.replace("/login?mode=signup&next=/club/new");
  }, [session.enabled, session.ready, session.user]); // eslint-disable-line react-hooks/exhaustive-deps
  const [text, setText] = useState("");
  const [previewDate, setPreviewDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, say] = useToast();
  const [err, setErr] = useState("");
  const previewSix = previewDate ? lookupDeadline(previewDate, false) : null;
  const previewNine = previewDate ? lookupDeadline(previewDate, true) : null;

  async function build() {
    if (text.trim().length < 12) { setErr("Add a sentence or two about the event first: what, when, where, how many people and what it costs."); return say("Add a sentence or two about the event first", "error"); }
    setErr("");
    setBusy(true);
    try {
      const r = await authFetch("/api/intake", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }) });
      const j = (await r.json()) as { data?: Intake; offline?: boolean; error?: string };
      if (!r.ok || !j.data) throw new Error(j.error ?? "Could not read that description. Try adding the date and costs.");
      const d = j.data;
      const event: EventInfo = { ...d.event, board: d.board, boardReason: d.boardReason };
      const id = newId();
      let app: Application = {
        id, requestId: makeRequestId(id), clubId: club.id, sample: false, event,
        items: d.items.map((i) => ({ ...i, id: newId(), link: "", orderBy: "", toSponsor: false })),
        answers: { description: "", missionFit: "", otherSources: "" }, docs: {}, docFiles: {}, docPaths: {}, uepa: "",
        status: "draft", createdAt: todayISO(), submittedAt: null,
        history: [{ at: todayISO(), status: "draft", note: j.offline ? "Started with the offline reader" : "Started from your description" }],
        aiComments: [], decision: null, sponsorPlan: null, audit: [], messages: [],
      };

      // Auto-draft form answers so submit is not a surprise later.
      try {
        const ar = await authFetch("/api/answers", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ app, clubName: club.name, mission: club.mission ?? "" }) });
        const aj = await ar.json();
        if (ar.ok && aj.data) {
          app = { ...app, answers: aj.data, history: [...app.history, { at: todayISO(), status: "draft", note: aj.offline ? "Form answers drafted offline" : "Form answers drafted" }] };
        }
      } catch {
        /* answers can be drafted on the answers step */
      }

      store.upsertApp(app);
      store.audit(app.id, { by: "club", action: "intake", detail: j.offline ? "Offline intake" : "AI intake" });

      const checks = runChecks(app, club);
      const firstFail = checks.find((c) => c.level === "fail");
      const hash = firstFail ? stepOf(firstFail) : app.answers.description ? "event" : "answers";
      announceNav();
      router.push(`/club/app/${app.id}#${hash}`);
    } catch (e) {
      setErr((e as Error).message);
      say((e as Error).message, "error");
      setBusy(false);
    }
  }

  return (
    <>
      {toast}
      <div className="page-head">
        <div>
          <span className="eyebrow">New request · {club.name}</span>
          <h1>Tell us about the event.</h1>
          <p className="lede">Write it the way you would text your e-board: what, when, where, how many people, and what it costs. Greenlight turns it into USG&apos;s application.</p>
        </div>
      </div>

      <section className="card card-pad stack" style={{ gap: 18 }}>
        <label className="field">
          <span className="lbl">When is the event? (check your USG deadline before you write)</span>
          <input id="preview-date" className="input" type="date" value={previewDate} onChange={(e) => setPreviewDate(e.target.value)} aria-describedby="deadline-preview" />
        </label>
        {previewDate && (
          <div id="deadline-preview" className="inset stack-xs" style={{ padding: 12 }}>
            {previewSix?.kind === "ok" ? (
              <p className="small"><strong>For this date your USG deadline is {fmtDate(previewSix.deadline, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</strong> (6-week, listed vendors){previewSix.passed ? " · already passed" : ""}.</p>
            ) : previewSix?.kind === "blackout" ? (
              <p className="small field-warn"><AlertTriangle />{previewSix.reason}</p>
            ) : (
              <p className="small muted">{previewSix?.reason ?? "No 6-week deadline for this week."}</p>
            )}
            {previewNine?.kind === "ok" && (
              <p className="tiny faint">If you use travel or a vendor not on USG&apos;s list, the 9-week deadline is {fmtDate(previewNine.deadline, { weekday: "long", month: "long", day: "numeric" })}{previewNine.passed ? " (passed)" : ""}.</p>
            )}
            <p className="tiny faint">Blackout: Dec 5, 2026 to Jan 12, 2027, and events after May 1, 2027 are not funded. Applications are due Wednesdays at 11:59 PM.</p>
          </div>
        )}
        <textarea
          id="describe"
          className="textarea"
          style={{ minHeight: 150, fontSize: 17, lineHeight: 1.5, border: 0, padding: 0, boxShadow: "none", resize: "none" }}
          placeholder="Hackathon for 120 students in Ginsburg Hall on Feb 18. Catering $5,400, swag $600…"
          value={text}
          onChange={(e) => { setText(e.target.value); if (err) setErr(""); }}
          aria-invalid={Boolean(err)}
          aria-describedby="describe-msg"
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) build(); }}
          aria-label="Describe your event"
          autoFocus
        />
        {err && <p id="describe-msg" className="small field-error" role="alert"><AlertTriangle />{err}</p>}
        <hr className="hr" />
        <div className="between">
          <div className="row" style={{ gap: 8 }}>
            <span className="small faint">Try:</span>
            {EXAMPLES.map((e) => <button key={e.label} className="chip-btn" onClick={() => setText(e.text)}>{e.label}</button>)}
          </div>
          <button className="btn btn-primary btn-lg" onClick={build} disabled={busy}>
            {busy ? <><Spinner />Building your application</> : <>Build my application<ArrowRight /></>}
          </button>
        </div>
      </section>

      <section className="grid cols-3">
        {[
          { Icon: Sparkles, t: "Reads your description", d: "Date, place, attendance and every cost become USG's budget sheet, with the right funding board." },
          { Icon: ListChecks, t: "Checks every line", d: "Each cost is checked against the 2026-27 guidelines, with the rule quoted and a one-click fix." },
          { Icon: CalendarSearch, t: "Finds your deadline", d: "The exact Wednesday you must submit by, from USG's own deadline sheet." },
        ].map(({ Icon, t, d }) => (
          <div key={t} className="stack-sm" style={{ padding: "4px 4px" }}>
            <span className="icon-tile"><Icon /></span>
            <h3>{t}</h3>
            <p className="small muted">{d}</p>
          </div>
        ))}
      </section>
      <p className="tiny faint row" style={{ gap: 6 }}><ReceiptText style={{ width: 14, height: 14 }} />Nothing goes to USG reviewers until you press Submit on the last step. Traveler details and payments stay in EngageSC.</p>
    </>
  );
}
