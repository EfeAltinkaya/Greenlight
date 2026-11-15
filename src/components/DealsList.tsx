"use client";
import Link from "next/link";
import { Handshake } from "lucide-react";
import { money } from "@/lib/engine";
import { useCurrentClub, useStore } from "@/lib/store";
import { useSession } from "@/lib/session";
import { DEAL_FLOW, DEAL_STEPS } from "@/lib/workflow";

export function DealsList({ as, embedded }: { as: "club" | "sponsor"; embedded?: boolean }) {
  const { deals, clubs, apps } = useStore();
  const club = useCurrentClub();
  const session = useSession();
  const org = session.user?.org;
  const list = (deals ?? []).filter((d) => (as === "club" ? d.clubId === club.id : !org || d.sponsorName === org));
  const base = as === "club" ? "/club/deals" : "/sponsor/deals";
  return (
    <>
      {!embedded && (
      <div className="page-head">
        <div>
          <span className="eyebrow">Sponsors</span>
          <h1>{as === "club" ? "Deals" : "Club requests"}</h1>
          <p className="lede">{as === "club" ? "Every sponsorship you are working on, from first request to the thank-you recap." : "Clubs that asked for your support. Each one shows whose turn it is."}</p>
        </div>
        {as === "club" && <Link href="/club/sponsors?tab=offers" className="btn btn-primary">Browse sponsor offers</Link>}
      </div>
      )}
      {list.length === 0 ? (
        <div className="card empty"><Handshake /><strong>No deals yet</strong><span className="small">{as === "club" ? "Request details on a sponsor offer to start one." : "When a club requests details on one of your offers, it appears here."}</span></div>
      ) : (
        <div className="grid cols-2 appear">
          {list.map((d) => {
            const flow = DEAL_FLOW[d.stage];
            const idx = DEAL_STEPS.indexOf(d.stage);
            const mine = flow.owner === as;
            const c = clubs.find((x) => x.id === d.clubId);
            const app = apps.find((a) => a.id === d.appId);
            return (
              <Link key={d.id} href={`${base}/${d.id}`} className="card card-pad stack-sm">
                <div className="between"><strong>{as === "club" ? d.sponsorName : c?.name ?? "Club"}</strong><span className={"pill " + (d.stage === "declined" ? "pill-fix" : mine ? "pill-gold" : "pill-note")}>{d.stage === "declined" ? "Declined" : mine ? "Your turn" : "Waiting"}</span></div>
                <span className="small muted">{d.covers} · {money(d.amount)}{app ? ` · ${app.event.title}` : ""}</span>
                <div className="track" style={{ gridTemplateColumns: "repeat(8, minmax(0,1fr))" }}>{DEAL_STEPS.map((s, i) => <div key={s} className={"track-step" + (i < idx ? " done" : i === idx ? " now" : "")}><i /></div>)}</div>
                <span className="tiny faint">{flow.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
