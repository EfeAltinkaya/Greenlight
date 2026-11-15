"use client";
import { Check, X } from "lucide-react";
import { saveCorrection, type ModelTask } from "@/lib/models";

type Props = {
  task: ModelTask;
  text: string;
  /** e.g. "Looks like: durable good (91%)" */
  summary: string;
  /** Optional second line (board top2, vendor list). */
  detail?: string;
  onAccept: () => void;
  /** Officer's current choice used as the correction label when they click Not right. */
  correctLabel: string;
  onDismiss?: () => void;
};

/** Small accept/correct chip for Greenlight Models suggestions. */
export function ModelSuggestion({ task, text, summary, detail, onAccept, correctLabel, onDismiss }: Props) {
  return (
    <div className="inset stack-xs" style={{ padding: "8px 10px", gap: 6 }} role="status">
      <span className="small" style={{ fontWeight: 600 }}>{summary}</span>
      {detail ? <span className="tiny muted">{detail}</span> : null}
      <span className="tiny faint">Suggested by Greenlight Models</span>
      <div className="row" style={{ gap: 6 }}>
        <button type="button" className="btn btn-sm" onClick={onAccept}>
          <Check />Use this
        </button>
        <button
          type="button"
          className="btn btn-sm btn-ghost"
          onClick={() => {
            saveCorrection(task, text, correctLabel, task === "replies" ? "reply_confirmed" : "officer_correction");
            onDismiss?.();
          }}
        >
          <X />Not right
        </button>
      </div>
    </div>
  );
}
