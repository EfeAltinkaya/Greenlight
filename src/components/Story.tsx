"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { motion, useInView } from "motion/react";
import { useReduced } from "./Landing";
import { Check, CircleAlert, Pencil, RotateCcw, ThumbsDown, ThumbsUp, X } from "lucide-react";

const EASE = [0.2, 0.8, 0.2, 1] as const;
const usd = (n: number) => "$" + n.toLocaleString("en-US");

export type Level = "fail" | "warn" | "pass" | "info";
const LEVEL = {
  fail: { word: "Fix", Icon: X },
  warn: { word: "Check", Icon: CircleAlert },
  pass: { word: "Clear", Icon: Check },
  info: { word: "Note", Icon: CircleAlert },
} as const;

/* ---------- Stoplight ---------- */

function Lamp({ cy, on, tone }: { cy: number; on: number; tone: "red" | "amber" | "green" }) {
  return (
    <g>
      <circle cx="80" cy={cy} r="44" fill={`url(#sl-dim-${tone})`} />
      <motion.g initial={false} animate={{ opacity: on }} transition={{ duration: 0.45, ease: EASE }}>
        <circle cx="80" cy={cy} r="62" fill={`var(--sl-${tone})`} opacity="0.32" filter="url(#sl-glow)" />
        <circle cx="80" cy={cy} r="44" fill={`url(#sl-on-${tone})`} />
        <ellipse cx="66" cy={cy - 18} rx="16" ry="9" fill="#fff" opacity="0.35" />
      </motion.g>
      <path d={`M24 ${cy - 30} Q80 ${cy - 82} 136 ${cy - 30} L136 ${cy - 46} Q80 ${cy - 96} 24 ${cy - 46} Z`} fill="#0d0a08" />
    </g>
  );
}

export function StoplightSvg({ red, amber, green, label, className }: { red: number; amber: number; green: number; label: string; className?: string }) {
  return (
    <svg viewBox="0 0 160 400" className={"sl " + (className ?? "")} role="img" aria-label={label}>
      <defs>
        <filter id="sl-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="10" /></filter>
        {([["red", "#ff6b57", "#b8170c", "#3b1714"], ["amber", "#ffe066", "#e0a100", "#3a3011"], ["green", "#7af2b0", "#139c55", "#12301f"]] as const).map(([t, a, b, d]) => (
          <g key={t}>
            <radialGradient id={`sl-on-${t}`} cx="42%" cy="38%" r="70%"><stop offset="0" stopColor={a} /><stop offset="1" stopColor={b} /></radialGradient>
            <radialGradient id={`sl-dim-${t}`} cx="42%" cy="38%" r="70%"><stop offset="0" stopColor={d} /><stop offset="1" stopColor="#0f0c0a" /></radialGradient>
          </g>
        ))}
      </defs>
      <rect x="16" y="8" width="128" height="384" rx="40" fill="#1B1714" />
      <rect x="16" y="8" width="128" height="384" rx="40" fill="none" stroke="#ffffff" strokeOpacity="0.07" strokeWidth="2" />
      <Lamp cy={84} on={red} tone="red" />
      <Lamp cy={200} on={amber} tone="amber" />
      <Lamp cy={316} on={green} tone="green" />
    </svg>
  );
}

/** Hero stoplight: runs red, amber, green once on load. Reduced motion shows green. */
export function HeroStoplight() {
  const reduce = useReduced();
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const a = window.setTimeout(() => setPhase(1), 900);
    const b = window.setTimeout(() => setPhase(2), 1800);
    return () => { window.clearTimeout(a); window.clearTimeout(b); };
  }, [reduce]);
  const p = reduce ? 2 : phase;
  return <StoplightSvg className="sl-hero" red={p === 0 ? 1 : 0} amber={p === 1 ? 1 : 0} green={p === 2 ? 1 : 0} label="A stoplight that turns from red to amber to green" />;
}

