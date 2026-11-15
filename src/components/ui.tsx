"use client";
import { AlertCircle, Check, CircleAlert, Info, Sparkles, X, AlertTriangle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { Check as CheckT, CheckLevel, Status } from "@/lib/types";

export function Mark({ size = "md", slogan = false }: { size?: "md" | "lg"; slogan?: boolean }) {
  return (
    <span className={"mark" + (size === "lg" ? " mark-lg" : "") + (slogan ? " mark-with-slogan" : "")}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/greenlight-mark.png" alt="" className="mark-ico" width={size === "lg" ? 40 : 28} height={size === "lg" ? 40 : 28} />
      <span className="mark-word">
        Greenlight
        {slogan && <span className="mark-slogan">Your Highway to Capital</span>}
      </span>
    </span>
  );
}

/** Full horizontal lockup (helmet + name + slogan) for landing and print. */
export function LogoLockup({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/greenlight-logo.png" alt="Greenlight: Your Highway to Capital" className={className ?? "logo-lockup"} width={777} height={320} />
  );
}

/** The logo: a small traffic light with the green lamp lit. */
export function Stoplight({ state = "go", big }: { state?: "stop" | "go"; big?: boolean }) {
  return (
    <span className={"stoplight" + (big ? " big" : "")} data-state={state} aria-hidden="true">
      <i /><i /><i />
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
        {(c.heuristic || c.section.startsWith("Greenlight")) && (
          <span className="tiny faint">Greenlight check, not a USG rule</span>
        )}
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
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), msg.error ? 4500 : 2800);
    return () => clearTimeout(t);
  }, [msg]);
  const node = msg ? (
    msg.error
      ? <div className="toast toast-error" role="alert"><AlertTriangle strokeWidth={2.4} />{msg.text}</div>
      : <div className="toast" role="status"><Check strokeWidth={3} />{msg.text}</div>
  ) : null;
  return [node, useCallback((m: string, kind: "ok" | "error" = "ok") => setMsg({ text: m, error: kind === "error" }), [])] as const;
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
  if (["food-docs", "uepa", "hotel-compare"].includes(c.ruleId)) return "documents";
  if (["food-why", "other-university-funding"].includes(c.ruleId)) return "answers";
  if (c.itemId || ["over-4k", "venue-cap", "quote-needed", "quote-mismatch", "missing-quote", "annual-cap", "semester-cap", "durable-likely", "qty-per-attendee", "duplicate-item"].includes(c.ruleId) || c.ruleId.startsWith("ineligible")) return "budget";
  return "event";
}

export function useAiStatus() {
  const [ai, setAi] = useState<boolean | null>(null);
  useEffect(() => {
    fetch("/api/status").then((r) => r.json()).then((d) => setAi(Boolean(d.ai))).catch(() => setAi(false));
  }, []);
  return ai;
}
