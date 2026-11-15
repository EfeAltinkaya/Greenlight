import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import { Mark } from "@/components/ui";
import { NavActions, ScrollIn, StartRequest } from "@/components/Landing";
import { Chapter, FixDemo, HeroStoplight, LedgerBar, QueueDemo, RuleStamps, StoryRail, TextToBudget, type FixState, type LedgerPart, type QueueRow, type StampRow } from "@/components/Story";
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
        <section className="ed-hero">
          <div className="ed-hero-copy">
            <h1 className="ed-h1">What would your club build if <em>every light were green?</em></h1>
            <p className="ed-sub">Greenlight writes your USG request, checks it against every rule before you send it, finds the rest from USC and sponsors, and keeps every dollar on one ledger.</p>
            <div className="row" style={{ gap: 12 }}>
              <StartRequest />
              <a href="#story" className="btn btn-lg ed-btn-quiet">Follow one event<ArrowRight /></a>
            </div>
            <p className="ed-small">From idea to event, without a red light.</p>
          </div>
          <div className="ed-hero-light"><HeroStoplight /></div>
        </section>

        <section id="story" className="ed-intro">
          <p>Follow one event&apos;s money. <b>Robotics Build Night</b>: Trojan Builders, 80 students, Thursday, February 18. It is November 15, and USG&apos;s deadline for that week is three days away.</p>
          <p className="ed-fine">Trojan Builders and its request are made up. Every check, deadline and total below comes from Greenlight&apos;s rules engine running on that request.</p>
        </section>

        <StoryRail>
          <Chapter light={0}>
            <h2 className="ed-h2">An officer describes the night in plain words.</h2>
            <p className="ed-p">No budget sheet, no form. Greenlight reads the plan, fills USG&apos;s budget lines, works out the cost per person and picks the funding board.</p>
            <TextToBudget text={STORY_TEXT} rows={rows} total={before.total} facts={facts} />
          </Chapter>

          <Chapter light={0}>
            <h2 className="ed-h2">Every line gets stamped against the rules.</h2>
            <p className="ed-p">The checks are plain code, not AI. Each one quotes the USG guideline it comes from, with the section, so nobody has to take Greenlight&apos;s word for it. As typed, this request has {before.fixes} red lights: it would be denied before anyone read it.</p>
            <RuleStamps rows={stamps} />
          </Chapter>

          <Chapter light={1}>
            <h2 className="ed-h2">Most fixes are one click.</h2>
            <p className="ed-p">Cap the food at USG&apos;s limit, switch to a caterer on USG&apos;s list, move the gift cards to a sponsor. Try them. The deadline, the total and the red lights all update from the same engine.</p>
            <FixDemo fixes={FIXES} states={fixStates()} />
          </Chapter>

          <Chapter light={2}>
            <h2 className="ed-h2">USG opens a request that is already checked.</h2>
            <p className="ed-p">In the review queue, reviewers see what is broken, what is late and what is clean before opening a file. The AI writes a note on each check and drafts the decision email. The reviewer agrees, disagrees or edits, sets the amount and presses Send.</p>
            <QueueDemo rows={queue} note={note} email={email} />
          </Chapter>

          <Chapter light={2}>
            <h2 className="ed-h2">What USG won&apos;t fund becomes a sponsor ask.</h2>
            <p className="ed-p">USG never funds gift cards, so the $500 for prizes goes on a sponsor list. Greenlight ranks companies by who hires from the club&apos;s majors, and shows each company&apos;s USC ties with the source. Sponsors give in kind or pay the vendor directly, never the club.</p>
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
            <p className="ed-p">USG, Viterbi SOS and the sponsor each cover a different part of the same $5,300 night. One bar shows where every dollar comes from and where each ask stands, for the club and for USG.</p>
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
            <p className="ed-p wide">A USG Funding Department officer told us the guidelines are the main problem: the rules are not changing, clubs just don&apos;t check them, and when a request follows them a denial is rare. What slows money down is the email back-and-forth to fix what could have been caught before submitting. Her top wish was software that knows the guidelines, so a club cannot submit until everything passes. That is Greenlight.</p>
          </ScrollIn>
        </section>

        <section className="ed-sec">
          <ScrollIn className="ed-wrap">
            <h2 className="ed-h2 big">How it works</h2>
            <p className="ed-p wide">Three kinds of work, kept apart on purpose.</p>
            <dl className="ed-how">
              <div>
                <dt>Code checks the rules</dt>
                <dd>Every pass, check and fix comes from a rules engine written in plain code against USG&apos;s <a href={GUIDELINES_URL} target="_blank" rel="noreferrer">2026-27 Funding Guidelines</a>, the Vendor List and the <a href={DEADLINES_URL} target="_blank" rel="noreferrer">deadline sheet</a>. Each rule carries its exact quote and section. Rules never live in an AI prompt.</dd>
              </div>
              <div>
                <dt>AI reads and writes</dt>
                <dd>Claude turns an officer&apos;s description into budget lines, reads vendor quotes, drafts form answers, writes reviewer notes and the decision email, and matches sponsors. Every draft can be edited, and the app still works offline without it.</dd>
              </div>
              <div>
                <dt>People decide</dt>
                <dd>Officers send their own requests and sponsor emails. USG reviewers agree, disagree or edit each AI note, set every amount and press every Send. The AI never decides money.</dd>
              </div>
            </dl>
          </ScrollIn>
        </section>

        <section id="adopt" className="ed-band">
          <ScrollIn className="ed-wrap">
            <h2 className="ed-h2 big">How USG adopts it</h2>
            <div className="ed-cols">
              <p><b>No new rules.</b> Greenlight encodes the guidelines USG already publishes, quote for quote. When the guidelines change, a USG officer reviews one file of rules, not a retrained model.</p>
              <p><b>Start with one board.</b> Clubs on one funding board prepare requests in Greenlight while reviewers on that board use the checked queue. Reviewer accounts need an invite code that USG controls.</p>
              <p><b>Keep the paper trail.</b> The checks, the reviewer&apos;s notes and the decision email stay with each request, so a denial always has a reason that cites a section, and USG can see how much each board has left.</p>
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
              <img src={TEAM_PHOTO.src} alt={TEAM_PHOTO.alt} width={1024} height={609} />
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
            <p>Describe your next event. Greenlight writes the request, checks it and finds the rest.</p>
            <StartRequest className="btn btn-lg door-btn" />
          </div>
          <div className="door door-usg">
            <h2>I review for USG.</h2>
            <p>Open a queue where every request arrives checked, with a note on each rule and a draft email.</p>
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
