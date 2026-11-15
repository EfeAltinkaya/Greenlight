"use client";
import { useState } from "react";
import { Copy, ExternalLink, Landmark } from "lucide-react";
import { eligibleSources, FUNDING_SOURCES } from "@/data/fundingSources";
import { money, requestTotal, todayISO } from "@/lib/engine";
import { store, useCurrentClub, useStore } from "@/lib/store";
import type { AltRequest, Application } from "@/lib/types";
import { useToast } from "@/components/ui";

const draftFor = (a: Application, clubName: string, sourceName: string, amount: number) =>
  `Hello,\n\n${clubName} is requesting ${money(amount)} from ${sourceName} for ${a.event.title} on ${a.event.date}${a.event.location ? ` at ${a.event.location}` : ""}, for about ${a.event.attendance} students.\n\n${a.answers.description || a.event.description}\n\n${a.decision ? `USG's Funding Department ${a.decision.outcome === "denied" ? "was not able to fund this request" : `funded ${money(a.decision.amount)}`}, so we are asking for the remaining ${money(amount)}.` : ""}\n\nThe itemized budget and vendor quotes are attached.\n\nThank you,\n[Your name]\n${clubName}`;

export default function OtherFunding() {
  const { apps } = useStore();
  const club = useCurrentClub();
  const [toast, say] = useToast();
  const candidates = apps.filter((a) => a.clubId === club.id && (a.status === "denied" || a.status === "partial" || a.status === "needs_info" || a.status === "draft"));
  const [appId, setAppId] = useState("");
  const app = candidates.find((a) => a.id === appId) ?? candidates.find((a) => a.status === "denied" || a.status === "partial") ?? candidates[0] ?? null;
  const need = app ? Math.max(0, requestTotal(app) - (app.decision && app.decision.outcome !== "denied" ? app.decision.amount : 0)) : 0;
  const sources = eligibleSources(club);
  const others = FUNDING_SOURCES.filter((s) => !sources.includes(s));

  function track(sourceId: string, name: string, status: AltRequest["status"]) {
    if (!app) return;
    const list = app.altRequests ?? [];
    const existing = list.find((r) => r.sourceId === sourceId);
    const next: AltRequest = existing ? { ...existing, status, updatedAt: todayISO() } : { sourceId, status, amount: need, draft: draftFor(app, club.name, name, need), updatedAt: todayISO() };
    store.patchApp(app.id, { altRequests: existing ? list.map((r) => (r.sourceId === sourceId ? next : r)) : [...list, next] });
    say(status === "drafted" ? `Draft ready for ${name}` : `Marked as ${status}`);
  }

  return (
    <>
      {toast}
      <div className="page-head">
        <div>
          <span className="eyebrow">USG funding</span>
          <h1>Other funding</h1>
          <p className="lede">If USG says no or funds only part, these USC sources may cover the rest. Only the ones {club.name} qualifies for are listed first. Each gets a ready-to-send request built from your application.</p>
        </div>
      </div>

      {app ? (
        <section className="card card-pad between">
          <label className="row" style={{ gap: 12 }}><span className="small muted">For</span>
            <select className="select" style={{ width: "auto" }} value={app.id} onChange={(e) => setAppId(e.target.value)}>{candidates.map((a) => <option key={a.id} value={a.id}>{a.event.title} ({a.status === "denied" ? "denied by USG" : a.status === "partial" ? "partly funded" : "not yet decided"})</option>)}</select>
          </label>
          <div className="stack-xs" style={{ textAlign: "right" }}><span className="tiny faint">Still needed</span><span className="big-num" style={{ fontSize: 26 }}>{money(need)}</span></div>
        </section>
      ) : (
        <div className="card empty"><Landmark /><strong>No request needs other funding right now</strong></div>
      )}

      <section className="stack-sm">
        <h2>Sources {club.name} can apply to</h2>
        <div className="stack appear">
          {sources.map((s) => {
            const r = app?.altRequests?.find((x) => x.sourceId === s.id);
            return (
              <div key={s.id} className="card card-pad stack-sm">
                <div className="between" style={{ alignItems: "flex-start" }}>
                  <div className="stack-xs"><h3>{s.name}</h3><span className="small muted">{s.who} · {s.lead}</span></div>
                  {r && <span className={"pill " + (r.status === "awarded" ? "pill-clear" : r.status === "declined" ? "pill-fix" : "pill-gold")}>{r.status === "drafted" ? "Draft ready" : r.status === "applied" ? "Applied" : r.status === "awarded" ? `Awarded ${money(r.amount)}` : "Declined"}</span>}
                </div>
                <p className="small">{s.how}</p>
                {s.note && <p className="tiny faint">{s.note}</p>}
                {r?.draft && <textarea className="textarea email" style={{ minHeight: 180, fontSize: 13.5 }} value={r.draft} onChange={(e) => app && store.patchApp(app.id, { altRequests: (app.altRequests ?? []).map((x) => (x.sourceId === s.id ? { ...x, draft: e.target.value } : x)) })} aria-label={`Request to ${s.name}`} />}
                <div className="row">
                  <a className="btn btn-sm" href={s.url} target="_blank" rel="noreferrer"><ExternalLink />Open {s.name.split(" (")[0]}</a>
                  {app && !r && <button className="btn btn-sm btn-primary" onClick={() => track(s.id, s.name, "drafted")}>Prepare request</button>}
                  {r?.draft && <button className="btn btn-sm" onClick={async () => { try { await navigator.clipboard.writeText(r.draft); say("Copied"); } catch { say("Select the text and copy it"); } }}><Copy />Copy</button>}
                  {r && r.status !== "awarded" && <button className="btn btn-sm btn-ghost" onClick={() => track(s.id, s.name, "applied")}>Mark applied</button>}
                  {r && r.status === "applied" && <><button className="btn btn-sm btn-ghost" onClick={() => track(s.id, s.name, "awarded")}>Mark awarded</button><button className="btn btn-sm btn-ghost" onClick={() => track(s.id, s.name, "declined")}>Mark declined</button></>}
                </div>
              </div>
            );
          })}
        </div>
      </section>
      {others.length > 0 && (
        <section className="stack-sm">
          <h2>Not eligible for {club.name}</h2>
          <div className="card">{others.map((s, i) => <div key={s.id} className="between small" style={{ padding: "12px 18px", borderTop: i ? "1px solid var(--line-2)" : 0 }}><span>{s.name}</span><span className="faint">{s.who}</span></div>)}</div>
        </section>
      )}
    </>
  );
}
