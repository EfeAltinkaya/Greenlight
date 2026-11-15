"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CalendarRange, Check, Send, Store } from "lucide-react";
import { fmtDate, money, sponsorAsks, todayISO } from "@/lib/engine";
import { newId, store, useCurrentClub, useStore } from "@/lib/store";
import type { Deal, Offer } from "@/lib/types";
import { Reveal } from "@/components/Motion";
import { useToast } from "@/components/ui";

/** How well an offer fits one of the club's events: date inside the window, matching themes, matching majors. */
function fit(o: Offer, ev: { date: string; type: string; title: string; description: string } | null, majors: string[]) {
  const reasons: string[] = [];
  let s = 0;
  if (ev?.date && ev.date >= o.windowStart && ev.date <= o.windowEnd) { s += 40; reasons.push("Your event date is in their window"); }
  const words = `${ev?.type ?? ""} ${ev?.title ?? ""} ${ev?.description ?? ""}`.toLowerCase();
  const themes = o.themes.filter((t) => words.includes(t.toLowerCase()));
  if (themes.length) { s += 35; reasons.push(`Matches ${themes.join(", ")}`); }
  const m = o.majors.filter((x) => majors.includes(x));
  if (m.length) { s += 25; reasons.push(`Wants ${m.slice(0, 2).join(" and ")} students`); }
  return { s, reasons };
}

/** Offers list embedded under Sponsors > Offers (no duplicate page chrome). */
export function ClubOffersPanel() {
  const { offers, apps, deals, audience } = useStore();
  const club = useCurrentClub();
  const router = useRouter();
  const [toast, say] = useToast();
  const mine = apps.filter((a) => a.clubId === club.id && a.event.date >= todayISO());
  const [appId, setAppId] = useState<string>("");
  const target = mine.find((a) => a.id === appId) ?? mine[0] ?? null;
  const majors = audience?.[club.id] ?? [];
  const ranked = (offers ?? []).map((o) => ({ o, ...fit(o, target?.event ?? null, majors) })).sort((a, b) => b.s - a.s);
  const [asking, setAsking] = useState<string | null>(null);
  const asks = target ? sponsorAsks(target) : [];
  const [covers, setCovers] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [message, setMessage] = useState("");

  function request(o: Offer) {
    const c = covers || asks[0]?.label || o.gives;
    const a = Number(amount) || Math.min(o.maxAmount, asks[0]?.amount ?? o.maxAmount);
    const d: Deal = {
      id: "d" + newId(), offerId: o.id, clubId: club.id, appId: target?.id ?? null, sponsorName: o.sponsorName, sponsorEmail: o.sponsorEmail,
      stage: "requested", amount: a, covers: c, deliverables: o.asks, message: message || `We would like your support with ${c.toLowerCase()} for ${target?.event.title ?? "our event"}.`,
      contract: null, invoice: null, recap: "", history: [{ at: todayISO(), stage: "requested", note: `Asked about ${c} (${money(a)})`, by: "club" }],
    };
    store.addDeal(d, { id: newId(), at: new Date().toISOString(), to: "sponsor", clubId: club.id, title: `${club.name} asked about "${o.title}"`, body: d.message, href: `/sponsor/deals/${d.id}`, read: false });
    say(`Request sent to ${o.sponsorName}`);
    router.push(`/club/deals/${d.id}`);
  }

  return (
    <>
      {toast}
      {mine.length > 0 && (
        <label className="card card-pad row" style={{ gap: 12 }}>
          <span className="small muted">Matching offers to</span>
          <select className="select" style={{ width: "auto" }} value={target?.id} onChange={(e) => setAppId(e.target.value)}>{mine.map((a) => <option key={a.id} value={a.id}>{a.event.title} · {a.event.date ? fmtDate(a.event.date) : "no date"}</option>)}</select>
        </label>
      )}

      {ranked.length === 0 ? (
        <div className="card empty"><Store /><strong>No offers posted yet</strong><span className="small">Sponsors post offers from their own Greenlight account.</span></div>
      ) : (
        <div className="stack appear">
          {ranked.map(({ o, s, reasons }) => {
            const already = (deals ?? []).some((d) => d.offerId === o.id && d.clubId === club.id && d.stage !== "declined");
            return (
              <div key={o.id} className="card card-pad stack-sm">
                <div className="between" style={{ alignItems: "flex-start" }}>
                  <div className="stack-xs">
                    <span className="tiny faint">{o.sponsorName}</span>
                    <h2>{o.title}</h2>
                    <span className="small muted row" style={{ gap: 6 }}><CalendarRange style={{ width: 15, height: 15 }} />{fmtDate(o.windowStart, { month: "short", day: "numeric" })} to {fmtDate(o.windowEnd, { month: "short", day: "numeric", year: "numeric" })} · up to {money(o.maxAmount)}</span>
                  </div>
                  <span className={"pill " + (s >= 60 ? "pill-clear" : s >= 35 ? "pill-gold" : "")}>{s >= 60 ? "Strong fit" : s >= 35 ? "Possible fit" : "Weak fit"}</span>
                </div>
                <div className="grid cols-2" style={{ gap: 12 }}>
                  <div className="inset stack-xs" style={{ padding: 12 }}><span className="tiny faint">They give</span><span className="small">{o.gives}</span></div>
                  <div className="inset stack-xs" style={{ padding: 12 }}><span className="tiny faint">They ask for</span><span className="small">{o.asks.join(" · ")}</span></div>
                </div>
                <div className="row" style={{ gap: 6 }}>{reasons.map((r) => <span key={r} className="pill">{r}</span>)}{o.themes.map((t) => <span key={t} className="tiny faint">#{t}</span>)}</div>
                {already ? (
                  <Link href="/club/sponsors?tab=deals" className="pill pill-clear" style={{ justifySelf: "start" }}><Check />Request sent. Track it in Deals</Link>
                ) : asking === o.id ? (
                  <Reveal k={o.id} gap={10}>
                    <div className="grid cols-2">
                      <label className="field"><span className="lbl">What should they cover?</span>
                        {asks.length ? <select className="select" value={covers} onChange={(e) => { setCovers(e.target.value); setAmount(asks.find((x) => x.label === e.target.value)?.amount ?? ""); }}><option value="">{asks[0].label}</option>{asks.slice(1).map((x) => <option key={x.itemId} value={x.label}>{x.label}</option>)}</select> : <input className="input" value={covers} onChange={(e) => setCovers(e.target.value)} placeholder="Food, prizes, lighting…" />}
                      </label>
                      <label className="field"><span className="lbl">Amount</span><input className="input" type="number" value={amount} placeholder={String(Math.min(o.maxAmount, asks[0]?.amount ?? o.maxAmount))} onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))} /></label>
                    </div>
                    <label className="field"><span className="lbl">Message</span><textarea className="textarea" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="A sentence or two about the event and why it fits" /></label>
                    <div className="row"><button className="btn btn-primary" onClick={() => request(o)}><Send />Request details</button><button className="btn btn-ghost" onClick={() => setAsking(null)}>Cancel</button></div>
                  </Reveal>
                ) : (
                  <button className="btn btn-primary" style={{ justifySelf: "start" }} onClick={() => { setAsking(o.id); setCovers(""); setAmount(""); setMessage(""); }}>Request details</button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
