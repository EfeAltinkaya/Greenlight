# Greenlight architecture

Greenlight follows a club's money from idea to receipt: plan the event, ask USG, hear back, cover the gap (other USC money, then sponsors), and record every dollar on one ledger. The AI never decides money.

## Money journey

1. **Plan an event** — officer describes the event; intake builds budget lines and a draft USG application.
2. **Ask USG** — rules engine checks every line; officer submits; reviewers see a pre-checked queue.
3. **Hear back** — needs info, approve once fixed, or decision with per-item outcomes.
4. **Other USC money** — Legislative Fund, school funds, IgniteSC, etc. for lines USG will not cover.
5. **Sponsors** — campus claim, research, draft (guarded), officer approval, Gmail compose, deal, pay vendor.
6. **Ledger** — every dollar for every event, one line one source, export for board handoff.

## Data model

| Type | Role |
|------|------|
| `Club` | School, caps used, audience majors, sample/hasOfficers |
| `Event` / `EventInfo` | Date, venue, attendance, board |
| `Application` | Request to USG with items, docs, status machine |
| `LineItem` | One budget row |
| `LedgerLine` | One coverage row (source + status + evidence + history) |
| `LedgerEvent` | Append-only hash-linked history (Supabase) |
| `Deal` | In-kind sponsor agreement |
| `CampusClaim` | One live ask per company campus-wide |
| `AltRequest` | Ask to another USC funding office |
| `Person` | USG roster contact (`people.ts`) |
| `RuleVersion` | Rules live in `src/data/rules.ts` with quotes; versioned by semester text |

## Where AI is used (and the guard)

| Use | Model role | Guard |
|-----|------------|-------|
| Intake | Parse description → event + lines | Offline fallback; officer edits |
| Quote reading | Extract vendor/total | Zod schema; offline parser |
| Form answers | Draft EngageSC-style answers | Officer edits before submit |
| Review comments | Explain a check | Cite section; engine decides pass/fail |
| Decision email | Polish only | `decisionGuard.ts` rejects mismatches |
| Outreach draft | Write ask email | `outreachGuard.ts`; research gate (≥2 facts); never silent send |
| Reply classify | Label Gmail replies | Officer confirms next step |

## Greenlight Models (local classifiers)

Honest framing: Greenlight Models are small classifiers we trained on USC club-funding data, on top of the open BAAI bge-small-en-v1.5 encoder (MIT license). They run in your browser, so request text never leaves your device for classification. They suggest; the rules engine and people decide.

- One shared encoder (Xenova/bge-small-en-v1.5 ONNX q8 in a Web Worker); tiny logistic heads in `public/models/heads/`.
- GL-Items, GL-Board, GL-Replies suggest categories; GL-Vendor is embed + fuse.js (never silent). GL-Rank is off until ≥50 pooled outcomes.
- Test split is team-written only. Models never decide money or eligibility; `engine.ts` does.

## Documents

Real exports from proven libraries in `src/lib/export/`: Greenlight Check PDF (`checkPdf.tsx` + `@react-pdf/renderer`), ledger `.xlsx` (`ledgerExcel.ts` + `exceljs`), in-kind agreement `.docx` (`agreementDocx.ts` + `docx`), Legislative Fund six-section deck (`legFundPptx.ts` + `pptxgenjs`), outreach CSV, calendar (`.ics` via `eventTimeline.ts`). Quote PDFs can fall back to `unpdf` text extraction when Claude is offline. Credits on `/sources`. Models suggest only (confirmable "Did you mean…?"); `engine.ts` decides pass/fail.

## Where rules live

- **Data:** `src/data/rules.ts` (exact quote + section), `deadlines.ts`, `vendors.json`
- **Logic:** `src/lib/engine.ts` only (tested). Never in prompts.
- **Verdict:** `src/lib/verdict.ts` aggregates engine results into Matches / Matches after N fixes / Will not be funded.

## Adding another office's rules

1. Add quoted rules to a new data file (e.g. `legislativeRules.ts`).
2. Add check functions in a dedicated module or extend `engine.ts` behind an office flag.
3. Add tests that quote the section.
4. Wire the office's request form to write `LedgerLine` rows with the right `source`.
5. Do not put pass/fail logic in Claude prompts.
