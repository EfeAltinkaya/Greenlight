"use client";
import Link from "next/link";
import { NavActions } from "@/components/Landing";
import { Mark } from "@/components/ui";
import { SOURCES } from "@/data/sources";
import { SPONSORS } from "@/data/sponsors";
import { ROSTER_AS_OF, ROSTER_SOURCE } from "@/data/people";

export default function SourcesPage() {
  const tieUrls = new Map<string, string>();
  for (const s of SPONSORS) {
    for (const t of s.ties ?? []) {
      if (t.source) tieUrls.set(t.source, t.date);
    }
    if (s.tieSource) tieUrls.set(s.tieSource, "");
  }
  return (
    <div className="landing" style={{ minHeight: "100vh" }}>
      <header className="land-nav">
        <Link href="/" className="land-mark" aria-label="Greenlight home"><Mark slogan /></Link>
        <NavActions />
      </header>
      <main className="land-wrap" style={{ padding: "48px 24px 80px", maxWidth: 800, margin: "0 auto" }}>
        <h1 style={{ fontFamily: "var(--font-serif, Georgia, serif)", fontSize: "clamp(2rem, 4vw, 2.75rem)", lineHeight: 1.15 }}>Data sources</h1>
        <p className="lede">Every public source Greenlight cites, with its date. Rules and deadlines come from USG&apos;s own documents; sponsor ties need a working URL.</p>

        <section className="stack" style={{ gap: 16, marginTop: 32 }}>
          <h2>Landing and product stats</h2>
          <ul className="stack-sm" style={{ listStyle: "none", padding: 0 }}>
            {SOURCES.map((s) => (
              <li key={s.id} className="card card-pad stack-xs">
                <strong>{s.stat}</strong>
                <span className="small muted">{s.claim}</span>
                <span className="tiny faint">{s.source} · {s.date}</span>
                {s.url ? <a className="link small" href={s.url} target="_blank" rel="noreferrer">{s.url}</a> : null}
              </li>
            ))}
          </ul>
        </section>

        <section className="stack" style={{ gap: 16, marginTop: 32 }}>
          <h2>USG roster</h2>
          <div className="card card-pad stack-xs">
            <strong>Fall 2026 Funding Department staff roster</strong>
            <span className="small muted">As of {ROSTER_AS_OF}</span>
            <a className="link small" href={ROSTER_SOURCE} target="_blank" rel="noreferrer">{ROSTER_SOURCE}</a>
          </div>
        </section>

        <section className="stack" style={{ gap: 16, marginTop: 32 }}>
          <h2>Sponsor tie URLs</h2>
          <ul className="stack-sm" style={{ listStyle: "none", padding: 0 }}>
            {[...tieUrls.entries()].map(([url, date]) => (
              <li key={url} className="between small" style={{ padding: "10px 0", borderTop: "1px solid var(--line-2)" }}>
                <a className="link" href={url} target="_blank" rel="noreferrer" style={{ overflowWrap: "anywhere" }}>{url}</a>
                {date ? <span className="tiny faint">{date}</span> : null}
              </li>
            ))}
          </ul>
        </section>

        <section className="stack" style={{ gap: 16, marginTop: 32 }}>
          <h2>Libraries</h2>
          <p className="small muted">Proven public packages Greenlight uses for documents, matching, dates and models. Versions are pinned in package.json / ml/requirements.txt.</p>
          <ul className="stack-sm" style={{ listStyle: "none", padding: 0 }}>
            {[
              ["@react-pdf/renderer", "https://github.com/diegomura/react-pdf", "Greenlight Check PDF"],
              ["exceljs", "https://github.com/exceljs/exceljs", "Ledger / USG-ish budget .xlsx export"],
              ["docx", "https://github.com/dolanmiu/docx", "In-kind agreement Word file"],
              ["pptxgenjs", "https://github.com/gitbrent/PptxGenJS", "Legislative Fund six-section slide deck"],
              ["ics", "https://github.com/adamgibbons/ics", "Event timeline calendar export"],
              ["fuse.js", "https://github.com/krisk/Fuse", "Fuzzy vendor matching against the Vendor List"],
              ["date-fns", "https://github.com/date-fns/date-fns", "Business-day helpers (deadlines still from USG sheet)"],
              ["fast-check", "https://github.com/dubzzz/fast-check", "Property tests for money math"],
              ["unpdf", "https://github.com/unjs/unpdf", "Offline PDF text extraction for vendor quotes"],
              ["BAAI/bge-small-en-v1.5", "https://huggingface.co/BAAI/bge-small-en-v1.5", "Shared encoder for Greenlight Models (MIT)"],
              ["Xenova/bge-small-en-v1.5", "https://huggingface.co/Xenova/bge-small-en-v1.5", "ONNX q8 encoder served in-browser via Transformers.js"],
              ["@huggingface/transformers", "https://github.com/huggingface/transformers.js", "In-browser ONNX inference for model heads"],
            ].map(([name, url, why]) => (
              <li key={name} className="stack-xs" style={{ padding: "10px 0", borderTop: "1px solid var(--line-2)" }}>
                <a className="link" href={url} target="_blank" rel="noreferrer"><strong>{name}</strong></a>
                <span className="small muted">{why}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
