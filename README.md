# Greenlight: club funding at USC, checked, routed and recorded.

**Live:** https://greenlight-lac-tau.vercel.app (auto-deploys every push to `main`)

Greenlight follows a club's money from idea to receipt: plan the event, ask USG, get USG's answer fast, cover whatever USG will not pay (other USC sources, then sponsors), and record every dollar in the club's ledger. Built for the AI@USC Hackathon (Nov 14-15, 2026).

From idea to event, without a red light.

## Run it

```bash
npm install
cp .env.example .env.local   # paste the team's Anthropic key
npm run dev                  # http://localhost:3000
```

Without a key the app still works: rule checks run in code, and the AI steps fall back to a basic offline parser (the top bar shows "AI offline").

```bash
npm test        # rules engine + voice + ledger + timeline tests
npm run build   # must pass before pushing
npm run smoke   # fetch every demo route (needs a built server, or pass a base URL)
```

## Demo script

1. **Landing** — scroll the Robotics Build Night story; watch the stoplight go red → amber → green. Open **I run a club**.
2. **Plan an event** — pick **Hackathon with catering** (or write your own). The deadline appears when you pick a date. **Build my application**.
3. **Fix** — Cap food, swap to a listed vendor, move gift cards to sponsors. Verdict becomes **Matches the guidelines**.
4. **Submit** — attach the sample quote, enter UEPA, draft answers, **Submit to USG**.
5. **USG** — open the queue (Matches first). Use **Approve once fixed** with a condition, or fund and send the decision email.
6. **Find the rest** — **Other USC money** prepares a draft for lines USG will not cover (writes the ledger). **Sponsors** → Companies: if another club holds a company, you see the campus-claim message instead of send.
7. **Ledger** — stacked bar reaches coverage across USG, other USC, and sponsors. Export CSV for next year's treasurer.

"Reset demo data" in the sidebar restores the sample applications and ledger.

## Sources

USG Funding Department 2026-27 Guidelines, FAQ, deadline sheet and Vendor List (usg.usc.edu/branches/funding). Sponsor ties: see `/sources`. Sample clubs are labeled Sample. Not an official USC or USG service.