const RAIL = [
  { level: "fail" as Level, word: "4 to fix", line: "As typed, USG would deny it." },
  { level: "warn" as Level, word: "Fixing", line: "Three clicks clear four red lights." },
  { level: "pass" as Level, word: "Ready", line: "Nothing to fix. Sent on time." },
];

const RailCtx = createContext<(phase: number) => void>(() => {});

/** The story column: a sticky stoplight that moves from red to green as each chapter of the event's journey scrolls into view. */
export function StoryRail({ children }: { children: React.ReactNode }) {
  const reduce = useReduced();
  const [phase, setPhase] = useState(0);
  const p = reduce ? 2 : phase;
  const r = RAIL[p];
  const I = LEVEL[r.level].Icon;
  return (
    <div className="story">
      <aside className="story-rail" aria-hidden="true">
        <div className="story-rail-in">
          <StoplightSvg red={p === 0 ? 1 : 0} amber={p === 1 ? 1 : 0} green={p === 2 ? 1 : 0} label="" />
          <div className={"rail-cap lvl-" + r.level}>
            <span className="rail-word"><I strokeWidth={2.6} />{r.word}</span>
            <span className="rail-line">{r.line}</span>
          </div>
        </div>
      </aside>
      <div className="story-body"><RailCtx.Provider value={setPhase}>{children}</RailCtx.Provider></div>
    </div>
  );
}

/** One chapter of the story; `light` is the stoplight state while it sits in the middle of the screen (0 red, 1 amber, 2 green). */
export function Chapter({ light, children }: { light: 0 | 1 | 2; children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const setPhase = useContext(RailCtx);
  const inView = useInView(ref, { margin: "-45% 0px -45% 0px" });
  useEffect(() => { if (inView) setPhase(light); }, [inView, light, setPhase]);
  return <article ref={ref} className="ch">{children}</article>;
}

/* ---------- Chapter: words become a budget ---------- */

export type BudgetRow = { item: string; vendor: string; qty: number; unit: number; total: number };

export function TextToBudget({ text, rows, total, facts }: { text: string; rows: BudgetRow[]; total: number; facts: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const reduce = useReduced();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!inView || reduce) return;
    let i = 0;
    const id = window.setInterval(() => {
      i += 3;
      setN(Math.min(i, text.length));
      if (i >= text.length) window.clearInterval(id);
    }, 24);
    return () => window.clearInterval(id);
  }, [inView, reduce, text]);
  const shown = reduce ? text.length : n;
  const done = shown >= text.length;
  return (
    <div ref={ref} className="ttb">
      <div className="ttb-note">
        <p className="ttb-text" aria-label={text}>
          <span aria-hidden="true">{text.slice(0, shown)}</span>
          <span className="ttb-ghost" aria-hidden="true">{text.slice(shown)}</span>
        </p>
      </div>
      <div className={"ttb-sheet" + (done ? " on" : "")}>
        <div className="ttb-facts">{facts.map((f) => <span key={f}>{f}</span>)}</div>
        <table className="ttb-table">
          <thead><tr><th>Line</th><th>Vendor</th><th className="r">Qty</th><th className="r">Each</th><th className="r">Total</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.item} style={{ transitionDelay: done && !reduce ? `${i * 120}ms` : undefined }}>
                <td>{r.item}</td><td className="faint">{r.vendor || "None yet"}</td><td className="r">{r.qty}</td><td className="r">{usd(r.unit)}</td><td className="r">{usd(r.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr><td colSpan={4}>USG request as typed</td><td className="r">{usd(total)}</td></tr></tfoot>
        </table>
      </div>
    </div>
  );
}

/* ---------- Chapter: every line gets stamped ---------- */

export type StampRow = { level: Level; title: string; detail: string; quote: string; section: string };

