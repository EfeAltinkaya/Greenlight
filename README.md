# Greenlight

**Live:** https://greenlight-lac-tau.vercel.app (auto-deploys every push to `main`)

USG funding requests for USC clubs, checked against the real 2026-27 rules before they are submitted, and a review queue for USG where every application arrives already checked. Built for the AI@USC Hackathon (Nov 14-15, 2026).

## Run it

```bash
npm install
cp .env.example .env.local   # paste the team's Anthropic key
npm run dev                  # http://localhost:3000
```

Without a key the app still works: rule checks run in code, and the AI steps fall back to a basic offline parser (the top bar shows "AI offline").

```bash
npm test        # rules engine tests
npm run build   # must pass before pushing
```

## Demo script

1. Landing page → **Start a request** → pick **Hackathon with catering** → **Build my application**. The request opens as steps: Event, Budget, Documents, Form answers, Review and submit.
2. Rule check flags: Chipotle is not on USG's Vendor List (so the 9-week deadline applies, and it passed Nov 11), food at $45 per person (limit $35), gift cards are never fundable, missing health permit and UEPA.
3. Click **Cap food at $4,200**, move gift cards and swag to sponsors, pick **Switch to a listed caterer** under the vendor (any caterer on USG's list). The deadline becomes **Wed, Nov 18**, and the card notes that moving the event one week later gains 56 days.
4. On the catering line, click **Attach quote** and pick `demo/panda-catering-quote.pdf` (a made-up sample quote). Greenlight reads it and confirms the $4,201.20 total matches the $4,200 line.
5. Enter UEPA `A31842`, tick the documents, **Draft with AI**, **Submit to USG**.
6. **USG reviewer** → the Hackathon is in the queue, pre-checked. Agree or disagree with each AI comment, pick the outcome, **Draft the email**, **Send decision**.
7. Back to **Club officer** → the award is shown; **Find sponsors** ranks companies for the $2,400 USG did not cover and drafts the pitch.

"Reset demo data" on the USG queue restores the sample applications.

## Sources

USG Funding Department 2026-27 Guidelines, FAQ, Application Breakdown slides, sample application, deadline sheet and Vendor List, all linked from usg.usc.edu/branches/funding. Sample clubs and requests in the app are made up and labeled "Sample".
