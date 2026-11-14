"use client";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Check, CircleAlert, X } from "lucide-react";

// The hero shows the product doing its one job: a request goes from red to ready.
// Rows mirror the real demo (same numbers the rules engine produces).
const ROWS = [
  { before: { lvl: "fail", t: "Food is $45 per person", d: "USG's limit is $35. Most it will fund: $4,200." }, after: { lvl: "pass", t: "Food is $35 per person", d: "Capped at $4,200. $1,200 moved to sponsors." } },
  { before: { lvl: "fail", t: "Chipotle is not on USG's Vendor List", d: "A new vendor needs the 9-week deadline, which passed Nov 11." }, after: { lvl: "pass", t: "Panda Catering is on USG's Vendor List", d: "The 6-week deadline applies: Wednesday, Nov 18." } },
  { before: { lvl: "fail", t: "Gift cards are never fundable", d: "Section 5. Ask a sponsor instead." }, after: { lvl: "pass", t: "Gift cards moved to sponsors", d: "Ranked three companies that recruit at USC." } },
  { before: { lvl: "warn", t: "Total is over $4,000", d: "USG reviews these case by case." }, after: { lvl: "pass", t: "Within the $8,000 yearly cap", d: "$1,800 left after this request." } },
] as const;

const ICON = { fail: X, warn: CircleAlert, pass: Check } as const;

export function HeroPreview() {
  const [fixed, setFixed] = useState(false);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const t = setInterval(() => setFixed((f) => !f), 3200);
    return () => clearInterval(t);
  }, []);
  const fails = fixed ? 0 : 3;

  return (
    <div className="preview" aria-label="Example: a hackathon request being checked">
      <div className="preview-bar"><i /><i /><i /><span className="tiny faint" style={{ marginLeft: 10 }}>greenlight · Hackathon · Trojan Builders Society</span></div>
      <div className="preview-split">
        <div className="stack" style={{ gap: 14 }}>
          <div className="between">
            <div className="stack-xs"><span className="eyebrow">Request</span><strong style={{ fontFamily: "var(--display)", fontSize: 24, letterSpacing: "-0.02em" }}>Hackathon</strong><span className="small faint">Ginsburg Hall · Thursday, February 18 · 120 students</span></div>
            <motion.span key={String(fixed)} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className={"pill " + (fixed ? "pill-clear" : "pill-fix")}>{fixed ? "Ready to submit" : `${fails} to fix`}</motion.span>
          </div>
          <div className="deadline" style={{ padding: "18px 20px 18px 26px", gap: 18, background: fixed ? "var(--cardinal)" : "#2b2b2e", transition: "background .5s" }}>
            <div><div className="dl-days" style={{ fontSize: 44 }}>{fixed ? 4 : "Late"}</div><div className="dl-unit">{fixed ? "days left" : "passed"}</div></div>
            <div className="stack-xs"><div className="dl-date" style={{ fontSize: 18 }}>{fixed ? "Submit by Wednesday, Nov 18" : "9-week deadline passed Nov 11"}</div><div className="dl-sub small">{fixed ? "6-week deadline, from USG's deadline sheet." : "Because Chipotle is not on USG's Vendor List."}</div></div>
          </div>
          <div className="card-flat" style={{ overflow: "hidden" }}>
            {[["Catered lunch", fixed ? "Panda Catering" : "Chipotle", fixed ? "$4,200" : "$5,400"], ["Swag", "Amazon", "$600"], ["Gift cards for winners", "—", "$600"]].map(([a, b, c], i) => (
              <div key={a} className="between small" style={{ padding: "11px 14px", borderTop: i ? "1px solid var(--line-2)" : 0, color: fixed && i > 0 ? "var(--ink-3)" : undefined }}>
                <span className="row" style={{ gap: 10, flexWrap: "nowrap" }}><span className={"dot " + (fixed ? (i ? "off" : "pass") : i === 1 ? "warn" : "fail")} />{a}</span>
                <span className="row" style={{ gap: 16, flexWrap: "nowrap" }}><span className="faint">{b}</span><strong className="num" style={{ width: 56, textAlign: "right" }}>{c}</strong></span>
              </div>
            ))}
          </div>
        </div>
        <div className="stack-xs hero-checks">
          <span className="small" style={{ fontWeight: 600, marginBottom: 4 }}>Rule check</span>
          {ROWS.map((r, i) => {
            const s = fixed ? r.after : r.before;
            const I = ICON[s.lvl];
            return (
              <div key={i} className="check" style={{ padding: "10px 0" }}>
                <span className={"check-ico " + s.lvl} style={{ transition: "background .4s, color .4s" }}><I strokeWidth={2.6} /></span>
                <motion.div key={s.t} initial={{ opacity: 0.2, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: i * 0.08 }} className="stack-xs">
                    <span className="check-title" style={{ fontSize: 13.5 }}>{s.t}</span>
                    <span className="check-detail" style={{ fontSize: 12.5 }}>{s.d}</span>
                  </motion.div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
