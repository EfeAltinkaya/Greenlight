"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FilePlus2, Inbox } from "lucide-react";
import { BOARDS } from "@/data/rules";
import { fmtDate, money, requestTotal, runChecks, score } from "@/lib/engine";
import { useCurrentClub, useStore } from "@/lib/store";
import { APP_FLOW } from "@/lib/workflow";
import type { Status } from "@/lib/types";
import { CountPills, StatusPill } from "@/components/ui";
import { announceNav } from "@/components/Motion";

const FILTERS: { id: string; label: string; match: (s: Status) => boolean }[] = [
  { id: "all", label: "All", match: () => true },
  { id: "draft", label: "Drafts", match: (s) => s === "draft" || s === "needs_info" },
  { id: "usg", label: "With USG", match: (s) => s === "submitted" || s === "in_review" },
  { id: "done", label: "Decided", match: (s) => ["approved", "partial", "denied", "post_event_due", "closed"].includes(s) },
];

export default function Requests() {
  const { apps } = useStore();
  const club = useCurrentClub();
  const router = useRouter();
  const [f, setF] = useState("all");
  const filter = FILTERS.find((x) => x.id === f)!;
  const mine = apps.filter((a) => a.clubId === club.id && filter.match(a.status));

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">USG funding</span>
          <h1>My requests</h1>
          <p className="lede">Every funding request from {club.name}, with who has to act next.</p>
        </div>
        <Link href="/club/new" className="btn btn-primary btn-lg"><FilePlus2 />New request</Link>
      </div>
      <div className="segmented" role="group" aria-label="Filter">
        {FILTERS.map((x) => <button key={x.id} aria-pressed={f === x.id} onClick={() => setF(x.id)}>{x.label} <span className="faint">{apps.filter((a) => a.clubId === club.id && x.match(a.status)).length}</span></button>)}
      </div>
      {mine.length === 0 ? (
        <div className="card empty"><Inbox /><strong>Nothing here</strong><Link href="/club/new" className="btn btn-primary">Start a request</Link></div>
      ) : (
        <div className="card table-wrap">
          <table className="table stackable">
            <thead><tr><th>Event</th><th>Date</th><th>Board</th><th className="r">Requested</th><th>Next step</th><th>Status</th></tr></thead>
            <tbody className="appear">
              {mine.map((a) => {
                const s = score(runChecks(a, club));
                const flow = APP_FLOW[a.status];
                return (
                  <tr key={a.id} className="click" onClick={() => { announceNav(); router.push(`/club/app/${a.id}`); }}>
                    <td><Link href={`/club/app/${a.id}`} className="stack-xs"><strong>{a.event.title}</strong><span className="tiny faint">{a.event.location}{a.sample ? " · Sample" : ""}</span></Link></td>
                    <td data-label="Date" className="small num" style={{ whiteSpace: "nowrap" }}>{a.event.date ? fmtDate(a.event.date) : "No date"}</td>
                    <td data-label="Board" className="small">{BOARDS[a.event.board].short}</td>
                    <td data-label="Requested" className="r">{money(requestTotal(a))}</td>
                    <td data-label="Next step" className="small">{a.status === "draft" || a.status === "needs_info" ? <CountPills fail={s.fail} warn={s.warn} /> : <span className="muted">{flow.label}</span>}</td>
                    <td data-label="Status"><StatusPill s={a.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
