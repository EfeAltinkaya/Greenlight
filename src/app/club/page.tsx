"use client";
import Link from "next/link";
import { announceNav } from "@/components/Motion";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarClock, CircleDollarSign, FilePlus2, Handshake, Inbox, Landmark, PartyPopper, TriangleAlert } from "lucide-react";
import { BOARDS, RULES } from "@/data/rules";
import { fmtDate, money, requestTotal, runChecks, score, todayISO } from "@/lib/engine";
import { store, useCurrentClub, useStore } from "@/lib/store";
import type { Application } from "@/lib/types";
import { CountPills, StatusPill, stepOf } from "@/components/ui";
import { useSession } from "@/lib/session";
import { APP_FLOW } from "@/lib/workflow";

function nextWednesday(today: string) {
  const d = new Date(today + "T12:00:00Z");
  const add = (3 - d.getUTCDay() + 7) % 7;
  d.setUTCDate(d.getUTCDate() + add);
  return d.toISOString().slice(0, 10);
}

function continueHref(a: Application, clubId: string) {
  if (a.status === "draft" || a.status === "needs_info") {
    const club = store.get().clubs.find((c) => c.id === clubId);
    if (club) {
      const fail = runChecks(a, club).find((c) => c.level === "fail");
      if (fail) return `/club/app/${a.id}#${stepOf(fail)}`;
    }
    if (!a.answers.description.trim()) return `/club/app/${a.id}#answers`;
    return `/club/app/${a.id}#event`;
  }
  if (a.status === "post_event_due") return `/club/app/${a.id}#status`;
  if (a.status === "denied" || a.status === "partial") return `/club/funding?app=${a.id}`;
  if (["submitted", "in_review", "approved"].includes(a.status)) return `/club/app/${a.id}#status`;
  return `/club/app/${a.id}`;
}

