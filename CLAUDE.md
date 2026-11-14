@AGENTS.md

# Greenlight (AI@USC Hackathon, Nov 14-15 2026)

Read this first; it replaces re-exploring the repo. Spec: https://claude.ai/artifact/HYCnWQwF6J7aUNZAp6AAPB

## What it is
One app, two sides. Club officers describe an event in plain words; Greenlight fills USG's budget sheet, finds the USG deadline, checks every line against the 2026-27 Funding Guidelines, drafts the form answers, and turns whatever USG will not fund into sponsor asks. USG reviewers get a queue where every application arrives pre-checked, with AI comments they agree, disagree with or edit, and an AI-drafted decision email they send. **The AI never decides money.**

## Where things live
- `src/data/` = USG facts as data. `rules.ts` (every rule with its exact quote and section), `deadlines.ts` (USG's week-by-week deadline sheet), `vendors.json` (built from USG's Vendor List by `scripts/build-vendors.mjs`), `sponsors.ts`, `guidelines.ts` (text sent to Claude, cached).
- `src/lib/engine.ts` = the rules engine. Plain code, no AI. All pass/warn/fail results come from here. Tested in `tests/engine.test.ts`.
- `src/lib/ai.ts` = every Claude call (intake, quote reading, answers, review comments, decision email, sponsor match). Each has a zod schema and an offline fallback (`offline: true`). Models are in `src/lib/claude.ts` (Haiku for reading, Sonnet for writing).
- `src/lib/store.ts` = demo storage in localStorage (same browser shares club and USG views). Swap for Supabase later; the shapes in `types.ts` match the spec's tables.
- Pages: `/` (landing), club desk `/club` (overview), `/club/new`, `/club/app/[id]` (stepped request: event, budget, documents, answers, submit, then status and sponsors), `/club/deadlines`, `/club/sponsors`, `/club/rules`; USG `/usg` (queue), `/usg/app/[id]` (review), `/usg/insights`, `/usg/rules`. Shell in `src/components/AppShell.tsx`, shared UI in `src/components/`.

## Rules for changes
- A rule change goes in `src/data/rules.ts` + `engine.ts` + a test. Never put rule logic in prompts.
- Quote USG text exactly; cite the section. Do not invent rules, prices, contacts or USC ties.
- Before pushing: `npm test` and `npm run build` must pass. Never run `next build` while `next dev` runs in this folder.
- Design: USC Cardinal #990000 is the brand, USC Gold #FFCC00 the accent, neutral Apple-style surfaces. Tokens live in `src/app/globals.css`. Status (fix/check/clear/note) always has an icon and a word, never color alone. Fonts: Inter Tight (display), Inter (text).
- Dev server note: CSS edits sometimes need a dev server restart to show up.

## Decisions log
- Nov 14: Cache Components turned off; every screen is an interactive client page, and it blocked `useParams` without Suspense. (Efe)
- Nov 14: localStorage instead of a database for the demo; one browser shows both sides. (Efe)
- Nov 14: Deadlines are a lookup of USG's own sheet, never computed. (Efe)
- Nov 14: A food vendor not on USG's Vendor List triggers the 9-week deadline (guidelines Section 1 + FAQ). (Efe)
