"use client";
import { useCallback, useEffect, useState } from "react";
import type { Check, CheckLevel, Status } from "@/lib/types";

export function Signal({ state, size }: { state: "stop" | "wait" | "go" | "off"; size?: "lg" }) {
  return (
    <span className={"signal" + (size ? " " + size : "")} data-state={state} aria-hidden="true">
      <i /><i /><i />
    </span>
  );
}

export const levelWord: Record<CheckLevel, string> = { fail: "Fix", warn: "Check", pass: "Clear", info: "Note" };

export function CheckRow({ c, onFix }: { c: Check; onFix?: (c: Check) => void }) {
  return (
    <div className="check">
      <span className={"lamp " + c.level} aria-label={levelWord[c.level]} />
      <div className="stack-sm" style={{ gap: 4 }}>
        <div className="between" style={{ alignItems: "flex-start" }}>
          <span className="check-title">{c.title}</span>
          {c.fix && onFix && (
            <button className="btn sm" onClick={() => onFix(c)}>{c.fix.label}</button>
          )}
        </div>
        {c.detail && <div className="check-detail">{c.detail}</div>}
        <div className="rule-quote"><b>{c.section}</b>&ldquo;{c.quote}&rdquo;</div>
      </div>
    </div>
  );
}

const STATUS: Record<Status, { word: string; tone: CheckLevel | "dark" | "" }> = {
  draft: { word: "Draft", tone: "" },
  submitted: { word: "Submitted", tone: "info" },
  in_review: { word: "In review", tone: "info" },
  needs_info: { word: "Needs info", tone: "warn" },
  approved: { word: "Approved", tone: "pass" },
  partial: { word: "Partly funded", tone: "pass" },
  denied: { word: "Denied", tone: "fail" },
  post_event_due: { word: "Post-event due", tone: "warn" },
  closed: { word: "Closed", tone: "" },
};
export function StatusChip({ s }: { s: Status }) {
  return <span className={"chip " + STATUS[s].tone}>{STATUS[s].word}</span>;
}
export const statusWord = (s: Status) => STATUS[s].word;

export function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 2600);
    return () => clearTimeout(t);
  }, [msg]);
  const node = msg ? <div className="toast" role="status">{msg}</div> : null;
  return [node, useCallback((m: string) => setMsg(m), [])] as const;
}

export function Spinner() {
  return <span className="spinner" aria-hidden="true" />;
}

export function overall(checks: Check[]): "stop" | "wait" | "go" {
  if (checks.some((c) => c.level === "fail")) return "stop";
  if (checks.some((c) => c.level === "warn")) return "wait";
  return "go";
}
