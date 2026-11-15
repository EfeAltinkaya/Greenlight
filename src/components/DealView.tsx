"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check, ChevronRight, Download, FileSignature, FileUp, PartyPopper, Send, Sparkles, X } from "lucide-react";
import { authFetch } from "@/lib/apiClient";
import { contractText } from "@/lib/contract";
import { downloadAgreementDocx } from "@/lib/export/agreementDocx";
import { fmtDate, money } from "@/lib/engine";
import { store, useStore } from "@/lib/store";
import { DEAL_FLOW, DEAL_STEPS } from "@/lib/workflow";
import type { Deal } from "@/lib/types";
import { Spinner, useToast } from "./ui";
import { SponsorInbox } from "./Inbox";

const SHORT: Record<string, string> = { requested: "Asked", details_sent: "Details", contract_ready: "Agreement", signed: "Signed", vendor_invoiced: "Invoice", paid: "Paid", event_done: "Event", recap_sent: "Recap" };

/** One sponsorship from first request to recap. The same screen for the club and the sponsor; each sees only their own next action. */
export function DealView({ id, as }: { id: string; as: "club" | "sponsor" }) {
  const { deals, apps, clubs } = useStore();
  const deal = (deals ?? []).find((d) => d.id === id);
  const [toast, say] = useToast();
  const [msg, setMsg] = useState("");
  const [signer, setSigner] = useState("");
  const [invAmount, setInvAmount] = useState<number | "">("");
  const [invVendor, setInvVendor] = useState("");
  const [busy, setBusy] = useState(false);
  if (!deal) return <div className="card empty"><strong>Deal not found.</strong><Link className="link" href={as === "club" ? "/club/deals" : "/sponsor/deals"}>Back <ArrowRight /></Link></div>;

  const app = apps.find((a) => a.id === deal.appId) ?? null;
  const club = clubs.find((c) => c.id === deal.clubId);
  const flow = DEAL_FLOW[deal.stage];
  const myTurn = flow.owner === as;
  const idx = DEAL_STEPS.indexOf(deal.stage);
  const move = (to: Deal["stage"], note: string, patch: Partial<Deal> = {}) => { store.moveDeal(deal.id, to, as, note, patch); say("Done. The other side has been notified"); };

  async function draftRecap() {
    setBusy(true);
    try {
      const r = await authFetch("/api/outreach-email", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ recap: true, sponsor: { id: "x", name: deal!.sponsorName, industry: "", hires: [], la: "", tie: null, tieSource: null, inKind: [] }, pkg: { title: deal!.covers, covers: deal!.covers, amount: deal!.amount, offer: deal!.deliverables }, event: app?.event ?? { title: "our event", date: "", location: "", attendance: 0, description: "" }, clubName: club?.name ?? "our club" }) });
      const j = await r.json();
      setMsg(`${j.data?.body ?? ""}`);
    } finally { setBusy(false); }
  }

  return (
    <>
      {toast}
      <div className="stack-sm">
        <nav className="crumbs"><Link href={as === "club" ? "/club/deals" : "/sponsor/deals"}>Deals</Link><ChevronRight /><span>{deal.sponsorName}</span></nav>
        <div className="page-head">
          <div>
            <h1>{as === "club" ? deal.sponsorName : club?.name ?? "Club"}</h1>
            <span className="muted">{deal.covers} · {money(deal.amount)}{app ? ` · ${app.event.title}, ${app.event.date ? fmtDate(app.event.date, { month: "long", day: "numeric" }) : ""}` : ""}</span>
          </div>
          <span className={"pill " + (deal.stage === "declined" ? "pill-fix" : myTurn ? "pill-gold" : "pill-note")}>{deal.stage === "declined" ? "Declined" : myTurn ? "Your turn" : `Waiting for the ${flow.owner === "club" ? "club" : "sponsor"}`}</span>
        </div>
      </div>

      <section className="card card-pad stack-sm">
        <div className="track" aria-label="Deal progress">
          {DEAL_STEPS.map((s, i) => <div key={s} className={"track-step" + (i < idx ? " done" : i === idx ? " now" : "")}><i />{SHORT[s]}</div>)}
        </div>
        <p className="small muted">{flow.label}. Money always goes from the sponsor to the vendor, never through the club.</p>
      </section>

      <div className="split split-wide">
        <div className="stack">
          {deal.contract && (
            <section className="card card-pad stack-sm">
              <div className="between"><h2>Agreement</h2><span className="tiny faint">{deal.contract.clubSignedBy ? `Club: ${deal.contract.clubSignedBy}` : "Club has not signed"} · {deal.contract.sponsorSignedBy ? `Sponsor: ${deal.contract.sponsorSignedBy}` : "Sponsor has not signed"}</span></div>
              <div className="contract">{deal.contract.text}</div>
              <div className="row">
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={async () => {
                    try {
                      await downloadAgreementDocx(deal, club?.name ?? "the Club", app?.event ?? null);
                      say("Agreement downloaded as Word (.docx)");
                    } catch {
                      say("Could not build the Word file", "error");
                    }
                  }}
                >
                  <Download />Download .docx
                </button>
              </div>
              <p className="tiny faint">A standard template, not legal advice. Campus Activities approves in-kind donations.</p>
            </section>
          )}
          {deal.invoice && (
            <section className="card card-pad stack-xs">
              <h2>Vendor invoice</h2>
              <span className="small">{deal.invoice.vendor} · {money(deal.invoice.amount)} · {deal.invoice.fileName}</span>
              <span className="tiny faint">Uploaded {fmtDate(deal.invoice.uploadedAt, { month: "short", day: "numeric" })}. The sponsor pays this vendor directly.</span>
            </section>
          )}
          {deal.recap && (
            <section className="card card-pad stack-xs"><h2>Recap sent</h2><p className="small email">{deal.recap}</p></section>
          )}
          {as === "club" && <SponsorInbox email={deal.sponsorEmail} name={deal.sponsorName} />}
          <section className="card card-pad stack-sm">
            <h2>History</h2>
            {[...deal.history].reverse().map((h, i) => (
              <div key={i} className="row small" style={{ gap: 14, padding: "8px 0", borderTop: i ? "1px solid var(--line-2)" : 0, flexWrap: "nowrap", alignItems: "flex-start" }}>
                <span className="faint num" style={{ width: 60, flex: "none" }}>{fmtDate(h.at, { month: "short", day: "numeric" })}</span>
                <span><strong>{h.by === "club" ? "Club" : h.by === "sponsor" ? "Sponsor" : "Greenlight"}</strong> · {h.note}</span>
              </div>
            ))}
          </section>
        </div>

        <aside className="sticky stack">
          <div className="card card-pad stack-sm">
            <h2>{myTurn ? "Your next step" : "Next step"}</h2>
            {!myTurn && deal.stage !== "recap_sent" && deal.stage !== "declined" && <p className="small muted">Waiting for the {flow.owner === "club" ? "club" : "sponsor"}. You will get an update and an email when they act.</p>}

            {as === "sponsor" && deal.stage === "requested" && (
              <>
                <p className="small muted">{club?.name} asked: {deal.message}</p>
                <label className="field"><span className="lbl">Your reply with details</span><textarea className="textarea" value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="What you can cover, any conditions, who to contact" /></label>
                <div className="row"><button className="btn btn-primary" disabled={!msg.trim()} onClick={() => move("details_sent", msg.trim())}><Send />Send details</button><button className="btn btn-ghost" onClick={() => move("declined", "Not this time")}><X />Decline</button></div>
              </>
            )}
            {as === "club" && deal.stage === "details_sent" && (
              <>
                <p className="small muted">{deal.sponsorName} replied: {deal.history.at(-1)?.note}</p>
                <label className="field"><span className="lbl">Sign for the club (full name)</span><input className="input" value={signer} onChange={(e) => setSigner(e.target.value)} placeholder="Your name" /></label>
                <button className="btn btn-primary" disabled={!signer.trim()} onClick={() => move("contract_ready", "Generated the standard agreement and signed for the club", { contract: { text: contractText(deal, club?.name ?? "the Club", app?.event ?? null), clubSignedBy: signer.trim(), clubSignedAt: new Date().toISOString().slice(0, 10), sponsorSignedBy: "", sponsorSignedAt: "" } })}><FileSignature />Create agreement and sign</button>
                <button className="btn btn-ghost" onClick={() => move("declined", "The club decided not to go ahead")}><X />Not interested</button>
              </>
            )}
            {as === "sponsor" && deal.stage === "contract_ready" && (
              <>
                <label className="field"><span className="lbl">Sign for {deal.sponsorName} (full name)</span><input className="input" value={signer} onChange={(e) => setSigner(e.target.value)} /></label>
                <button className="btn btn-primary" disabled={!signer.trim()} onClick={() => move("signed", "Signed the agreement", { contract: { ...deal.contract!, sponsorSignedBy: signer.trim(), sponsorSignedAt: new Date().toISOString().slice(0, 10) } })}><FileSignature />Sign agreement</button>
              </>
            )}
            {as === "club" && deal.stage === "signed" && (
              <>
                <p className="small muted">Get the invoice from the vendor and send it here. The sponsor pays the vendor directly.</p>
                <div className="grid cols-2"><label className="field"><span className="lbl">Vendor</span><input className="input" value={invVendor} onChange={(e) => setInvVendor(e.target.value)} /></label><label className="field"><span className="lbl">Amount</span><input className="input" type="number" value={invAmount} onChange={(e) => setInvAmount(e.target.value === "" ? "" : Number(e.target.value))} /></label></div>
                <label className="drop">
                  <FileUp /><span className="small" style={{ flex: 1 }}>Upload the vendor invoice (PDF)</span><span className="btn btn-sm">Choose file</span>
                  <input type="file" accept="application/pdf,image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; move("vendor_invoiced", `Uploaded ${f.name} from ${invVendor || "the vendor"}`, { invoice: { fileName: f.name, amount: Number(invAmount) || deal.amount, vendor: invVendor || "Vendor", uploadedAt: new Date().toISOString().slice(0, 10) } }); }} />
                </label>
              </>
            )}
            {as === "sponsor" && deal.stage === "vendor_invoiced" && (
              <button className="btn btn-primary" onClick={() => move("paid", `Paid ${deal.invoice?.vendor ?? "the vendor"} ${money(deal.invoice?.amount ?? deal.amount)}`)}><Check />I paid the vendor</button>
            )}
            {as === "club" && deal.stage === "paid" && <button className="btn btn-primary" onClick={() => move("event_done", "The event took place")}><PartyPopper />The event happened</button>}
            {as === "club" && deal.stage === "event_done" && (
              <>
                <button className="btn" onClick={draftRecap} disabled={busy}>{busy ? <><Spinner />Writing</> : <><Sparkles />Draft the recap</>}</button>
                <label className="field"><span className="lbl">Recap for {deal.sponsorName}</span><textarea className="textarea" style={{ minHeight: 180 }} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Attendance, photos, what their support made possible" /></label>
                <button className="btn btn-primary" disabled={!msg.trim()} onClick={() => move("recap_sent", "Sent the post-event recap", { recap: msg.trim() })}><Send />Send recap</button>
              </>
            )}
            {deal.stage === "recap_sent" && <p className="small" style={{ color: "var(--clear)" }}>Complete. The sponsor has the recap, which is the best reason for them to come back next year.</p>}
            {deal.stage === "declined" && <p className="small muted">This deal was declined.</p>}
          </div>
        </aside>
      </div>
    </>
  );
}
