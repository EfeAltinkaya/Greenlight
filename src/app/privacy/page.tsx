"use client";
import Link from "next/link";
import { NavActions } from "@/components/Landing";
import { Mark } from "@/components/ui";

export default function Privacy() {
  return (
    <div className="landing" style={{ minHeight: "100vh" }}>
      <header className="land-nav">
        <Link href="/" className="land-mark" aria-label="Greenlight home"><Mark slogan /></Link>
        <NavActions />
      </header>
      <main className="land-wrap" style={{ padding: "48px 24px 80px", maxWidth: 720, margin: "0 auto" }}>
        <h1 style={{ fontFamily: "var(--font-serif, Georgia, serif)", fontSize: "clamp(2rem, 4vw, 2.75rem)", lineHeight: 1.15 }}>Privacy</h1>
        <p className="lede">What Greenlight stores, what it never stores, and how to delete a club.</p>
        <section className="stack" style={{ gap: 20, marginTop: 32 }}>
          <div className="stack-xs">
            <h2>What is stored</h2>
            <p className="small">Club name, school, members&apos; majors you enter, funding requests, budget lines, documents you upload (quotes, permits), outreach drafts you approve, sponsor deals, ledger lines, and notices. Signed-in accounts store email and role in Supabase Auth and profiles.</p>
          </div>
          <div className="stack-xs">
            <h2>What is never stored</h2>
            <p className="small">Traveler date of birth and USC ID stay in EngageSC. Greenlight does not scrape LinkedIn or store people&apos;s contact data beyond what an officer types. Demo mode keeps data in the browser only.</p>
          </div>
          <div className="stack-xs">
            <h2>How to delete a club</h2>
            <p className="small">Email the team that runs this demo build, or sign in and ask a USG reviewer with admin access to remove the club row and its records. Deleting a club removes applications, outreach, deals and ledger lines for that club_id.</p>
          </div>
          <p className="tiny faint">Not an official USC or USG service. Built at the AI@USC Hackathon, Nov 2026.</p>
        </section>
      </main>
    </div>
  );
}
