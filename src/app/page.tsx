import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpenCheck, CalendarClock, FileSpreadsheet, HandCoins, Inbox, ListChecks, MailCheck, ShieldCheck } from "lucide-react";
import { HeroPreview } from "@/components/HeroPreview";
import { Mark } from "@/components/ui";
import { NavActions, ScrollIn, StartRequest, TypedHeadline } from "@/components/Landing";
import springfest from "../../public/photos/springfest-concert.jpg";
import band from "../../public/photos/trojan-marching-band.jpg";
import kaufman from "../../public/photos/kaufman-commencement.jpg";

export const metadata = { title: "Greenlight · USG funding for USC clubs" };

const PHOTOS = [
  { src: springfest, alt: "Crowd at an evening Springfest concert on the USC campus, with the Von KleinSmid Center tower behind the stage", caption: "Springfest concert on campus", credit: "Public domain, via Wikimedia Commons", href: "https://commons.wikimedia.org/wiki/File:USCSpringfest2005.JPG" },
  { src: band, alt: "The USC Trojan Marching Band in cardinal and gold uniforms marching with sousaphones", caption: "Trojan Marching Band at the 2017 Rose Parade", credit: "Prayitno, CC BY 2.0, via Wikimedia Commons", href: "https://commons.wikimedia.org/wiki/File:USC_Trojan_Marching_Band_(33256755245).jpg" },
  { src: kaufman, alt: "Graduates dancing down the aisle at the USC Kaufman School of Dance commencement while families film on their phones", caption: "Kaufman School of Dance commencement, 2024", credit: "USC Kaufman, public domain, via Wikimedia Commons", href: "https://commons.wikimedia.org/wiki/File:USC-Kaufman_Commencement_2024_-_53769677396.jpg" },
];

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
          <div className="row nav-actions">
            <NavActions />
          </div>
        </div>
      </header>

      <main>
        <section className="section hero">
          <span className="eyebrow">For USC clubs and the USG Funding Department</span>
          <TypedHeadline text="A USG funding request, checked before you submit it." />
          <p className="lede">Describe your event and Greenlight fills in USG&apos;s budget sheet, finds your deadline and checks each line against the 2026-27 Funding Guidelines. Reviewers get the application with the checks already done.</p>
          <div className="row" style={{ justifyContent: "center", gap: 12 }}>
            <StartRequest />
            <Link href="/club" className="btn btn-lg">Explore the tool first</Link>
          </div>
          <ScrollIn delay={0.2} style={{ width: "100%", display: "grid", justifyItems: "center", marginTop: 32 }}>
            <HeroPreview />
          </ScrollIn>
        </section>

        <section className="band">
          <ScrollIn className="section section-tight grid cols-4 stats-band" style={{ gap: 32 }}>
            <div className="stat"><b>$362K</b><span>across the four funding boards in FY26, shared by more than 1,000 clubs (USG FY26 Financial Report).</span></div>
            <div className="stat"><b>44%</b><span>of the 378 organizations that applied in 2023 got funding: 166 in all (<a href="https://www.uscannenbergmedia.com/2023/04/29/usg-rejected-funding-for-established-student-organizations/" target="_blank" rel="noreferrer">Annenberg Media</a>).</span></div>
            <div className="stat"><b>2 days</b><span>to fix an incomplete application before USG denies it.</span></div>
            <div className="stat"><b>3 reviewers</b><span>on every fund (a director, an associate director and a delegate) check each application against the guidelines, whatever the amount.</span></div>
          </ScrollIn>
        </section>

        <section className="section stack" style={{ gap: 40 }}>
          <ScrollIn className="stack-sm" style={{ maxWidth: 720 }}>
            <span className="eyebrow">What the money pays for</span>
            <h2 className="display-2">Concerts, showcases and ceremonies that students run.</h2>
            <p className="lede">In FY26 the Performing and Visual Arts board alone funded 4 concerts, 9 dance showcases and 9 other performances. Each one started as a funding application.</p>
          </ScrollIn>
          <ScrollIn className="photo-grid" delay={0.1}>
            {PHOTOS.map((p, i) => (
              <figure key={p.caption} className={"photo" + (i === 0 ? " photo-wide" : "")}>
                <Image src={p.src} alt={p.alt} placeholder="blur" sizes={i === 0 ? "(max-width: 760px) 100vw, 66vw" : "(max-width: 760px) 100vw, 33vw"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <figcaption>
                  <span>{p.caption}</span>
                  <a href={p.href} target="_blank" rel="noreferrer">{p.credit}</a>
                </figcaption>
              </figure>
            ))}
          </ScrollIn>
        </section>

        <section id="how" className="band">
          <ScrollIn className="section stack" style={{ gap: 48 }}>
            <div className="stack-sm" style={{ maxWidth: 720 }}>
              <span className="eyebrow">How it works</span>
              <h2 className="display-2">From a few sentences to a complete application.</h2>
              <p className="lede">The AI reads your description and drafts the written answers. The rules are checked in code against USG&apos;s guidelines, and every flag quotes the section it comes from.</p>
            </div>
            <div className="grid cols-3" style={{ gap: 40 }}>
              {[
                { n: "1", Icon: FileSpreadsheet, t: "Describe the event", d: "Write what you are planning, with the date, the number of people and what each thing costs. Greenlight turns it into USG's budget sheet and picks the funding board." },
                { n: "2", Icon: ListChecks, t: "Fix what the guidelines flag", d: "Food over $35 a person, a caterer that is not on USG's Vendor List, gift cards, a missing UEPA number. Most fixes take one click." },
                { n: "3", Icon: CalendarClock, t: "Submit before your Wednesday", d: "Your deadline comes from USG's own deadline sheet. If moving the event a week later gives you more time, Greenlight shows that too." },
              ].map(({ n, Icon, t, d }) => (
                <div key={n} className="feature">
                  <span className="row" style={{ gap: 12 }}><span className="icon-tile"><Icon /></span><span className="step-n">Step {n}</span></span>
                  <h3 style={{ fontSize: 20 }}>{t}</h3>
                  <p className="muted">{d}</p>
                </div>
              ))}
            </div>
          </ScrollIn>
        </section>

        <section id="usg" className="band-dark">
          <ScrollIn className="section grid cols-2" style={{ gap: 56, alignItems: "center" }}>
            <div className="stack" style={{ gap: 20 }}>
              <span className="eyebrow" style={{ color: "var(--gold)" }}>For the Funding Department</span>
              <h2 className="display-2">Applications arrive with the checks already done.</h2>
              <p className="lede">The queue shows which rules each request breaks, whether it came in on time and how much is left on each board. The AI writes a note for each check and a draft of the decision email. The reviewer accepts or rewrites each note and decides the amount.</p>
              <div><Link href="/usg" className="btn btn-lg" style={{ background: "var(--gold)", borderColor: "var(--gold)", color: "#111" }}>Open the review queue<ArrowRight /></Link></div>
            </div>
            <div className="grid cols-2" style={{ gap: 14 }}>
              {[
                { Icon: Inbox, t: "Checked queue", d: "Late or on time, documents in or missing, rules broken, before anyone opens the file." },
                { Icon: ShieldCheck, t: "Reviewers decide", d: "AI notes are suggestions. A person sets every amount and sends every email." },
                { Icon: MailCheck, t: "Denial reasons", d: "USG now requires a reason for every denial. The draft cites the guideline section." },
                { Icon: BookOpenCheck, t: "Conflicting documents", d: "USG's guidelines, FAQ and form disagree in five places. The rules page lists them." },
              ].map(({ Icon, t, d }) => (
                <div key={t} className="stack-sm" style={{ background: "#1c1c1f", borderRadius: 16, padding: 20 }}>
                  <span className="icon-tile dark"><Icon /></span>
                  <h3>{t}</h3>
                  <p className="small muted">{d}</p>
                </div>
              ))}
            </div>
          </ScrollIn>
        </section>

        <ScrollIn id="sponsors" className="section grid cols-2" style={{ gap: 56, alignItems: "center" }}>
          <div className="stack" style={{ gap: 18 }}>
            <span className="eyebrow">Sponsors</span>
            <h2 className="display-2">Sponsors for the costs USG won&apos;t cover.</h2>
            <p className="lede">Prizes, performers and food above $35 a person go on a sponsor list with a price for each. Greenlight ranks companies that hire from your majors, links to their recruiters and to USC alumni who work there, and drafts the email you send. Sponsors give in kind (the goods, or paying the vendor for them), so no money passes through the club. The Student Handbook allows in-kind corporate sponsorship for clubs; check anything offered in return with Campus Activities first.</p>
            <div><Link href="/club/sponsors" className="link">Open sponsors<ArrowRight /></Link></div>
          </div>
          <div className="card card-pad stack-sm">
            {[["Catering above $35 per person", "$1,200", "5-minute talk, recruiting table"], ["Gift cards for winners", "$600", "Logo on the slides, recap mention"], ["Swag", "$600", "Logo on event materials"]].map(([a, b, c], i) => (
              <div key={a} className="between" style={{ padding: "14px 0", borderTop: i ? "1px solid var(--line-2)" : 0 }}>
                <div className="row" style={{ gap: 12, flexWrap: "nowrap" }}><span className="icon-tile gold" style={{ width: 34, height: 34 }}><HandCoins style={{ width: 17, height: 17 }} /></span><div className="stack-xs"><strong className="small">{a}</strong><span className="tiny faint">{c}</span></div></div>
                <strong className="num">{b}</strong>
              </div>
            ))}
          </div>
        </ScrollIn>

        <section className="band">
          <ScrollIn className="section section-tight between" style={{ gap: 24 }}>
            <div className="stack-xs"><h2 style={{ fontSize: 28 }}>Planning something this semester?</h2><p className="muted">Events in the first three weeks of February have a November 18 deadline.</p></div>
            <StartRequest />
          </ScrollIn>
        </section>
      </main>

      <footer className="footer">
        <div className="footer-in">
          <Mark />
          <p>Built for the AI@USC Hackathon, November 2026. Not an official USC or USG service.</p>
          <p>Sources: USG Funding Department <a href="https://docs.google.com/document/d/1noJFJ4SxrFGD1Zm-6EqUHpXSIOUuFIL-gIobWXcXCt0/edit" target="_blank" rel="noreferrer">2026-27 Guidelines</a>, FY26 Financial Report, FAQ and deadline sheet (usg.usc.edu/branches/funding); Daily Trojan and Annenberg Media reporting (2023-2026). Photos from Wikimedia Commons, credited under each photo. Sample clubs and requests are made up.</p>
        </div>
      </footer>
    </div>
  );
}
