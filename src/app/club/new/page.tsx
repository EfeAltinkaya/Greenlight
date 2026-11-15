"use client";
import { useRouter } from "next/navigation";
import { announceNav } from "@/components/Motion";
import { useState } from "react";
import { ArrowRight, CalendarSearch, ListChecks, ReceiptText, Sparkles } from "lucide-react";
import { newId, store, useCurrentClub } from "@/lib/store";
import { todayISO } from "@/lib/engine";
import type { Application, EventInfo } from "@/lib/types";
import type { Intake } from "@/lib/ai";
import { Spinner, useToast } from "@/components/ui";

const EXAMPLES = [
  { label: "Hackathon with catering", text: "Hackathon for 120 students in Ginsburg Hall on Feb 18. Catering from Chipotle $5,400, Amazon swag $600, $600 in gift cards for winners." },
  { label: "Beach cleanup", text: "Beach cleanup at Dockweiler on March 6 for 45 volunteers. Gloves and trash bags from Amazon $280, boxed lunches from Panda Catering $630." },
  { label: "Dance showcase", text: "Spring dance showcase in Bovard Auditorium on April 15 for 500 students. Venue rental $3,200, lighting technician $600, posters and programs $350, DJ $500." },
];

export default function NewRequest() {
  const club = useCurrentClub();
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, say] = useToast();

  async function build() {
    if (text.trim().length < 12) return say("Add a sentence or two about the event first");
    setBusy(true);
    try {
      const r = await fetch("/api/intake", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }) });
      const j = (await r.json()) as { data?: Intake; offline?: boolean; error?: string };
      if (!r.ok || !j.data) throw new Error(j.error ?? "Could not read that description. Try adding the date and costs.");
      const d = j.data;
      const event: EventInfo = { ...d.event, board: d.board, boardReason: d.boardReason };
      const app: Application = {
        id: newId(), clubId: club.id, sample: false, event,
        items: d.items.map((i) => ({ ...i, id: newId(), link: "", orderBy: "", toSponsor: false })),
        answers: { description: "", missionFit: "", otherSources: "" }, docs: {}, docFiles: {}, uepa: "",
        status: "draft", createdAt: todayISO(), submittedAt: null,
        history: [{ at: todayISO(), status: "draft", note: j.offline ? "Started with the offline reader" : "Started from your description" }],
        aiComments: [], decision: null, sponsorPlan: null,
      };
      store.upsertApp(app);
      announceNav();
      router.push(`/club/app/${app.id}`);
    } catch (e) {
      say((e as Error).message);
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
        <textarea
          id="describe"
          className="textarea"
          style={{ minHeight: 150, fontSize: 17, lineHeight: 1.5, border: 0, padding: 0, boxShadow: "none", resize: "none" }}
          placeholder="Hackathon for 120 students in Ginsburg Hall on Feb 18. Catering $5,400, swag $600…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) build(); }}
          aria-label="Describe your event"
          autoFocus
        />
        <hr className="hr" />
        <div className="between">
          <div className="row" style={{ gap: 8 }}>
            <span className="small faint">Try:</span>
            {EXAMPLES.map((e) => <button key={e.label} className="chip-btn" onClick={() => setText(e.text)}>{e.label}</button>)}
          </div>
          <button className="btn btn-primary btn-lg" onClick={build} disabled={busy}>
            {busy ? <><Spinner />Reading your event</> : <>Build my application<ArrowRight /></>}
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
      <p className="tiny faint row" style={{ gap: 6 }}><ReceiptText style={{ width: 14, height: 14 }} />Nothing is sent to USG until you press Submit. Traveler details and payments stay in EngageSC.</p>
    </>
  );
}