export function RuleStamps({ rows }: { rows: StampRow[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.25 });
  const reduce = useReduced();
  return (
    <div ref={ref} className="stamps">
      {rows.map((r, i) => {
        const L = LEVEL[r.level];
        return (
          <div key={r.title} className="stamp-row">
            <div className="stack-xs">
              <strong className="stamp-title">{r.title}</strong>
              <span className="stamp-detail">{r.detail}</span>
              <span className="stamp-quote">&ldquo;{r.quote}&rdquo; <b>{r.section}</b></span>
            </div>
            {reduce ? (
              <span className={"stamp lvl-" + r.level}><L.Icon strokeWidth={3} />{L.word}</span>
            ) : (
              <motion.span
                className={"stamp lvl-" + r.level}
                initial={{ opacity: 0, scale: 1.8, rotate: -14 }}
                animate={inView ? { opacity: 1, scale: 1, rotate: -5 } : undefined}
                transition={{ type: "spring", stiffness: 420, damping: 18, delay: 0.15 + i * 0.22 }}
              >
                <L.Icon strokeWidth={3} />{L.word}
              </motion.span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Chapter: one-click fixes ---------- */

export type FixState = { fixes: number; warns: number; total: number; deadline: string; deadlineSub: string; late: boolean; open: string[] };
export type FixDef = { id: string; label: string; done: string };

export function FixDemo({ fixes, states }: { fixes: FixDef[]; states: Record<string, FixState> }) {
  const reduce = useReduced();
  const [picked, setOn] = useState<string[] | null>(null);
  // Reduced motion starts on the finished state; any click takes over from there.
  const on = picked ?? (reduce ? fixes.map((f) => f.id) : []);
  const key = fixes.filter((f) => on.includes(f.id)).map((f) => f.id).join(",");
  const s = states[key];
  const toggle = (id: string) => setOn(on.includes(id) ? on.filter((x) => x !== id) : [...on, id]);
  const ready = s.fixes === 0;
  return (
    <div className="fixdemo">
      <div className="fix-head">
        <span className={"fix-pill lvl-" + (ready ? "pass" : "fail")}>{ready ? <Check strokeWidth={3} /> : <X strokeWidth={3} />}{ready ? "Ready to submit" : `${s.fixes} to fix`}</span>
        <span className="fix-total num">USG request <b>{usd(s.total)}</b></span>
      </div>
      <div className={"fix-deadline" + (s.late ? " late" : "")}>
        <b>{s.deadline}</b>
        <span>{s.deadlineSub}</span>
      </div>
      <div className="fix-buttons" role="group" aria-label="One-click fixes">
        {fixes.map((f) => {
          const pressed = on.includes(f.id);
          return (
            <button key={f.id} type="button" className={"fix-btn" + (pressed ? " on" : "")} aria-pressed={pressed} onClick={() => toggle(f.id)}>
              <span className="fix-box">{pressed ? <Check strokeWidth={3} /> : null}</span>
              <span className="stack-xs"><b>{f.label}</b>{pressed && <span className="tiny">{f.done}</span>}</span>
            </button>
          );
        })}
      </div>
      <div className="fix-open" aria-live="polite">
        {s.open.length ? s.open.map((t) => <span key={t} className="fix-line lvl-fail"><X strokeWidth={3} />{t}</span>) : <span className="fix-line lvl-pass"><Check strokeWidth={3} />No red lights left. {s.warns ? `${s.warns} amber check${s.warns === 1 ? "" : "s"} stay visible to the reviewer.` : ""}</span>}
      </div>
      <div className="row" style={{ gap: 8 }}>
        <button type="button" className="btn btn-sm" onClick={() => setOn(fixes.map((f) => f.id))} disabled={ready}>Apply all three</button>
        <button type="button" className="btn btn-sm btn-ghost" onClick={() => setOn([])} disabled={!on.length}><RotateCcw />Start over</button>
      </div>
    </div>
  );
}

/* ---------- Chapter: the USG queue ---------- */

export type QueueRow = { title: string; club: string; amount: number; level: Level; status: string; timing: string; focus?: boolean };

export function QueueDemo({ rows, note, email }: { rows: QueueRow[]; note: string; email: string }) {
  const [verdict, setVerdict] = useState<"agree" | "disagree" | "edit" | null>(null);
  const [text, setText] = useState(note);
  return (
    <div className="queue">
      <table className="queue-table">
        <thead><tr><th>Request</th><th className="r">Asks</th><th>Checks</th><th>Timing</th></tr></thead>
        <tbody>
          {rows.map((r) => {
            const L = LEVEL[r.level];
            return (
              <tr key={r.title} className={r.focus ? "focus" : undefined}>
                <td><b>{r.title}</b><span className="faint">{r.club}</span></td>
                <td className="r num">{usd(r.amount)}</td>
                <td><span className={"q-status lvl-" + r.level}><L.Icon strokeWidth={3} />{r.status}</span></td>
                <td className="faint">{r.timing}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="queue-detail">
        <div className="q-note">
          <span className="q-label">AI note on the food line</span>
          {verdict === "edit" ? (
            <textarea className="textarea" value={text} onChange={(e) => setText(e.target.value)} aria-label="Edit the AI note" rows={3} />
          ) : (
            <p className={verdict === "disagree" ? "struck" : undefined}>{text}</p>
          )}
          <div className="row" style={{ gap: 6 }}>
            <button type="button" className={"btn btn-sm" + (verdict === "agree" ? " on" : "")} aria-pressed={verdict === "agree"} onClick={() => setVerdict(verdict === "agree" ? null : "agree")}><ThumbsUp />Agree</button>
            <button type="button" className={"btn btn-sm" + (verdict === "disagree" ? " on" : "")} aria-pressed={verdict === "disagree"} onClick={() => setVerdict(verdict === "disagree" ? null : "disagree")}><ThumbsDown />Disagree</button>
            <button type="button" className={"btn btn-sm" + (verdict === "edit" ? " on" : "")} aria-pressed={verdict === "edit"} onClick={() => setVerdict(verdict === "edit" ? null : "edit")}><Pencil />Edit</button>
          </div>
        </div>
        <div className="q-decide">
          <span className="q-label">Amount, set by the reviewer</span>
          <span className="q-amount num">$4,000</span>
          <span className="q-label">AI draft of the decision email</span>
          <p className="q-email">{email}</p>
          <span className="tiny faint">A person sets the amount and presses Send. The AI never decides money.</span>
        </div>
      </div>
    </div>
  );
}

/* ---------- Chapter: one ledger ---------- */

export type LedgerPart = { label: string; amount: number; status: string; level: Level; tone: "cardinal" | "gold" | "ink" };

export function LedgerBar({ parts }: { parts: LedgerPart[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const reduce = useReduced();
  const total = parts.reduce((s, p) => s + p.amount, 0);
  return (
    <div ref={ref} className="ledger">
      <div className="ledger-top">
        <span>Robotics Build Night</span>
        <b className="num">{usd(total)}</b>
      </div>
      <div className="ledger-bar" role="img" aria-label={parts.map((p) => `${p.label} ${usd(p.amount)}, ${p.status}`).join("; ")}>
        {parts.map((p, i) => {
          const width = `${(p.amount / total) * 100}%`;
          if (reduce) return <span key={p.label} className={"seg tone-" + p.tone} style={{ width }} />;
          return (
            <motion.span
              key={p.label}
              className={"seg tone-" + p.tone}
              initial={{ width: 0 }}
              animate={inView ? { width } : undefined}
              transition={{ duration: 0.9, ease: EASE, delay: i * 0.18 }}
            />
          );
        })}
      </div>
      <div className="ledger-legend">
        {parts.map((p) => {
          const L = LEVEL[p.level];
          return (
            <div key={p.label} className="ledger-item">
              <span className={"swatch tone-" + p.tone} />
              <span className="stack-xs">
                <b>{p.label} <span className="num">{usd(p.amount)}</span></b>
                <span className={"ledger-status lvl-" + p.level}><L.Icon strokeWidth={3} />{p.status}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
