"use client";
import { useEffect, useLayoutEffect, useState } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";

type Step = { target: string; title: string; body: string };

const STEPS: Record<"club" | "usg" | "sponsor", Step[]> = {
  club: [
    { target: "home", title: "Home", body: "Continue cards show what needs you: drafts to fix, USG waits, sponsor follow-ups, and close-outs." },
    { target: "new", title: "1. New request", body: "Describe your event in a few sentences. Greenlight fills in USG's budget sheet, drafts answers, and jumps to the first failing check." },
    { target: "requests", title: "2. My requests", body: "Every request and where it is: draft, with USG, funded or denied. Open one to work through it step by step." },
    { target: "deadlines", title: "Deadlines", body: "Pick a date and see the exact Wednesday you must submit by, from USG's own deadline sheet." },
    { target: "funding", title: "Other funding", body: "If USG says no or funds part, apply to Viterbi, Marshall, GSG, IgniteSC and other USC sources from here." },
    { target: "sponsors", title: "3. Sponsors", body: "One hub for covering the gap: find companies, outreach, inbound offers, and deals. Sponsors pay vendors directly." },
    { target: "money", title: "4. Money tracker", body: "Every dollar for every event: what USG awarded, what sponsors committed, what is paid and which invoices are due." },
    { target: "updates", title: "Updates", body: "When USG or a sponsor acts, it shows up here and in your email automatically." },
  ],
  usg: [
    { target: "queue", title: "Review queue", body: "Applications arrive with the rule checks done. Open one to see the AI notes and decision support." },
    { target: "updates", title: "Updates", body: "New submissions and resubmissions appear here and in your email." },
    { target: "insights", title: "Insights", body: "Where the money goes by board, which problems slow clubs down, and how close each board is to 50%." },
  ],
  sponsor: [
    { target: "offers", title: "My offers", body: "Post what you want to support: themes, dates, what you give and what you ask for in return." },
    { target: "deals", title: "Club requests", body: "Clubs that want your support. Reply with details, sign the standard agreement and confirm payment to the vendor." },
    { target: "updates", title: "Updates", body: "Every step a club takes shows up here and in your email." },
  ],
};

export function Tour({ role, onClose }: { role: "club" | "usg" | "sponsor"; onClose: () => void }) {
  const steps = STEPS[role];
  const [i, setI] = useState(0);
  const [box, setBox] = useState<DOMRect | null>(null);
  const step = steps[i];

  useLayoutEffect(() => {
    const el = document.querySelector(`[data-tour="${step.target}"]`) as HTMLElement | null;
    const visible = el && el.offsetParent !== null;
    el?.scrollIntoView({ block: "nearest" });
    const measure = () => setBox(visible ? el!.getBoundingClientRect() : null);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [step.target]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setI((x) => Math.min(steps.length - 1, x + 1));
      if (e.key === "ArrowLeft") setI((x) => Math.max(0, x - 1));
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose, steps.length]);

  const pop = box ? { top: Math.min(window.innerHeight - 220, Math.max(16, box.top - 8)), left: box.right + 16 } : { top: window.innerHeight / 2 - 110, left: window.innerWidth / 2 - 170 };

  return (
    <div className="tour" role="dialog" aria-modal="true" aria-label="Guided tour">
      {box ? <div className="tour-hole" style={{ top: box.top - 4, left: box.left - 4, width: box.width + 8, height: box.height + 8 }} /> : <div className="tour-dim" />}
      <div className="tour-card" style={pop}>
        <div className="between"><span className="tiny faint">Step {i + 1} of {steps.length}</span><button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close tour"><X /></button></div>
        <h3>{step.title}</h3>
        <p className="small muted">{step.body}</p>
        <div className="between">
          <button className="btn btn-sm btn-ghost" disabled={i === 0} onClick={() => setI(i - 1)}><ArrowLeft />Back</button>
          {i < steps.length - 1 ? <button className="btn btn-sm btn-primary" onClick={() => setI(i + 1)}>Next<ArrowRight /></button> : <button className="btn btn-sm btn-primary" onClick={onClose}>Done</button>}
        </div>
      </div>
    </div>
  );
}