export default function ClubOverview() {
  const { clubs, apps, outreach, deals } = useStore();
  const club = useCurrentClub();
  const router = useRouter();
  const session = useSession();
  const mine = apps.filter((a) => a.clubId === club.id);
  const today = todayISO();
  const left = RULES.annualCap.limit - club.receivedThisYear;
  const wed = nextWednesday(today);

  type Card = { key: string; href: string; title: string; text: string; tone: "fail" | "check" | "gold"; owner: string };
  const attention: Card[] = [];
  const push = (key: string, href: string, title: string, text: string, tone: Card["tone"], owner: string) =>
    attention.push({ key, href, title, text, tone, owner });

  for (const a of mine) {
    const owner = APP_FLOW[a.status]?.owner ?? "club";
    if (a.status === "needs_info") push(a.id + "-info", continueHref(a, club.id), a.event.title, "USG returned it as incomplete. You have 2 business days to send the missing items.", "fail", "Your turn");
    else if (a.status === "draft") {
      const s = score(runChecks(a, club));
      push(a.id + "-draft", continueHref(a, club.id), a.event.title, s.fail ? `${s.fail} item${s.fail > 1 ? "s" : ""} to fix before you can submit.` : "Continue drafting this request.", s.fail ? "check" : "gold", "Your turn");
    } else if (a.status === "post_event_due") push(a.id + "-pe", continueHref(a, club.id), a.event.title, "Post-event evaluation and final invoices are due within 3 business days.", "gold", "Your turn");
    else if (a.status === "denied" || a.status === "partial") {
      const gap = Math.max(0, requestTotal(a) - (a.decision && a.decision.outcome !== "denied" ? a.decision.amount : 0));
      if (gap > 0) push(a.id + "-fund", `/club/funding?app=${a.id}`, a.event.title, `${money(gap)} still needed: other USC sources and sponsors can cover the gap.`, "gold", "Cover the gap");
    } else if (owner === "usg") push(a.id + "-wait", continueHref(a, club.id), a.event.title, APP_FLOW[a.status].label + ".", "check", "Waiting on USG");
  }

  const followUps = (outreach ?? []).filter((o) => o.clubId === club.id && o.followUp && o.followUp <= today && (o.status === "emailed" || o.status === "replied"));
  if (followUps.length) push("followups", "/club/sponsors?tab=outreach", `Follow up with ${followUps.length} sponsor${followUps.length > 1 ? "s" : ""}`, "It has been a few days since your last email.", "gold", "Your turn");

  const clubDealTurn = (deals ?? []).filter((d) => {
    if (d.clubId !== club.id || d.stage === "declined" || d.stage === "recap_sent") return false;
    return (["details_sent", "signed", "paid", "event_done"] as const).includes(d.stage as "details_sent");
  });
  if (clubDealTurn.length) push("deals", "/club/sponsors?tab=deals", `${clubDealTurn.length} sponsor deal${clubDealTurn.length > 1 ? "s" : ""} need you`, "Advance the agreement, invoice, or recap.", "gold", "Your turn");

  // Prefer "your turn" first
  attention.sort((a, b) => (a.owner === "Your turn" ? 0 : 1) - (b.owner === "Your turn" ? 0 : 1));

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Club desk</span>
          <h1>{club.name}</h1>
          {session.user ? (
            <span className="small muted">{session.user.joinCode ? <>Teammates join with code <strong className="code">{session.user.joinCode}</strong></> : "Signed in as " + session.user.email}</span>
          ) : (
          <label className="row small muted" style={{ gap: 8 }}>
            Acting for
            <select className="select" style={{ width: "auto", padding: "5px 10px", fontSize: 13 }} value={club.id} onChange={(e) => store.setClub(e.target.value)} aria-label="Club">
              {clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          )}
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
          <span className="tiny faint">Applications are due Wednesdays at 11:59 PM</span>
          <Link href="/club/deadlines" className="link small">Find the deadline for an event date <ArrowRight /></Link>
        </div>
      </section>

      <section className="stack-sm">
        <div className="between"><h2>Continue</h2><span className="small faint">{attention.length ? `${attention.filter((a) => a.owner === "Your turn").length} need you` : "You're caught up"}</span></div>
        {attention.length === 0 ? (
          <div className="card empty">
            <Inbox />
            <strong>Nothing waiting on you</strong>
            <span className="small">Start a request, or check Updates if USG or a sponsor replies.</span>
            <div className="row">
              <Link href="/club/new" className="btn btn-primary">Start a request</Link>
              <Link href="/club/sponsors" className="btn"><Handshake />Sponsors</Link>
              <Link href="/club/funding" className="btn"><Landmark />Other funding</Link>
            </div>
          </div>
        ) : (
          <div className="card">
            {attention.map(({ key, href, title, text, tone, owner }, i) => (
              <Link key={key} href={href} className="between" style={{ padding: "16px 20px", borderTop: i ? "1px solid var(--line-2)" : 0 }}>
                <div className="row" style={{ gap: 14, flexWrap: "nowrap" }}>
                  <span className={"icon-tile " + (tone === "gold" ? "gold" : "")} style={tone === "fail" ? { background: "var(--fail-tint)", color: "var(--fail)" } : undefined}><TriangleAlert /></span>
                  <div className="stack-xs">
                    <span className="tiny faint">{owner}</span>
                    <strong>{title}</strong>
                    <span className="small muted">{text}</span>
                  </div>
                </div>
                <ArrowRight style={{ width: 18, height: 18, color: "var(--ink-3)", flex: "none" }} />
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="stack-sm">
        <div className="between"><h2>All requests</h2><span className="small faint">{mine.length} total</span></div>
        {mine.length === 0 ? (
          <div className="card empty">
            <Inbox />
            <strong>No requests yet</strong>
            <span className="small">Describe your next event and Greenlight builds the USG application with you.</span>
            <Link href="/club/new" className="btn btn-primary">Start a request</Link>
          </div>
        ) : (
          <div className="card table-wrap">
            <table className="table stackable">
              <thead><tr><th>Event</th><th>Date</th><th>Board</th><th className="r">Requested</th><th>Checks</th><th>Status</th></tr></thead>
              <tbody>
                {mine.map((a) => {
                  const s = score(runChecks(a, club));
                  return (
                    <tr key={a.id} className="click" onClick={() => { announceNav(); router.push(continueHref(a, club.id)); }}>
                      <td><Link href={continueHref(a, club.id)} className="stack-xs"><strong>{a.event.title}</strong><span className="tiny faint">{a.event.location}{a.sample ? " · Sample" : ""}</span></Link></td>
                      <td data-label="Date" className="small num" style={{ whiteSpace: "nowrap" }}>{a.event.date ? fmtDate(a.event.date) : "No date"}</td>
                      <td data-label="Board" className="small">{BOARDS[a.event.board].short}</td>
                      <td data-label="Requested" className="r">{money(requestTotal(a))}</td>
                      <td data-label="Checks">{a.status === "draft" || a.status === "needs_info" ? <CountPills fail={s.fail} warn={s.warn} /> : <span className="tiny faint">Sent</span>}</td>
                      <td data-label="Status"><StatusPill s={a.status} /></td>
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
