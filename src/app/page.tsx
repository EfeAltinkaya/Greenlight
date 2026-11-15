import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import { LogoLockup, Mark } from "@/components/ui";
import { NavActions, ScrollIn, StartRequest } from "@/components/Landing";
import { Chapter, FixDemo, LedgerBar, QueueDemo, RuleStamps, StoryRail, TextToBudget, type FixState, type LedgerPart, type QueueRow, type StampRow } from "@/components/Story";
import { fmtDate } from "@/lib/engine";
import { FIXES, STORY_TEXT, storyApp, storyState, type FixId } from "@/lib/landingStory";
import { SPONSORS, SPONSOR_NOTE } from "@/data/sponsors";
import { SOURCES, source } from "@/data/sources";
import { FOUNDER_STORY, TEAM, TEAM_PHOTO } from "@/data/team";
import { BOARDS, GUIDELINES_URL } from "@/data/rules";
import { DEADLINES_URL } from "@/data/deadlines";

export const metadata: Metadata = {
  title: "Greenlight: Your Highway to Capital",
  description: "Greenlight: Your Highway to Capital. Club funding at USC, checked against every USG rule before you send it, with the rest found from USC and sponsors on one ledger.",
};

const LONG = { weekday: "long", month: "short", day: "numeric" } as const;

function fixStates(): Record<string, FixState> {
  const out: Record<string, FixState> = {};
  for (let mask = 0; mask < 1 << FIXES.length; mask++) {
    const on = FIXES.filter((_, i) => mask & (1 << i)).map((f) => f.id) as FixId[];
    const s = storyState(on);
    const d = s.deadline!;
    out[on.join(",")] = {
      fixes: s.fixes,
      warns: s.warns,
      total: s.total,
      late: d.passed,
      deadline: d.passed ? `Deadline passed ${fmtDate(d.date, LONG)}` : `Submit by ${fmtDate(d.date, LONG)}`,
      deadlineSub: d.passed
        ? "A caterer not on USG's Vendor List moves this request to the 9-week deadline. Late requests are denied automatically."
        : `${d.daysLeft} days left. 6-week deadline, looked up in USG's own deadline sheet.`,
      open: s.checks.filter((c) => c.level === "fail").map((c) => c.title),
    };
  }
  return out;
}

const STAMP_ORDER: [string, string | undefined][] = [["late", undefined], ["food-per-person", "food"], ["vendor-list", "food"], ["ineligible-gift", "gifts"], ["over-4k", undefined], ["vendor-list", "supplies"]];

