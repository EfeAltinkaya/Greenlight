"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Check, Copy, Printer } from "lucide-react";
import { BOARDS } from "@/data/rules";
import { fmtDate, lookupDeadline, matchVendor, money, needsNineWeeks, nineWeekReason, requestItems, requestTotal, runChecks, score, vendorStatus } from "@/lib/engine";
import { greenlightCheckText } from "@/lib/greenlightCheck";
import { requestIdOf } from "@/lib/requestId";
import { RULES_VERSION, greenlightVerdict } from "@/lib/verdict";
import { useStore } from "@/lib/store";
import { CheckItem, LEVEL, useToast } from "@/components/ui";
import { VerdictPill } from "@/components/VerdictPill";

export default function GreenlightCheckPage() {
  const { id } = useParams<{ id: string }>();
  const { apps, clubs } = useStore();
  const app = apps.find((a) => a.id === id);
  const club = app ? clubs.find((c) => c.id === app.clubId) : null;
  const [toast, say] = useToast();
  const [copied, setCopied] = useState(false);

  if (!app || !club) {
    return (
      <div className="page-head">
        <h1>Request not found</h1>
        <Link href="/club" className="btn">Back to club desk</Link>
      </div>
    );
  }

  const checks = runChecks(app, club);
  const v = greenlightVerdict(checks);
  const sc = score(checks);
  const rid = requestIdOf(app);
  const needsNine = needsNineWeeks(app);
  const dl = lookupDeadline(app.event.date, needsNine, app.submittedAt ?? undefined);
  const text = greenlightCheckText(app, club);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      say("Greenlight Check copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      say("Could not copy. Select the text below instead.", "error");
    }
  }

  return (
    <>
      {toast}
      <div className="page-head no-print">
        <div>
          <Link href={`/club/app/${app.id}#submit`} className="btn btn-ghost btn-sm" style={{ marginBottom: 8 }}><ArrowLeft />Back to request</Link>
          <span className="eyebrow">{rid} · {club.name}</span>
          <h1>Greenlight Check</h1>
          <p className="lede">Attach or paste this into EngageSC. Every line is from the rules engine, not AI.</p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn" onClick={copy}>{copied ? <><Check />Copied</> : <><Copy />Copy text</>}</button>
          <button className="btn btn-primary" onClick={() => window.print()}><Printer />Print</button>
        </div>
      </div>

      <section className="card card-pad stack" style={{ gap: 18 }}>
        <div className="between" style={{ alignItems: "flex-start" }}>
          <div className="stack-xs">
            <span className="tiny faint">{RULES_VERSION}</span>
            <h2 style={{ fontSize: 22 }}>{app.event.title}</h2>
            <p className="small muted">{BOARDS[app.event.board].name} · {money(requestTotal(app))} requested · {rid}</p>
          </div>
          <VerdictPill id={v.id} label={v.clubLabel} />
        </div>

        <dl className="kv">
          <dt>Verdict</dt><dd><strong>{v.clubLabel}</strong>{v.fixCount ? ` (${sc.fail} to fix, ${sc.warn} to check)` : ""}</dd>
          <dt>Deadline</dt>
          <dd>
            {dl.kind === "ok"
              ? `${fmtDate(dl.deadline, { weekday: "long", month: "long", day: "numeric", year: "numeric" })} (${dl.uses === "nine" ? "9-week" : "6-week"})${dl.uses === "nine" ? `: ${nineWeekReason(app) || "travel or unlisted vendor"}` : ""}`
              : dl.kind === "blackout" ? `Blackout: ${dl.reason}` : dl.reason}
          </dd>
          <dt>Event summary</dt>
          <dd>
            <span className="tiny faint">Written by the club</span>
            <div>{app.answers.description.trim() || app.event.description.trim() || "(none yet)"}</div>
          </dd>
        </dl>

        <div className="stack-sm">
          <h3>Each rule checked</h3>
          {[...checks].sort((a, b) => "fwpi".indexOf(a.level[0]) - "fwpi".indexOf(b.level[0])).map((c) => (
            <div key={c.id} className="stack-xs">
              <CheckItem c={c} compact={false} />
              {c.section.startsWith("Greenlight") && <span className="tiny faint">Greenlight check, not a USG rule</span>}
            </div>
          ))}
        </div>

        <div className="stack-sm">
          <h3>Vendor status</h3>
          {requestItems(app).map((i) => {
            let status = "No vendor named";
            if (i.category === "food" && i.vendor) {
              const m = matchVendor(i.vendor, "food");
              status = m.kind === "listed" ? vendorStatus(m.vendor) : "Not on USG's Vendor List";
            } else if (i.vendor) {
              status = i.vendorConfirmed ? "Club confirmed approved" : "Needs confirmation";
            }
            const { Icon, word } = LEVEL[i.category === "food" && i.vendor && matchVendor(i.vendor, "food").kind === "not_listed" ? "fail" : i.vendor ? "pass" : "warn"];
            return (
              <div key={i.id} className="row small" style={{ gap: 10, flexWrap: "nowrap" }}>
                <span className={"check-ico " + (word === "Fix" ? "fail" : word === "Check" ? "warn" : "pass")} role="img" aria-label={word}><Icon strokeWidth={2.6} /></span>
                <span><strong>{i.item}</strong> · {i.vendor || "none"} · {status}</span>
              </div>
            );
          })}
        </div>

        <pre className="inset small" style={{ whiteSpace: "pre-wrap", padding: 16, maxHeight: 280, overflow: "auto" }}>{text}</pre>
      </section>
    </>
  );
}
