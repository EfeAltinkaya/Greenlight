"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarClock, CircleDollarSign, FilePlus2, Inbox, PartyPopper, TriangleAlert } from "lucide-react";
import { BOARDS, RULES } from "@/data/rules";
import { fmtDate, money, requestTotal, runChecks, score, todayISO } from "@/lib/engine";
import { store, useCurrentClub, useStore } from "@/lib/store";
import type { Application } from "@/lib/types";
import { CountPills, StatusPill } from "@/components/ui";

function nextWednesday(today: string) {
  const d = new Date(today + "T12:00:00Z");
  const add = (3 - d.getUTCDay() + 7) % 7;
  d.setUTCDate(d.getUTCDate() + add);
  return d.toISOString().slice(0, 10);
}

export default function ClubOverview() {
  const { clubs, apps } = useStore();
  const club = useCurrentClub();
  const router = useRouter();
  const mine = apps.filter((a) => a.clubId === club.id);
  const today = todayISO();
  const left = RULES.annualCap.limit - club.receivedThisYear;
  const wed = nextWednesday(today);

  const attention: { app: Application; text: string; tone: "fix" | "check" | "gold" }[] = [];
  for (const a of mine) {
    if (a.status === "needs_info") attention.push({ app: a, text: "USG returned it as incomplete. You have 2 business days to send the missing items.", tone: "fix" });
    else if (a.status === "draft") {
      const s = score(runChecks(a, club));
      if (s.fail) attention.push({ app: a, text: `${s.fail} item${s.fail > 1 ? "s" : ""} to fix before you can submit.`, tone: "check" });
    } else if ((a.status === "approved" || a.status === "partial") && a.event.date < today) attention.push({ app: a, text: "Post-event evaluation and final invoices are due within 3 business days of the event.", tone: "gold" });
  }

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Club desk</span>
          <h1>{club.name}</h1>
          <label className="row small muted" style={{ gap: 8 }}>
            Acting for
            <select className="select" style={{ width: "auto", padding: "5px 10px", fontSize: 13 }} value={club.id} onChange={(e) => store.setClub(e.target.value)} aria-label="Club">
              {clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
        </div>
        <Link href="/club/new" className="btn btn-primary btn-lg"><FilePlus2 />New request</Link>
      </div>

      <section className="grid cols-3">
        <div className="card card-pad stack-sm">
          <div className="row" style={{ gap: 12 }}><span className="icon-tile"><CircleDollarSign /></span><span className="muted small">USG money left this year</span></div>
          <div className="big-num">{money(left)}</div>
          <div className="meter" aria-hidden="true"><span style={{ width: `${(club.receivedThisYear / RULES.annualCap.limit) * 100}%` }} /></div>
          <span className="tiny faint">{money(club.receivedThisYear)} of the {money(RULES.annualCap.limit)} yearly maximum used</span>
        </div>
        <div className="card card-pad stack-sm">
          <div className="row" style={{ gap: 12 }}><span className="icon-tile gold"><PartyPopper /></span><span className="muted small">USG-funded events this semester</span></div>
          <div className="big-num">{club.eventsThisSemester} <span className="faint" style={{ fontSize: 18, fontWeight: 600 }}>of 4</span></div>
          <div className="row" style={{ gap: 6 }} aria-hidden="true">
            {[0, 1, 2, 3].map((i) => <span key={i} style={{ flex: 1, height: 6, borderRadius: 99, background: i < club.eventsThisSemester ? "var(--cardinal)" : "var(--line-2)" }} />)}
          </div>
          <span className="tiny faint">USG funds up to 4 events per club each semester</span>
        </div>
        <div className="card card-pad stack-sm">
          <div className="row" style={{ gap: 12 }}><span className="icon-tile dark"><CalendarClock /></span><span className="muted small">Next submission window</span></div>
          <div className="big-num" style={{ fontSize: 26 }}>{fmtDate(wed, { weekday: "long", month: "short", day: "numeric" })}</div>
          <span className="tiny faint">Applications open Wednesdays, 8:00 AM to 11:59 PM</span>
          <Link href="/club/deadlines" className="link small">Find the deadline for an event date <ArrowRight /></Link>
        </div>
      </section>

      {attention.length > 0 && (
        <section className="stack-sm">
          <h2>Needs your attention</h2>
          <div className="card">
            {attention.map(({ app, text, tone }, i) => (
              <Link key={app.id} href={`/club/app/${app.id}`} className="between" style={{ padding: "16px 20px", borderTop: i ? "1px solid var(--line-2)" : 0 }}>
                <div className="row" style={{ gap: 14, flexWrap: "nowrap" }}>
                  <span className={"icon-tile " + (tone === "gold" ? "gold" : "")} style={tone === "fix" ? { background: "var(--fix-tint)", color: "var(--fix)" } : undefined}><TriangleAlert /></span>
                  <div className="stack-xs"><strong>{app.event.title}</strong><span className="small muted">{text}</span></div>
                </div>
                <ArrowRight style={{ width: 18, height: 18, color: "var(--ink-3)", flex: "none" }} />
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="stack-sm">
        <div className="between"><h2>Requests</h2><span className="small faint">{mine.length} total</span></div>
        {mine.length === 0 ? (
          <div className="card empty">
            <Inbox />
            <strong>No requests yet</strong>
            <span className="small">Describe your next event and Greenlight builds the USG application with you.</span>
            <Link href="/club/new" className="btn btn-primary">Start a request</Link>
          </div>
        ) : (
          <div className="card table-wrap">
            <table className="table">
              <thead><tr><th>Event</th><th>Date</th><th>Board</th><th className="r">Requested</th><th>Checks</th><th>Status</th></tr></thead>
              <tbody>
                {mine.map((a) => {
                  const s = score(runChecks(a, club));
                  return (
                    <tr key={a.id} className="click" onClick={() => router.push(`/club/app/${a.id}`)}>
                      <td><Link href={`/club/app/${a.id}`} className="stack-xs"><strong>{a.event.title}</strong><span className="tiny faint">{a.event.location}{a.sample ? " · Sample" : ""}</span></Link></td>
                      <td className="small num" style={{ whiteSpace: "nowrap" }}>{a.event.date ? fmtDate(a.event.date) : "No date"}</td>
                      <td className="small">{BOARDS[a.event.board].short}</td>
                      <td className="r">{money(requestTotal(a))}</td>
                      <td>{a.status === "draft" || a.status === "needs_info" ? <CountPills fail={s.fail} warn={s.warn} /> : <span className="tiny faint">Sent</span>}</td>
                      <td><StatusPill s={a.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
