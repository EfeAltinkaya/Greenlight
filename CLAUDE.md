@AGENTS.md

# Greenlight (AI@USC Hackathon, Nov 14-15 2026)

Read this first; it replaces re-exploring the repo. Spec: https://claude.ai/artifact/HYCnWQwF6J7aUNZAp6AAPB

## What it is
One app, two sides. Club officers describe an event in plain words; Greenlight fills USG's budget sheet, finds the USG deadline, checks every line against the 2026-27 Funding Guidelines, drafts the form answers, and turns whatever USG will not fund into sponsor asks. USG reviewers get a queue where every application arrives pre-checked, with AI comments they agree, disagree with or edit, and an AI-drafted decision email they send. **The AI never decides money.**

## Where things live
- `src/data/` = USG facts as data. `rules.ts` (every rule with its exact quote and section), `deadlines.ts` (USG's week-by-week deadline sheet), `vendors.json` (built from USG's Vendor List by `scripts/build-vendors.mjs`), `sponsors.ts`, `guidelines.ts` (text sent to Claude, cached), `sources.ts` (the only stats the landing may state, each with its source), `team.ts` (team and founder copy).
- `src/lib/engine.ts` = the rules engine. Plain code, no AI. All pass/warn/fail results come from here. Tested in `tests/engine.test.ts`.
- `src/lib/ai.ts` = every Claude call (intake, quote reading, answers, review comments, decision email, sponsor match). Each has a zod schema and an offline fallback (`offline: true`). Models are in `src/lib/claude.ts` (Haiku for reading, Sonnet for writing).
- `src/lib/store.ts` = app state (localStorage in demo mode). When signed in, `src/lib/sync.ts` mirrors every write to Supabase and reloads on Realtime changes. `src/lib/session.ts` = auth. `src/lib/workflow.ts` = state machines for requests and sponsor deals (each step notifies the other side). `decision.ts` = USG decision support, `contract.ts` = standard in-kind agreement.
- Supabase: schema in `supabase/schema.sql` (row-level security per role), apply with `node scripts/db-setup.mjs`, seed with `npx tsx scripts/db-seed.mts`. `scripts/test-accounts.mjs` makes test logins (saved only in .env.local); `node scripts/test-rls.mjs` checks permissions and live updates. USG sign-up needs the invite code in the `settings` table.
- Email: `/api/notify` (Resend, needs RESEND_API_KEY). Gmail read-only: `/api/gmail/*` (needs GOOGLE_CLIENT_ID/SECRET). Outlook and Drive are roadmap only.
- Landing `/` follows one sample event (Robotics Build Night) through the real engine: `src/lib/landingStory.ts` (tested in `tests/landingStory.test.ts`), chapters in `src/components/Story.tsx`. Serif headlines use Instrument Serif (`--font-serif`).
- Pages: `/` (landing), club desk `/club` (overview), `/club/new`, `/club/app/[id]` (stepped request: event, budget, documents, answers, submit, then status and sponsors), `/club/deadlines`, `/club/sponsors`, `/club/rules`; USG `/usg` (queue), `/usg/app/[id]` (review), `/usg/insights`, `/usg/rules`. Shell in `src/components/AppShell.tsx`, shared UI in `src/components/`.

## Rules for changes
- A rule change goes in `src/data/rules.ts` + `engine.ts` + a test. Never put rule logic in prompts.
- Quote USG text exactly; cite the section. Do not invent rules, prices, contacts or USC ties.
- Before pushing: `npm test` and `npm run build` must pass. Never run `next build` while `next dev` runs in this folder.
- Design: USC Cardinal #990000 is the brand, USC Gold #FFCC00 the accent, neutral Apple-style surfaces. Tokens live in `src/app/globals.css`. Status (fix/check/clear/note) always has an icon and a word, never color alone. Look: warm stone background, deep cardinal sidebar. Fonts: Schibsted Grotesk (display), Source Sans 3 (text).
- Dev server note: CSS edits sometimes need a dev server restart to show up.

