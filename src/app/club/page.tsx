"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { RULES } from "@/data/rules";
import { fmtDate, money, requestTotal, runChecks, todayISO } from "@/lib/engine";
import { DEMO_CLUB_ID } from "@/lib/seed";
import { newId, store, useStore } from "@/lib/store";
import type { Application, EventInfo } from "@/lib/types";
import type { Intake } from "@/lib/ai";
import { Signal, Spinner, StatusChip, overall, useToast } from "@/components/ui";

const EXAMPLE =
  "Hackathon for 120 students in Ginsburg Hall on Feb 18. Catering from Chipotle $5,400, Amazon swag $600, $600 in gift cards for winners.";

export default function ClubHome() {
  const { clubs, apps } = useStore();
  const router = useRouter();
  const [clubId, setClubId] = useState(DEMO_CLUB_ID);
  const club = clubs.find((c) => c.id === clubId) ?? clubs[0];
  const mine = apps.filter((a) => a.clubId === club.id);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, say] = useToast();
  const left = RULES.annualCap.limit - club.receivedThisYear;

  async function start() {
    if (text.trim().length < 8) return say("Describe the event in a sentence or two.");
    setBusy(true);
    try {
      const r = await fetch("/api/intake", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }) });
      const j = (await r.json()) as { data?: Intake; offline?: boolean; error?: string };
      if (!r.ok || !j.data) throw new Error(j.error ?? "Could not read that description.");
      const d = j.data;
      const event: EventInfo = { ...d.event, board: d.board, boardReason: d.boardReason };
      const app: Application = {
        id: newId(),
        clubId: club.id,
        sample: false,
        event,
        items: d.items.map((i) => ({ ...i, id: newId(), link: "", orderBy: "", toSponsor: false })),
        answers: { description: "", missionFit: "", otherSources: "" },
        docs: {},
        uepa: "",
        status: "draft",
        createdAt: todayISO(),
        submittedAt: null,
        history: [{ at: todayISO(), status: "draft", note: j.offline ? "Started (offline parser)" : "Started from a description" }],
        aiComments: [],
        decision: null,
        sponsorPlan: null,
      };
      store.upsertApp(app);
      router.push(`/club/app/${app.id}`);
    } catch (e) {
      say((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <main className="page stack" style={{ gap: 28 }}>
      {toast}
      <section className="between" style={{ alignItems: "flex-end" }}>
        <div className="stack-sm">
          <span className="label">Your club</span>
          <select className="select" style={{ width: "auto", fontFamily: "var(--display)", fontWeight: 700, fontSize: 22, padding: "4px 8px", border: "1px solid transparent", background: "transparent" }} value={club.id} onChange={(e) => setClubId(e.target.value)} aria-label="Club">
            {clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="row" style={{ gap: 28 }}>
          <Stat label="USG money left this year" value={money(left)} sub={`of ${money(RULES.annualCap.limit)}`} />
          <Stat label="Funded events this semester" value={`${club.eventsThisSemester} of 4`} />
          <Stat label="School" value={club.school} />
        </div>
      </section>

      <section className="sheet sheet-pad stack" style={{ gap: 14 }}>
        <div className="between">
          <div>
            <h1 style={{ fontSize: 28 }}>Plan an event</h1>
            <p className="muted" style={{ margin: "4px 0 0" }}>Describe it the way you would text your e-board. Greenlight fills USG&apos;s budget sheet, finds your deadline and checks every line against the 2026-27 rules.</p>
          </div>
        </div>
        <textarea
          id="describe"
          className="textarea"
          style={{ minHeight: 110, fontSize: 16 }}
          placeholder={EXAMPLE}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) start(); }}
          aria-label="Describe your event"
        />
        <div className="between">
          <button className="btn ghost sm" onClick={() => setText(EXAMPLE)}>Use the example</button>
          <button className="btn primary" onClick={start} disabled={busy}>
            {busy ? <Spinner /> : null} {busy ? "Reading your event" : "Build my application"}
          </button>
        </div>
      </section>

      <section className="stack-sm">
        <div className="between"><h2>Applications</h2><span className="faint small">{mine.length} total</span></div>
        {mine.length === 0 ? (
          <div className="empty">No applications yet. Describe your first event above.</div>
        ) : (
          <div className="sheet tablewrap">
            <table className="ledger">
              <thead><tr><th className="lamp-cell" /><th>Event</th><th>Date</th><th className="num">Requested</th><th>Status</th><th /></tr></thead>
              <tbody>
                {mine.map((a) => {
                  const st = overall(runChecks(a, club));
                  return (
                    <tr key={a.id}>
                      <td className="lamp-cell"><Signal state={a.status === "draft" ? st : "off"} /></td>
                      <td><strong>{a.event.title}</strong> {a.sample && <span className="sample">Sample</span>}<div className="small faint">{a.event.location}</div></td>
                      <td className="mono small">{a.event.date ? fmtDate(a.event.date) : "No date"}</td>
                      <td className="num">{money(requestTotal(a))}</td>
                      <td><StatusChip s={a.status} /></td>
                      <td style={{ textAlign: "right" }}><Link className="btn sm" href={`/club/app/${a.id}`}>Open</Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="stack-sm" style={{ gap: 4 }}>
      <span className="label">{label}</span>
      <span className="display" style={{ fontSize: 24 }}>{value} {sub && <span className="small faint" style={{ fontFamily: "var(--body)", fontWeight: 400, letterSpacing: 0 }}>{sub}</span>}</span>
    </div>
  );
}
