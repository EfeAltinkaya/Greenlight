"use client";
import { useEffect, useState } from "react";
import { classifyReply, type ClassSuggestion } from "@/lib/models";
import { ModelSuggestion } from "./ModelSuggestion";

/** Suggest a label for a pasted inbound reply (Gmail / sponsor inbox). */
export function ReplyModelHint({
  text,
  onAcceptLabel,
}: {
  text: string;
  onAcceptLabel?: (label: string, display: string) => void;
}) {
  const [sug, setSug] = useState<ClassSuggestion | null>(null);
  const [dismissed, setDismissed] = useState("");

  useEffect(() => {
    let off = false;
    const t = window.setTimeout(() => {
      void classifyReply(text).then((r) => {
        if (off) return;
        if (!r || dismissed === text) setSug(null);
        else setSug(r);
      });
    }, 400);
    return () => {
      off = true;
      window.clearTimeout(t);
    };
  }, [text, dismissed]);

  if (!sug) return null;
  return (
    <ModelSuggestion
      task="replies"
      text={text}
      summary={`Looks like: ${sug.display} (${Math.round(sug.p * 100)}%)`}
      correctLabel={sug.label}
      onAccept={() => {
        onAcceptLabel?.(sug.label, sug.display);
        setSug(null);
      }}
      onDismiss={() => {
        setDismissed(text);
        setSug(null);
      }}
    />
  );
}
