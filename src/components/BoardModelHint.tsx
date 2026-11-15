"use client";
import { useEffect, useState } from "react";
import type { BoardId } from "@/data/rules";
import { routeBoard, type BoardSuggestion } from "@/lib/models";
import { ModelSuggestion } from "./ModelSuggestion";

/** Suggest a funding board from the event description / title. */
export function BoardModelHint({
  text,
  board,
  onPick,
}: {
  text: string;
  board: BoardId;
  onPick: (b: BoardId, reason: string) => void;
}) {
  const [sug, setSug] = useState<BoardSuggestion | null>(null);
  const [dismissed, setDismissed] = useState("");

  useEffect(() => {
    let off = false;
    const t = window.setTimeout(() => {
      void routeBoard(text).then((r) => {
        if (off) return;
        if (!r || r.label === board || dismissed === text) setSug(null);
        else setSug(r);
      });
    }, 450);
    return () => {
      off = true;
      window.clearTimeout(t);
    };
  }, [text, board, dismissed]);

  if (!sug) return null;
  return (
    <ModelSuggestion
      task="board"
      text={text}
      summary={`Looks like: ${sug.display} (${Math.round(sug.p * 100)}%)`}
      detail={sug.top2.map((t) => `${t.display} ${Math.round(t.p * 100)}%`).join(" · ")}
      correctLabel={board}
      onAccept={() => {
        onPick(sug.label as BoardId, `Suggested by Greenlight Models (${Math.round(sug.p * 100)}%).`);
        setSug(null);
      }}
      onDismiss={() => {
        setDismissed(text);
        setSug(null);
      }}
    />
  );
}
