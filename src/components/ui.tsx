"use client";
import { AlertCircle, Check, CircleAlert, Info, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { Check as CheckT, CheckLevel, Status } from "@/lib/types";

export function Mark({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <span className="mark" style={size === "lg" ? { fontSize: 22 } : undefined}>
      <span className="mark-glyph" aria-hidden="true"><Check strokeWidth={3} /></span>
      Greenlight
    </span>
  );
}

export const LEVEL: Record<CheckLevel, { word: string; Icon: typeof Check }> = {
  fail: { word: "Fix", Icon: X },
  warn: { word: "Check", Icon: CircleAlert },
  pass: { word: "Clear", Icon: Check },
  info: { word: "Note", Icon: Info },
};

export function CheckItem({ c, onFix, compact }: { c: CheckT; onFix?: (c: CheckT) => void; compact?: boolean }) {
  const { Icon, word } = LEVEL[c.level];
  return (
    <div className="check">
      <span className={"check-ico " + c.level} role="img" aria-label={word}><Icon strokeWidth={2.6} /></span>
      <div className="stack-xs" style={{ gap: 6 }}>
        <div className="check-title">{c.title}</div>
        {!compact && c.detail && <div className="check-detail">{c.detail}</div>}
        {!compact && <div className="quote"><b>{c.section}.</b> &ldquo;{c.quote}&rdquo;</div>}
        {c.fix && onFix && (
          <div><button className="btn btn-sm" onClick={() => onFix(c)}>{c.fix.label}</button></div>
        )}
      </div>
    </div>
  );
}

const STATUS: Record<Status, { word: string; cls: string }> = {
  draft: { word: "Draft", cls: "" },
  submitted: { word: "Submitted", cls: "pill-note" },
  in_review: { word: "In review", cls: "pill-note" },
  needs_info: { word: "Needs info", cls: "pill-check" },
  approved: { word: "Approved", cls: "pill-clear" },
  partial: { word: "Partly funded", cls: "pill-clear" },
  denied: { word: "Denied", cls: "pill-fix" },
  post_event_due: { word: "Post-event due", cls: "pill-check" },
  closed: { word: "Closed", cls: "" },
};
export function StatusPill({ s }: { s: Status }) {
  return <span className={"pill " + STATUS[s].cls}>{STATUS[s].word}</span>;
}
export const statusWord = (s: Status) => STATUS[s].word;

export function CountPills({ fail, warn, pass }: { fail: number; warn: number; pass?: number }) {
  return (
    <span className="row" style={{ gap: 6, flexWrap: "nowrap" }}>
      {fail > 0 && <span className="pill pill-fix"><X strokeWidth={3} />{fail} to fix</span>}
      {warn > 0 && <span className="pill pill-check"><AlertCircle strokeWidth={2.5} />{warn} to check</span>}
      {fail === 0 && warn === 0 && <span className="pill pill-clear"><Check strokeWidth={3} />Ready{pass ? "" : ""}</span>}
    </span>
  );
}

export function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 2800);
    return () => clearTimeout(t);
  }, [msg]);
  const node = msg ? (
    <div className="toast" role="status"><Check strokeWidth={3} />{msg}</div>
  ) : null;
  return [node, useCallback((m: string) => setMsg(m), [])] as const;
}

export function Spinner() {
  return <span className="spinner" aria-hidden="true" />;
}

export function AiTag({ offline }: { offline?: boolean }) {
  return offline ? <span className="offline-tag">Offline draft</span> : <span className="ai-tag"><Sparkles />Drafted by AI</span>;
}

export function overall(checks: CheckT[]): "fail" | "warn" | "pass" {
  if (checks.some((c) => c.level === "fail")) return "fail";
  if (checks.some((c) => c.level === "warn")) return "warn";
  return "pass";
}

/** Which step of the request each rule belongs to. */
export type StepId = "event" | "budget" | "documents" | "answers" | "submit";
export function stepOf(c: CheckT): StepId {
  if (["food-docs", "uepa"].includes(c.ruleId)) return "documents";
  if (c.itemId || ["over-4k", "venue-cap", "quote-needed", "quote-mismatch"].includes(c.ruleId) || c.ruleId.startsWith("ineligible")) return "budget";
  return "event";
}

export function useAiStatus() {
  const [ai, setAi] = useState<boolean | null>(null);
  useEffect(() => {
    fetch("/api/status").then((r) => r.json()).then((d) => setAi(Boolean(d.ai))).catch(() => setAi(false));
  }, []);
  return ai;
}
