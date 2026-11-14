"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { BOARDS, RULES, type BoardId } from "@/data/rules";
import { budgetCsv, documentList, fmtDate, lookupDeadline, money, requestItems, requestTotal, runChecks, score, sponsorAsks } from "@/lib/engine";
import { store, useStore } from "@/lib/store";
import type { Application, Check, EventInfo, LineItem } from "@/lib/types";
import { BudgetTable } from "@/components/BudgetTable";
import { CheckRow, Signal, Spinner, StatusChip, overall, useToast } from "@/components/ui";
import { SponsorPanel } from "@/components/SponsorPanel";

export default function Workspace() {
  const { id } = useParams<{ id: string }>();
  const { apps, clubs } = useStore();
  const app = apps.find((a) => a.id === id);
  const club = clubs.find((c) => c.id === app?.clubId);
  const checks = useMemo(() => (app && club ? runChecks(app, club) : []), [app, club]);
  const [toast, say] = useToast();
  const [drafting, setDrafting] = useState(false);

  if (!app || !club) {
    return (
      <main className="page">
        <div className="empty">This application is not on this device. <Link href="/club">Back to your applications</Link></div>
      </main>
    );
  }

  const locked = app.status !== "draft" && app.status !== "needs_info";
  const s = score(checks);
  const state = overall(checks);
  const patch = (p: Partial<Application>) => store.patchApp(app.id, p);
  const setEvent = (p: Partial<EventInfo>) => patch({ event: { ...app.event, ...p } });
  const setItems = (items: LineItem[]) => patch({ items });
  const needsNine = app.event.travel || app.items.some((i) => !i.toSponsor && i.category === "food" && checks.some((c) => c.itemId === i.id && c.ruleId === "vendor-list" && c.level === "fail"));
  const dl = app.event.date ? lookupDeadline(app.event.date, needsNine) : null;
  const docs = documentList(app);

  function fix(c: Check) {
    if (!c.fix) return;
    if (c.fix.action === "to-sponsor" && c.itemId) {
      setItems(app!.items.map((i) => (i.id === c.itemId ? { ...i, toSponsor: true } : i)));
      say("Moved to the sponsor list");
    }
    if (c.fix.action === "cap-food") {
      const food = requestItems(app!).filter((i) => i.category === "food");
      const total = food.reduce((s, i) => s + i.total, 0);
      const max = RULES.foodPerPerson.limit * app!.event.attendance;
      const extra = Math.round((total - max) * 100) / 100;
      const ratio = max / total;
      const capped = app!.items.map((i) => (food.some((f) => f.id === i.id) ? { ...i, total: Math.round(i.total * ratio * 100) / 100, unitPrice: Math.round((i.total * ratio * 100) / Math.max(i.quantity, 1)) / 100, estimate: false } : i));
      capped.push({ id: "spill-" + Date.now(), item: "Catering above $35 per person", vendor: food[0]?.vendor ?? "", link: "", justification: "Difference between the full catering cost and USG's limit", quantity: 1, unitPrice: extra, total: extra, orderBy: "", category: "food", estimate: false, toSponsor: true });
      setItems(capped);
      say(`Food capped at ${money(max)}; ${money(extra)} moved to sponsors`);
    }
  }

  async function attachQuote(itemId: string, file: File) {
    const fd = new FormData();
    fd.append("file", file);
    const r = await fetch("/api/quote", { method: "POST", body: fd });
    const j = await r.json();
    if (!r.ok) return say(j.error ?? "Could not read that file.");
    const line = app!.items.find((i) => i.id === itemId)!;
    const total: number | null = j.data.total;
    const matches = total != null && Math.abs(total - line.total) <= Math.max(1, line.total * 0.01);
    const note = total == null ? "No total found on the quote." : matches ? `Quote total ${money(total)} matches the budget line.` : `Quote total ${money(total)} vs budget ${money(line.total)}. Update the line or get a new quote.`;
    setItems(app!.items.map((i) => (i.id === itemId ? { ...i, quote: { fileName: file.name, vendor: j.data.vendor, total, matches, note } } : i)));
    patch({ docs: { ...app!.docs, quotes: true } });
    say(matches ? "Quote matches the budget" : "Quote read, but the total differs");
  }

  async function draft() {
    setDrafting(true);
    try {
      const r = await fetch("/api/answers", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ app, clubName: club!.name }) });
      const j = await r.json();
      patch({ answers: j.data });
      say(j.offline ? "Drafted with the offline template" : "Answers drafted. Edit them before you submit.");
    } finally {
      setDrafting(false);
    }
  }

  function submit() {
    store.patchApp(app!.id, { submittedAt: new Date().toISOString().slice(0, 10) });
    store.setStatus(app!.id, "submitted", app!.status === "needs_info" ? "Resubmitted with the missing items" : "Submitted to USG");
    say("Submitted to the USG queue");
  }

  function downloadCsv() {
    const blob = new Blob([budgetCsv(app!)], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `RSO_${club!.name.replace(/\W+/g, "")}_BudgetProposal.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const blockers = checks.filter((c) => c.level === "fail");
  const answersReady = app.answers.description.trim() && app.answers.missionFit.trim();

  return (
    <main className="page">
      {toast}
      <div className="row small" style={{ marginBottom: 14 }}>
        <Link href="/club" className="faint">Applications</Link>
        <span className="faint">/</span>
        <span>{app.event.title}</span>
        {app.sample && <span className="sample">Sample</span>}
      </div>

      <header className="between" style={{ marginBottom: 24, alignItems: "flex-start" }}>
        <div className="row" style={{ gap: 18, alignItems: "flex-start" }}>
          <Signal state={locked ? "off" : state} size="lg" />
          <div className="stack-sm">
            <h1>{app.event.title}</h1>
            <div className="row small muted">
              <span>{club.name}</span><span>·</span>
              <span className="mono">{app.event.date ? fmtDate(app.event.date, { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : "No date"}</span><span>·</span>
              <span>{app.event.location || "No location"}</span>
            </div>
          </div>
        </div>
        <div className="stack-sm" style={{ justifyItems: "end" }}>
          <StatusChip s={app.status} />
          {!locked && (
            <span className="small muted">{s.fail ? `${s.fail} to fix` : "Nothing blocking"}{s.warn ? `, ${s.warn} to check` : ""}</span>
          )}
        </div>
      </header>

      <div className="grid-2">
        <div className="stack" style={{ gap: 28 }}>
          {app.decision && <DecisionCard app={app} />}

          {dl && !locked && (
            <section aria-label="Deadline">
              {dl.kind === "ok" ? (
                <div className={"ticket" + (dl.passed ? " late" : "")}>
                  <div>
                    <div className="days">{dl.passed ? `Passed ${-dl.daysLeft} days ago` : dl.daysLeft === 0 ? "Due today" : `${dl.daysLeft} days left`}</div>
                    <div className="when">{fmtDate(dl.deadline, { weekday: "short", month: "short", day: "numeric" })}</div>
                  </div>
                  <div className="sub">
                    {dl.passed ? "This deadline has passed. " : "Last Wednesday to submit, 11:59 PM. "}
                    {dl.uses === "nine" ? "9-week deadline because of travel or a vendor not on USG's list." : "6-week deadline for approved vendors."}
                    {dl.cliff && (
                      <div style={{ marginTop: 6, color: "#eaf2ec" }}>
                        Moving the event to the week of {fmtDate(dl.cliff.weekStart, { month: "short", day: "numeric" })} pushes the deadline to {fmtDate(dl.cliff.deadline)}, {dl.cliff.gainDays} more days.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="ticket late"><div className="when" style={{ fontSize: 24 }}>No USG deadline</div><div className="sub">{dl.reason}</div></div>
              )}
            </section>
          )}

          <section className="section">
            <div className="section-head"><h2>Event</h2><span className="label">From your description</span></div>
            <div className="sheet sheet-pad" style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
              <label className="field"><span>Title</span><input id="ev-title" className="input" disabled={locked} value={app.event.title} onChange={(e) => setEvent({ title: e.target.value })} /></label>
              <label className="field"><span>Date</span><input id="ev-date" className="input mono" type="date" disabled={locked} value={app.event.date} onChange={(e) => setEvent({ date: e.target.value })} /></label>
              <label className="field"><span>Location</span><input id="ev-loc" className="input" disabled={locked} value={app.event.location} onChange={(e) => setEvent({ location: e.target.value })} /></label>
              <label className="field"><span>Expected attendance</span><input id="ev-att" className="input mono" type="number" min={1} disabled={locked} value={app.event.attendance} onChange={(e) => setEvent({ attendance: Number(e.target.value) })} /></label>
              <label className="field" style={{ gridColumn: "1 / -1" }}>
                <span>Funding board</span>
                <select id="ev-board" className="select" disabled={locked} value={app.event.board} onChange={(e) => setEvent({ board: e.target.value as BoardId })}>
                  {(Object.keys(BOARDS) as BoardId[]).map((b) => <option key={b} value={b}>{BOARDS[b].name}</option>)}
                </select>
                <span className="small muted" style={{ fontWeight: 400 }}>{app.event.boardReason}</span>
              </label>
              <div className="row" style={{ gridColumn: "1 / -1", gap: 18 }}>
                {([
                  ["onCampus", "On campus"],
                  ["openToAll", "Open to all students"],
                  ["food", "Food served"],
                  ["travel", "Travel"],
                  ["ticketed", "Ticket sales"],
                ] as const).map(([k, label]) => (
                  <label key={k} className="row small" style={{ gap: 6 }}>
                    <input id={"ev-" + k} type="checkbox" disabled={locked} checked={app.event[k]} onChange={(e) => setEvent({ [k]: e.target.checked } as Partial<EventInfo>)} /> {label}
                  </label>
                ))}
              </div>
            </div>
          </section>

          <section className="section">
            <div className="section-head">
              <h2>Budget</h2>
              <span className="label">USG budget sheet columns</span>
            </div>
            <BudgetTable items={app.items} checks={checks} editable={!locked} onChange={setItems} onQuote={attachQuote} />
            {!locked && (
              <button className="btn sm" style={{ justifySelf: "start" }} onClick={() => setItems([...app.items, { id: "n" + Date.now(), item: "New item", vendor: "", link: "", justification: "", quantity: 1, unitPrice: 0, total: 0, orderBy: "", category: "supplies", estimate: true, toSponsor: false }])}>Add a line</button>
            )}
          </section>

          <section className="section">
            <div className="section-head"><h2>Documents</h2><span className="label">{docs.filter((d) => app.docs[d.key]).length} of {docs.length} ready</span></div>
            <div className="sheet sheet-pad stack-sm">
              <label className="field" style={{ maxWidth: 260 }}>
                <span>UEPA number</span>
                <input id="uepa" className="input mono" placeholder="A12345" disabled={locked} value={app.uepa} onChange={(e) => patch({ uepa: e.target.value.trim().toUpperCase() })} />
              </label>
              <hr className="divider" style={{ margin: "8px 0" }} />
              {docs.map((d) => (
                <label key={d.key} className="row" style={{ alignItems: "flex-start", gap: 10, padding: "6px 0" }}>
                  <input id={"doc-" + d.key} type="checkbox" disabled={locked} checked={Boolean(app.docs[d.key])} onChange={(e) => patch({ docs: { ...app.docs, [d.key]: e.target.checked } })} style={{ marginTop: 4 }} />
                  <span className="stack-sm" style={{ gap: 2 }}>
                    <span style={{ fontWeight: 600 }}>{d.label}</span>
                    <span className="small faint">{d.why}</span>
                  </span>
                </label>
              ))}
            </div>
          </section>

          <section className="section">
            <div className="section-head">
              <h2>Form answers</h2>
              {!locked && (
                <button className="btn sm" onClick={draft} disabled={drafting}>{drafting ? <Spinner /> : null} {app.answers.description ? "Redraft with AI" : "Draft with AI"}</button>
              )}
            </div>
            <div className="sheet sheet-pad stack">
              {([
                ["description", "Description of event"],
                ["missionFit", "How does the event align with your mission/vision/goals?"],
                ["otherSources", "List of other funding sources"],
              ] as const).map(([k, label]) => (
                <label key={k} className="field">
                  <span>{label}</span>
                  <textarea id={"ans-" + k} className="textarea" disabled={locked} value={app.answers[k]} placeholder={k === "otherSources" ? "N/A" : "Draft with AI, then edit"} onChange={(e) => patch({ answers: { ...app.answers, [k]: e.target.value } })} />
                </label>
              ))}
            </div>
          </section>

          {!locked && (
            <section className="sheet sheet-pad stack-sm">
              <div className="between">
                <div className="stack-sm" style={{ gap: 2 }}>
                  <h2>Send to USG</h2>
                  <span className="small muted">
                    {blockers.length ? `Fix ${blockers.length} item${blockers.length > 1 ? "s" : ""} marked red first.` : !answersReady ? "Fill in the form answers first." : `Requesting ${money(requestTotal(app))} from the ${BOARDS[app.event.board].name}.`}
                  </span>
                </div>
                <div className="row">
                  <button className="btn" onClick={downloadCsv}>Download budget sheet</button>
                  <button className="btn primary" disabled={blockers.length > 0 || !answersReady} onClick={submit}>Submit to USG</button>
                </div>
              </div>
              <p className="small faint" style={{ margin: 0 }}>You submit; Greenlight never does. Traveler details and payments stay in EngageSC.</p>
            </section>
          )}

          {(app.items.some((i) => i.toSponsor) || app.decision) && <SponsorPanel app={app} club={club} asks={sponsorAsks(app)} />}

          <section className="section">
            <h2>History</h2>
            <div className="timeline">
              {[...app.history].reverse().map((h, i) => (
                <div key={i}><span className="mono small faint">{h.at}</span><span><StatusChip s={h.status} /> <span className="small">{h.note}</span></span></div>
              ))}
            </div>
          </section>
        </div>

        <aside className="sticky stack-sm" aria-label="Rule check">
          <div className="sheet sheet-pad">
            <div className="between" style={{ marginBottom: 6 }}>
              <h2>Rule check</h2>
              <span className="row" style={{ gap: 6 }}>
                <span className="chip fail">{s.fail}</span><span className="chip warn">{s.warn}</span><span className="chip pass">{s.pass}</span>
              </span>
            </div>
            <p className="small faint" style={{ margin: "0 0 4px" }}>Checked in code against USG&apos;s 2026-27 guidelines. Each line quotes the rule.</p>
            <div className="checks">
              {[...checks].sort((a, b) => "fwpi".indexOf(a.level[0]) - "fwpi".indexOf(b.level[0])).map((c) => (
                <CheckRow key={c.id} c={c} onFix={locked ? undefined : fix} />
              ))}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

function DecisionCard({ app }: { app: Application }) {
  const d = app.decision!;
  return (
    <section className="sheet sheet-pad stack-sm" style={{ borderColor: d.outcome === "denied" ? "var(--stop)" : "var(--go)", borderWidth: 2 }}>
      <div className="between">
        <h2>{d.outcome === "denied" ? "USG denied this request" : `USG awarded ${money(d.amount)}`}</h2>
        <span className="mono small faint">{d.sentAt}</span>
      </div>
      <div className="email small">{d.email}</div>
    </section>
  );
}
