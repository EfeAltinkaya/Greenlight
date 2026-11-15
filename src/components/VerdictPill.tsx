"use client";
import { AlertTriangle, Check, CircleAlert, X } from "lucide-react";
import type { VerdictId } from "@/lib/verdict";

const META: Record<VerdictId, { word: string; cls: string; Icon: typeof Check }> = {
  matches: { word: "Matches", cls: "pill-clear", Icon: Check },
  minor_fixes: { word: "Minor fixes", cls: "pill-check", Icon: CircleAlert },
  back_and_forth: { word: "Needs back-and-forth", cls: "pill-check", Icon: AlertTriangle },
  will_not_fund: { word: "Will not be funded", cls: "pill-fix", Icon: X },
};

export function VerdictPill({ id, label }: { id: VerdictId; label?: string }) {
  const m = META[id];
  const Icon = m.Icon;
  return (
    <span className={"pill " + m.cls}>
      <Icon strokeWidth={2.6} />
      {label ?? m.word}
    </span>
  );
}
