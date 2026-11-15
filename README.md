# Greenlight: Your Highway to Capital

**Live:** https://greenlightusc.site (also https://greenlight-lac-tau.vercel.app; auto-deploys every push to `main`)

Greenlight follows a club's money from idea to receipt: plan the event, ask USG, get USG's answer fast, cover whatever USG will not pay (other USC sources, then sponsors), and record every dollar in the club's ledger. Built for the AI@USC Hackathon (Nov 14-15, 2026).

Your Highway to Capital. From idea to event, without a red light.

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

Slogan: **Your Highway to Capital.** From idea to event, without a red light.

1. **Landing** — scroll the Robotics Build Night story; watch the stoplight go red → amber → green. Open **I run a club**.
2. **Plan an event** — pick **Hackathon with catering** (or write your own). The deadline appears when you pick a date. **Build my application**.
3. **Fix** — Cap food, swap to a listed vendor (confirm "Did you mean…?" if Fuse suggests one), move gift cards to sponsors. Verdict becomes **Matches the guidelines**.
4. **Submit** — attach the sample quote, enter UEPA, draft answers, **Submit to USG**. Open **Greenlight Check** and **Download PDF**.
5. **USG** — open the queue (Matches first). Use **Approve once fixed** with a condition, or fund and send the decision email.
6. **Find the rest** — **Other USC money** prepares a draft for lines USG will not cover (writes the ledger). For Legislative Fund, download the six-section **Slide deck (.pptx)**. **Sponsors** → Companies: if another club holds a company, you see the campus-claim message instead of send. Export **Outreach CSV** from the Outreach tab.
7. **Ledger** — stacked bar reaches coverage across USG, other USC, and sponsors. Export **CSV** or **Excel (.xlsx)** for next year's treasurer.

"Reset demo data" in the sidebar restores the sample applications and ledger.

## Sources

USG Funding Department 2026-27 Guidelines, FAQ, deadline sheet and Vendor List (usg.usc.edu/branches/funding). Sponsor ties: see `/sources`. Sample clubs are labeled Sample. Not an official USC or USG service.
