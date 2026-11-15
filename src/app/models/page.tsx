"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { NavActions } from "@/components/Landing";
import { Mark } from "@/components/ui";

type HeadMeta = {
  task: string;
  ready?: boolean;
  stub?: boolean;
  baseModel?: string;
  license?: string;
  metrics?: { accuracy?: number | null; macroF1?: number | null; recallAt3?: number | null; nTrain?: number | null; note?: string };
  trainedAt?: string | null;
  limits?: string;
  does?: string;
  neverDoes?: string;
  reportWrong?: string;
};

const TASKS = ["items", "board", "replies", "vendor"] as const;

const HONEST =
  "Greenlight Models suggest categories, boards, vendors and reply labels so officers move faster. They never decide money, approve or deny a request, or replace the rules engine.";

export default function ModelsPage() {
  const [heads, setHeads] = useState<HeadMeta[]>([]);

  useEffect(() => {
    let off = false;
    Promise.all(
      TASKS.map(async (t) => {
        try {
          const r = await fetch(`/models/heads/${t}.json`, { cache: "no-store" });
          if (!r.ok) return { task: t, ready: false, stub: true } as HeadMeta;
          return (await r.json()) as HeadMeta;
        } catch {
          return { task: t, ready: false, stub: true } as HeadMeta;
        }
      }),
    ).then((rows) => {
      if (!off) setHeads(rows);
    });
    return () => {
      off = true;
    };
  }, []);

  return (
    <div className="landing" style={{ minHeight: "100vh" }}>
      <header className="land-nav">
        <Link href="/" className="land-mark" aria-label="Greenlight home"><Mark slogan /></Link>
        <NavActions />
      </header>
      <main className="land-wrap" style={{ padding: "48px 24px 80px", maxWidth: 800, margin: "0 auto" }}>
        <h1 style={{ fontFamily: "var(--font-serif, Georgia, serif)", fontSize: "clamp(2rem, 4vw, 2.75rem)", lineHeight: 1.15 }}>Greenlight Models</h1>
        <p className="lede">{HONEST}</p>

        <section className="stack" style={{ gap: 16, marginTop: 32 }}>
          {heads.length === 0 && <p className="small muted">Loading model cards…</p>}
          {heads.map((h) => (
            <article key={h.task} className="card card-pad stack-sm">
              <div className="between" style={{ alignItems: "baseline" }}>
                <h2 style={{ margin: 0, textTransform: "capitalize" }}>{h.task}</h2>
                <span className="pill">{h.ready && !h.stub ? "Live" : "Stub / training"}</span>
              </div>
              <p className="small"><strong>What it does.</strong> {h.does ?? "Suggests a label from text."}</p>
              <p className="small"><strong>What it never does.</strong> {h.neverDoes ?? "Decide money."}</p>
              <p className="small muted">
                Base model: {h.baseModel ?? "Xenova/bge-small-en-v1.5"} · License: {h.license ?? "Apache-2.0"}
              </p>
              <p className="small muted">
                Metrics: {formatMetrics(h.metrics)}
                {h.trainedAt ? ` · Trained ${h.trainedAt}` : " · Not trained yet"}
              </p>
              <p className="small">{h.limits}</p>
              <p className="tiny faint">{h.reportWrong ?? "Report a wrong suggestion from the chip in the app, or email the Greenlight team."}</p>
            </article>
          ))}
        </section>

        <section className="stack" style={{ gap: 12, marginTop: 40 }}>
          <h2>How to report a wrong suggestion</h2>
          <p className="small">On any suggestion chip, click Not right. That stores a correction for training (task, text, your label). You can also email the team that runs this build with a screenshot.</p>
          <p className="tiny faint">Not an official USC or USG service. Built at the AI@USC Hackathon, Nov 2026.</p>
        </section>
      </main>
    </div>
  );
}

function formatMetrics(m?: HeadMeta["metrics"]): string {
  if (!m) return "n/a";
  const bits: string[] = [];
  if (m.accuracy != null) bits.push(`accuracy ${Math.round(m.accuracy * 1000) / 10}%`);
  if (m.macroF1 != null) bits.push(`macro-F1 ${Math.round(m.macroF1 * 1000) / 10}%`);
  if (m.recallAt3 != null) bits.push(`recall@3 ${Math.round(m.recallAt3 * 1000) / 10}%`);
  if (m.nTrain != null) bits.push(`${m.nTrain} train rows`);
  if (m.note) bits.push(m.note);
  return bits.length ? bits.join(" · ") : "n/a";
}