## TODO
- Confirm the founder story wording with the team and, if we quote Hasan Askari directly anywhere, get his permission first. Fill in each member's role, school and link in `TEAM` once they confirm it.

## Decisions log
- Nov 15: Slogan is "Your Highway to Capital"; brand mark is the Trojan helmet + stoplight lockup in `public/greenlight-logo.png`. (audit)
- Nov 15: Greenlight Models = one shared BAAI bge-small-en-v1.5 encoder + tiny logistic heads; they suggest only and never decide money or eligibility; test split is team-written only; honest framing on `/models`. (audit)
- Nov 15: Document exports use proven libraries (react-pdf, exceljs, docx, pptxgenjs, ics); vendor match uses fuse.js (confirmable, never silent); money math property-tested with fast-check. (audit)
- Nov 15: Ledger is the spine (`LedgerLine` / `ledger.ts`); every sample club ships with a realistic multi-source ledger; new clubs get a $0 example event. (audit)
- Nov 15: Campus-wide sponsor claims (one live ask per company, 21-day hold) enforced with a partial unique index in Supabase. (audit)
- Nov 15: Sponsor ties only from verified URLs (Career Connections 2026-27, AI@USC, Viterbi top employers, Career Center recruiters); gradadmission partners page is not used for sponsor ties. (audit)
- Nov 15: Voice rules: no em dashes, no buzzwords; say who does what; empty states teach one next action. (audit)
- Nov 15: Landing concept is "Follow one event's money" with a stoplight progressing red to green; no stock photos or Step 1/2/3 icon cards. (audit)
- Nov 14: Cache Components turned off; every screen is an interactive client page, and it blocked `useParams` without Suspense. (Efe)
- Nov 14: localStorage demo mode kept; real accounts via Supabase when env vars exist. (Efe)
- Nov 14: Sponsors pay vendors directly, never the club (Campus Activities in-kind rule). (Efe)
- Nov 14: Deadlines are a lookup of USG's own sheet, never computed. (Efe)
- Nov 14: A food vendor not on USG's Vendor List triggers the 9-week deadline (guidelines Section 1 + FAQ). (Efe)
- Nov 14: Decision emails are built in code (`decisionGuard.ts`); AI only polishes and any draft that contradicts the decision is discarded. Awards are capped in code at the request and the club's remaining $8,000. (Efe)
- Nov 14: Sponsor emails pass `outreachGuard.ts` (Chancery-style validators: no filler, no invented amounts or dates, must name the company and event). Follow-ups only while a company is at Emailed. (Efe)
- Nov 14: "Other funding sources" is never AI-filled; the club answers it. Post-event steps are not stated until USG confirms them. (Efe)
- Nov 14: A USG Funding officer interview (notes in `docs/usg-officer-call.md`; she is not to be quoted or named) drove: vendor confirmation on every non-food purchase, reviewer "Send back to fix" (fix list instead of denial), a fast lane for clean applications, and an amber $4,000-per-semester check. (Efe)
- Nov 14: Call with a USG funding board associate director (role only in product copy; never named in the UI). Core ask: tell a club "this matches the guidelines" or "this does not" before USG sees it. No turnaround promises (reviews can take hours or weeks). Per-semester $4,000 split is unconfirmed planning guidance, never an enforced rule. Small problems: email the club then fund; bigger problems: back-and-forth. Every request treated the same regardless of amount. (Efe)
- Nov 14: Fall 2026 Funding Department roster stored as data in `src/data/people.ts` with source URL and as-of date; refresh via `scripts/build-roster.mjs` (manual). (Efe)
- Nov 14: Minor-fix path is **Approve once fixed** (`Decision.conditions` + `pendingFixes`). Greenlight heuristics (qty-per-attendee, duplicate item, durable keywords) are labelled "Greenlight check, not a USG rule" and never decide money. (Efe)
- Nov 14: Greenlight Check verdict and printable `/club/app/[id]/check` come only from `engine.ts`. Request IDs are `GL-26-XXXX` and appear in every Resend subject. (Efe)