export default function Home() {
  const before = storyState([]);
  const after = storyState(FIXES.map((f) => f.id));
  const draft = storyApp([]);
  const stamps: StampRow[] = STAMP_ORDER.flatMap(([rule, item]) => before.checks.filter((c) => c.ruleId === rule && c.itemId === item).slice(0, 1)).map((c) => ({ level: c.level, title: c.title, detail: c.detail, quote: c.quote, section: c.section }));
  const rows = draft.items.map((i) => ({ item: i.item, vendor: i.vendor, qty: i.quantity, unit: i.unitPrice, total: i.total }));
  const facts = [fmtDate(draft.event.date, LONG), draft.event.location, `${draft.event.attendance} students`, BOARDS[draft.event.board].name];

  const queue: QueueRow[] = [
    { title: "Robotics Build Night", club: "Trojan Builders", amount: after.total, level: "warn", status: "0 to fix, 1 to check", timing: "Sent Nov 15, 3 days early", focus: true },
    { title: "Spring Showcase", club: "Southside Dance Collective", amount: 3900, level: "fail", status: "2 to fix", timing: "Sent Nov 12" },
    { title: "Beach Cleanup", club: "Shoreline Service Club", amount: 600, level: "pass", status: "Nothing to fix", timing: "Sent Nov 10" },
  ];
  const note = "The club lists Viterbi SOS for food above USG's $35 limit. USG's share is exactly 80 people at $35, so the two sources pay for different parts of the meal. Section 6 lists other University funding as grounds for denial: worth confirming with the club before approving.";
  const email = "Hi Trojan Builders, USG approved $4,000 for Robotics Build Night on February 18: $2,800 for dinner from Panda Catering (80 people at $35) and $1,200 for build supplies. Please confirm Viterbi SOS covers only the food above $35 a person. Within 3 business days after the event, send the evaluation, photos and final invoices (Section 9).";

  const sponsors = ["northrop", "nvidia", "apple"].map((id) => SPONSORS.find((s) => s.id === id)!).filter(Boolean);
  const ledger: LedgerPart[] = [
    { label: "USG Funding Department", amount: after.total, status: "Approved by a USG reviewer", level: "pass", tone: "cardinal" },
    { label: "Viterbi SOS, food above $35", amount: 800, status: "Requested", level: "warn", tone: "gold" },
    { label: "Sponsor, prizes in kind", amount: 500, status: "Ask drafted, paid to the vendor", level: "info", tone: "ink" },
  ];

  return (
    <div className="ed">
      <header className="site-nav ed-nav">
        <div className="site-nav-in">
          <Link href="/" aria-label="Greenlight home"><Mark slogan /></Link>
          <nav className="site-nav-links" aria-label="Sections">
            <a href="#story">The story</a>
            <a href="#why">Why USC</a>
            <a href="#adopt">For USG</a>
            <a href="#team">Team</a>
          </nav>
          <div className="row nav-actions">
            <NavActions />
          </div>
        </div>
      </header>

      <main>
        <section className="ed-hero ed-hero-stack">
          <ScrollIn className="ed-hero-logo"><LogoLockup className="ed-hero-lockup" /></ScrollIn>
          <h1 className="ed-h1">What would your club build if <em>every light were green?</em></h1>
          <p className="ed-sub">Check your USG request against every rule before you send it. Find the rest from USC and sponsors.</p>
          <div className="row" style={{ gap: 12, justifyContent: "center" }}>
            <StartRequest />
            <a href="#story" className="btn btn-lg ed-btn-quiet">Follow one event<ArrowRight /></a>
          </div>
        </section>

        <section id="story" className="ed-intro">
          <p>Follow one event: <b>Robotics Build Night</b>, 80 students, February 18. USG&apos;s deadline is three days away.</p>
          <p className="ed-fine">A made-up club. Every check and number below comes from the real rules engine.</p>
        </section>

        <StoryRail>
          <Chapter light={0}>
            <h2 className="ed-h2">An officer describes the night in plain words.</h2>
            <p className="ed-p">No form. Greenlight fills USG&apos;s budget sheet and picks the board.</p>
            <TextToBudget text={STORY_TEXT} rows={rows} total={before.total} facts={facts} />
          </Chapter>

          <Chapter light={0}>
            <h2 className="ed-h2">Every line gets stamped against the rules.</h2>
            <p className="ed-p">Plain code, not AI, quoting each guideline. As typed: {before.fixes} red lights.</p>
            <RuleStamps rows={stamps} />
          </Chapter>

          <Chapter light={1}>
            <h2 className="ed-h2">Most fixes are one click.</h2>
            <p className="ed-p">Try them. The deadline and total update live.</p>
            <FixDemo fixes={FIXES} states={fixStates()} />
          </Chapter>

          <Chapter light={2}>
            <h2 className="ed-h2">USG opens a request that is already checked.</h2>
            <p className="ed-p">The AI drafts notes and the email. The reviewer sets the amount and presses Send.</p>
            <QueueDemo rows={queue} note={note} email={email} />
          </Chapter>

          <Chapter light={2}>
            <h2 className="ed-h2">What USG won&apos;t fund becomes a sponsor ask.</h2>
            <p className="ed-p">Gift cards go to sponsors, ranked by who hires the club&apos;s majors. Sponsors pay the vendor, never the club.</p>
            <div className="ties">
              {sponsors.map((s) => (
                <div key={s.id} className="tie">
                  <b className="tie-name">{s.name}</b>
                  <span className="tie-meta">{s.industry}. Gives {s.inKind.join(", ")}.</span>
                  <ul>
                    {(s.ties ?? []).map((t) => (
                      <li key={t.label}><a href={t.source} target="_blank" rel="noreferrer">{t.label}<ExternalLink /></a></li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className="ed-fine">{SPONSOR_NOTE} Listing a company here is not a claim that it sponsors anything.</p>
          </Chapter>

          <Chapter light={2}>
            <h2 className="ed-h2">Every dollar, on one ledger.</h2>
            <p className="ed-p">USG, Viterbi and a sponsor: one bar for every dollar.</p>
            <LedgerBar parts={ledger} />
          </Chapter>
        </StoryRail>

        <section id="why" className="ed-band">
          <ScrollIn className="ed-wrap">
            <h2 className="ed-h2 big">Why USC needs this</h2>
            <div className="ed-stats">
              {SOURCES.map((s) => (
                <div key={s.id} className="ed-stat">
                  <b>{s.stat}</b>
                  <p>{s.claim}</p>
                  <span className="ed-cite">{s.url ? <a href={s.url} target="_blank" rel="noreferrer">{s.source}</a> : s.source}</span>
                </div>
              ))}
            </div>
            <p className="ed-p wide">A USG Funding officer told us most denials are missed guidelines. Her wish: software that won&apos;t let a club submit until everything passes. That&apos;s Greenlight.</p>
          </ScrollIn>
        </section>

        <section className="ed-sec">
          <ScrollIn className="ed-wrap">
            <h2 className="ed-h2 big">How it works</h2>
            
            <dl className="ed-how">
              <div>
                <dt>Code checks the rules</dt>
                <dd>Built from USG&apos;s <a href={GUIDELINES_URL} target="_blank" rel="noreferrer">guidelines</a>, Vendor List and <a href={DEADLINES_URL} target="_blank" rel="noreferrer">deadline sheet</a>, quote for quote.</dd>
              </div>
              <div>
                <dt>AI reads and writes</dt>
                <dd>Claude drafts budgets, answers, notes and emails. Every draft is editable.</dd>
              </div>
              <div>
                <dt>People decide</dt>
                <dd>Reviewers set every amount. The AI never decides money.</dd>
              </div>
            </dl>
          </ScrollIn>
        </section>

        <section id="adopt" className="ed-band">
          <ScrollIn className="ed-wrap">
            <h2 className="ed-h2 big">How USG adopts it</h2>
            <div className="ed-cols">
              <p><b>No new rules.</b> It uses the guidelines USG already publishes.</p>
              <p><b>Start with one board.</b> One board pilots it; USG controls reviewer invites.</p>
              <p><b>Keep the paper trail.</b> Every decision keeps its checks, notes and reason.</p>
            </div>
          </ScrollIn>
        </section>

        <section className="ed-sec">
          <ScrollIn className="ed-wrap ed-founder">
            <h2 className="ed-h2 big">Why it&apos;s called Greenlight</h2>
            {FOUNDER_STORY.paragraphs.map((p) => <p key={p} className="ed-founder-p">{p}</p>)}
          </ScrollIn>
        </section>

        <section id="team" className="ed-band">
          <ScrollIn className="ed-wrap">
            <h2 className="ed-h2 big">Team</h2>
            <figure className="ed-team-photo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={TEAM_PHOTO.src} alt={TEAM_PHOTO.alt} width={2048} height={1218} />
              <figcaption className="ed-fine">{TEAM_PHOTO.caption}</figcaption>
            </figure>
            <ul className="ed-team">
              {TEAM.map((m) => (
                <li key={m.name}>
                  {m.link ? (
                    <a className="ed-team-link" href={m.link} target="_blank" rel="noreferrer">
                      <b>{m.name}</b>
                      <span className="faint">LinkedIn</span>
                    </a>
                  ) : (
                    <b>{m.name}</b>
                  )}
                </li>
              ))}
            </ul>
          </ScrollIn>
        </section>

        <section className="ed-doors" aria-label="Choose your side">
          <div className="door door-club">
            <h2>I run a club.</h2>
            <p>Describe your next event. We check it and find the rest.</p>
            <StartRequest className="btn btn-lg door-btn" />
          </div>
          <div className="door door-usg">
            <h2>I review for USG.</h2>
            <p>Every request arrives already checked.</p>
            <Link href="/usg" className="btn btn-lg door-btn">Open the review queue<ArrowRight /></Link>
          </div>
        </section>
      </main>

      <footer className="ed-footer">
        <div className="ed-wrap">
          <Mark slogan />
          <p>Built at AI@USC Hackathon Nov 2026. Not an official USC or USG service.</p>
          <p className="ed-fine"><Link href="/models">Greenlight Models</Link> · <Link href="/sources">Data sources</Link> · <Link href="/privacy">Privacy</Link></p>
          <p className="ed-fine">
            Sources: <a href={GUIDELINES_URL} target="_blank" rel="noreferrer">USG 2026-27 Funding Guidelines</a>, <a href={DEADLINES_URL} target="_blank" rel="noreferrer">USG deadline sheet</a>, <a href={source("fy26-total").url!} target="_blank" rel="noreferrer">USG FY26 Financial Report</a>, a conversation with a USG Funding Department officer (Nov 14, 2026, paraphrased), and the USC sources linked on each sponsor tie. Sample clubs and requests are made up.
          </p>
        </div>
      </footer>
    </div>
  );
}
