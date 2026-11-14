import Link from "next/link";
import { ArrowRight, BookOpenCheck, CalendarClock, FileSpreadsheet, HandCoins, Inbox, ListChecks, MailCheck, ShieldCheck } from "lucide-react";
import { HeroPreview } from "@/components/HeroPreview";
import { Mark } from "@/components/ui";

export default function Home() {
  return (
    <div className="site">
      <header className="site-nav">
        <div className="site-nav-in">
          <Link href="/" aria-label="Greenlight home"><Mark /></Link>
          <nav className="site-nav-links" aria-label="Sections">
            <a href="#how">How it works</a>
            <a href="#usg">For USG</a>
            <a href="#sponsors">Sponsors</a>
            <Link href="/club/rules">Rules</Link>
          </nav>
          <div className="row" style={{ marginLeft: "auto", gap: 8 }}>
            <Link href="/usg" className="btn btn-ghost btn-sm hide-sm">USG reviewer</Link>
            <Link href="/club" className="btn btn-primary btn-sm">Open the club desk</Link>
          </div>
        </div>
      </header>

      <main>
        <section className="section hero">
          <span className="eyebrow">For USC clubs and the USG Funding Department</span>
          <h1>Get your club funded the first time.</h1>
          <p className="lede">Greenlight checks every line of a USG funding request against the 2026–27 guidelines before you submit, and hands reviewers an application that is already checked.</p>
          <div className="row" style={{ justifyContent: "center", gap: 12 }}>
            <Link href="/club/new" className="btn btn-primary btn-lg">Start a request<ArrowRight /></Link>
            <Link href="/usg" className="btn btn-lg">See the reviewer side</Link>
          </div>
          <div style={{ width: "100%", display: "grid", justifyItems: "center", marginTop: 32 }}>
            <HeroPreview />
          </div>
        </section>

        <section className="band">
          <div className="section section-tight grid cols-4" style={{ gap: 32 }}>
            <div className="stat"><b>$388K</b><span>for the Funding Department in FY27, shared by more than 1,000 clubs.</span></div>
            <div className="stat"><b>44%</b><span>of the 378 organizations that applied in 2023 got funding: 166 in all.</span></div>
            <div className="stat"><b>2 days</b><span>to fix an incomplete application before it is denied.</span></div>
            <div className="stat"><b>5 reviews</b><span>every request passes through, from board director to Campus Activities.</span></div>
          </div>
        </section>

        <section id="how" className="section stack" style={{ gap: 56 }}>
          <div className="stack-sm" style={{ maxWidth: 720 }}>
            <span className="eyebrow">How it works</span>
            <h2 className="display-2">Describe the event. Fix what&apos;s red. Submit.</h2>
            <p className="lede">The AI reads and writes. The rules are checked in code against USG&apos;s own text, so every number is exact and every flag cites its section.</p>
          </div>
          <div className="grid cols-3" style={{ gap: 40 }}>
            {[
              { n: "1", Icon: FileSpreadsheet, t: "Write it like a text", d: "“Hackathon for 120 students on Feb 18, catering $5,400…” becomes USG's budget sheet, with the right funding board picked and explained." },
              { n: "2", Icon: ListChecks, t: "See every problem, with the fix", d: "Food over $35 a person, a vendor not on USG's list, gift cards, a missing UEPA. One click caps food, swaps the caterer or moves a line to sponsors." },
              { n: "3", Icon: CalendarClock, t: "Never miss the Wednesday", d: "Your exact deadline from USG's own sheet, and a heads-up when moving the event one week buys you two more months." },
            ].map(({ n, Icon, t, d }) => (
              <div key={n} className="feature">
                <span className="row" style={{ gap: 12 }}><span className="icon-tile"><Icon /></span><span className="step-n">Step {n}</span></span>
                <h3 style={{ fontSize: 20 }}>{t}</h3>
                <p className="muted">{d}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="usg" className="band-dark">
          <div className="section grid cols-2" style={{ gap: 56, alignItems: "center" }}>
            <div className="stack" style={{ gap: 20 }}>
              <span className="eyebrow" style={{ color: "var(--gold)" }}>For the Funding Department</span>
              <h2 className="display-2">A queue where every application arrives checked.</h2>
              <p className="lede">Reviewers see the rule problems, the money left on each board and an AI summary per check. They agree, disagree or edit; the AI drafts the decision email with the sections cited. A person decides every dollar.</p>
              <div><Link href="/usg" className="btn btn-lg" style={{ background: "var(--gold)", borderColor: "var(--gold)", color: "#111" }}>Open the review queue<ArrowRight /></Link></div>
            </div>
            <div className="grid cols-2" style={{ gap: 14 }}>
              {[
                { Icon: Inbox, t: "Pre-checked queue", d: "On time, complete, and which rules fail, before you open it." },
                { Icon: ShieldCheck, t: "Humans decide", d: "AI comments are suggestions you accept, reject or rewrite." },
                { Icon: MailCheck, t: "Reasons, written", d: "Every denial now needs a reason. The draft cites the guideline." },
                { Icon: BookOpenCheck, t: "One rulebook", d: "We found five places where USG's own documents disagree." },
              ].map(({ Icon, t, d }) => (
                <div key={t} className="stack-sm" style={{ background: "#1c1c1f", borderRadius: 16, padding: 20 }}>
                  <span className="icon-tile dark"><Icon /></span>
                  <h3>{t}</h3>
                  <p className="small muted">{d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="sponsors" className="section grid cols-2" style={{ gap: 56, alignItems: "center" }}>
          <div className="stack" style={{ gap: 18 }}>
            <span className="eyebrow">Sponsors</span>
            <h2 className="display-2">What USG can&apos;t fund, the Trojan network can.</h2>
            <p className="lede">Prizes, performers and food above the limit become priced sponsor packages. Greenlight ranks companies that recruit at USC, explains each fit, and drafts the email you send yourself. Support is in kind, paid straight to the vendor, as Campus Activities requires.</p>
            <div><Link href="/club/sponsors" className="link">Browse sponsors<ArrowRight /></Link></div>
          </div>
          <div className="card card-pad stack-sm">
            {[["Catering above $35 per person", "$1,200", "5-minute talk, recruiting table"], ["Gift cards for winners", "$600", "Logo on the slides, recap mention"], ["Swag", "$600", "Logo on event materials"]].map(([a, b, c], i) => (
              <div key={a} className="between" style={{ padding: "14px 0", borderTop: i ? "1px solid var(--line-2)" : 0 }}>
                <div className="row" style={{ gap: 12, flexWrap: "nowrap" }}><span className="icon-tile gold" style={{ width: 34, height: 34 }}><HandCoins style={{ width: 17, height: 17 }} /></span><div className="stack-xs"><strong className="small">{a}</strong><span className="tiny faint">{c}</span></div></div>
                <strong className="num">{b}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="band">
          <div className="section section-tight stack" style={{ justifyItems: "center", textAlign: "center", gap: 18 }}>
            <h2 className="display-2" style={{ maxWidth: "18ch" }}>Your next event starts with one sentence.</h2>
            <div className="row" style={{ justifyContent: "center" }}><Link href="/club/new" className="btn btn-primary btn-lg">Start a request<ArrowRight /></Link></div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="footer-in">
          <Mark />
          <p>Built for the AI@USC Hackathon, November 2026. Not an official USC or USG service.</p>
          <p>Sources: USG Funding Department <a href="https://docs.google.com/document/d/1noJFJ4SxrFGD1Zm-6EqUHpXSIOUuFIL-gIobWXcXCt0/edit" target="_blank" rel="noreferrer">2026-27 Guidelines</a>, FY26 Financial Report, FAQ and deadline sheet (usg.usc.edu/branches/funding); Daily Trojan and Annenberg Media reporting (2023-2026). Sample clubs and requests are made up.</p>
        </div>
      </footer>
    </div>
  );
}
