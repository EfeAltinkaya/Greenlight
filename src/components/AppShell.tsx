"use client";
import Link from "next/link";
import { motion } from "motion/react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BarChart3, Bell, BookOpen, CalendarClock, CircleHelp, FilePlus2, Handshake, Inbox, Landmark, LayoutGrid, LogOut, Menu, ReceiptText, RotateCcw, Store, Wallet, X } from "lucide-react";
import { store, useCurrentClub, useStore } from "@/lib/store";
import { switchRole, useSession } from "@/lib/session";
import { Mark, useAiStatus } from "./ui";
import { Tour } from "./Tour";

export type Role = "club" | "usg" | "sponsor";
type Item = { href: string; label: string; Icon: typeof Inbox; match?: (p: string) => boolean; count?: number; tour?: string };
type Group = { title: string; items: Item[] };

const ROLE_NAME = { club: "club officer", usg: "USG reviewer", sponsor: "sponsor" } as const;

function ShellSkeleton() {
  return (
    <div className="shell" aria-busy="true" aria-label="Loading session">
      <aside className="side" aria-hidden="true">
        <div className="between">
          <Mark />
        </div>
        <div className="side-who stack-xs">
          <span className="skel" style={{ width: "70%", height: 10 }} />
          <span className="skel" style={{ width: "50%", height: 14 }} />
        </div>
        <nav className="side-nav stack-sm">
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className="skel" style={{ height: 28, width: "100%", borderRadius: 8 }} />
          ))}
        </nav>
      </aside>
      <div style={{ minWidth: 0 }}>
        <main className="main">
          <div className="main-in stack" style={{ gap: 16 }}>
            <span className="skel" style={{ height: 28, width: "40%", maxWidth: 280 }} />
            <span className="skel" style={{ height: 120, width: "100%", borderRadius: 12 }} />
            <span className="skel" style={{ height: 180, width: "100%", borderRadius: 12 }} />
          </div>
        </main>
      </div>
    </div>
  );
}

export function AppShell({ role, children }: { role: Role; children: React.ReactNode }) {
  const path = usePathname();
  const { apps, notices, deals } = useStore();
  const club = useCurrentClub();
  const session = useSession();
  const ai = useAiStatus();
  const [open, setOpen] = useState(false);
  const [touring, setTouring] = useState(false);

  // Wait for auth before showing demo chrome or signed-in chrome (avoids flash).
  if (session.enabled && !session.ready) {
    return <ShellSkeleton />;
  }

  const userRole = session.user?.role ?? null;
  // Signed-in users can only open their own side (blocks club officers from /usg/insights).
  const blockedSignedIn = Boolean(session.user && userRole !== role);

  const unread = (notices ?? []).filter((n) => !n.read && n.to === role && (role !== "club" || n.clubId === club.id)).length;
  const waiting = apps.filter((a) => ["submitted", "in_review"].includes(a.status)).length;
  const myDeals = (deals ?? []).filter((d) => (role === "club" ? d.clubId === club.id : true) && d.stage !== "recap_sent" && d.stage !== "declined").length;

  const groups: Group[] =
    role === "club"
      ? [
          { title: "Journey", items: [
            { href: "/club", label: "Today", Icon: LayoutGrid, match: (p) => p === "/club", tour: "home" },
            { href: "/club/new", label: "Plan an event", Icon: FilePlus2, tour: "new" },
            { href: "/club/requests", label: "Requests", Icon: Inbox, match: (p) => p.startsWith("/club/requests") || p.startsWith("/club/app"), tour: "requests" },
            { href: "/club/deadlines", label: "Deadlines", Icon: CalendarClock, tour: "deadlines" },
            { href: "/club/funding", label: "Other USC money", Icon: Landmark, tour: "funding" },
            { href: "/club/sponsors", label: "Sponsors", Icon: Handshake, count: myDeals, match: (p) => p.startsWith("/club/sponsors") || p.startsWith("/club/offers") || p.startsWith("/club/deals"), tour: "sponsors" },
            { href: "/club/money", label: "Ledger", Icon: Wallet, tour: "money" },
            { href: "/club/updates", label: "Updates", Icon: Bell, count: unread, tour: "updates" },
            { href: "/club/help", label: "Ask a person", Icon: CircleHelp, tour: "help" },
            { href: "/club/rules", label: "USG rules", Icon: BookOpen },
          ] },
        ]
      : role === "usg"
        ? [
            { title: "Review", items: [
              { href: "/usg", label: "Review queue", Icon: Inbox, match: (p) => p === "/usg" || p.startsWith("/usg/app"), count: waiting, tour: "queue" },
              { href: "/usg/updates", label: "Updates", Icon: Bell, count: unread, tour: "updates" },
            ] },
            { title: "Oversight", items: [
              { href: "/usg/insights", label: "Insights", Icon: BarChart3, tour: "insights" },
              { href: "/usg/rules", label: "USG rules", Icon: BookOpen },
            ] },
          ]
        : [
            { title: "Sponsor", items: [
              { href: "/sponsor", label: "My offers", Icon: Store, match: (p) => p === "/sponsor", tour: "offers" },
              { href: "/sponsor/deals", label: "Club requests", Icon: Handshake, count: myDeals, match: (p) => p.startsWith("/sponsor/deals"), tour: "deals" },
              { href: "/sponsor/updates", label: "Updates", Icon: Bell, count: unread, tour: "updates" },
            ] },
          ];

  // One account can hold several roles. Opening another side switches the active role on the server,
  // so the database permissions always match the side you are looking at.
  const multiRole = (session.user?.roles.length ?? 0) > 1;
  const canSwitch = Boolean(session.user && session.user.role !== role && session.user.roles.includes(role));
  const [switchErr, setSwitchErr] = useState("");
  const switching = canSwitch && !switchErr;
  useEffect(() => {
    if (!canSwitch) return;
    let off = false;
    switchRole(role).catch((e) => { if (!off) setSwitchErr((e as Error).message); });
    return () => { off = true; };
  }, [canSwitch, role]);
  const active = (i: Item) => (i.match ? i.match(path) : path.startsWith(i.href));
  const here = groups.flatMap((g) => g.items).find(active);
  const detail = path.split("/");
  const detailTitle = detail[2] === "app" ? apps.find((a) => a.id === detail[3])?.event.title : detail[2] === "deals" && detail[3] ? (deals ?? []).find((d) => d.id === detail[3])?.sponsorName : undefined;
  const pageTitle = `${detailTitle ? (role === "usg" ? "Review: " : "") + detailTitle : here?.label ?? "Greenlight"} · Greenlight`;
  const roleLabel = role === "club" ? club.name : role === "usg" ? "USG Funding Department" : session.user?.org || "Sponsor";

  return (
    <div className="shell">
      <title>{pageTitle}</title>
      <div className={"scrim" + (open ? " open" : "")} onClick={() => setOpen(false)} />
      <aside className={"side" + (open ? " open" : "")} aria-label="Navigation">
        <div className="between">
          <Link href="/" aria-label="Greenlight home"><Mark /></Link>
          <button className="btn btn-ghost btn-sm" style={{ display: open ? "inline-flex" : "none" }} onClick={() => setOpen(false)} aria-label="Close menu"><X /></button>
        </div>
        <div className="side-who">
          <span className="tiny faint">{session.user ? session.user.email : "Demo mode"}</span>
          <div className="between" style={{ flexWrap: "nowrap", gap: 8 }}>
            <strong className="small">{roleLabel}</strong>
            {session.user && <button className="side-signout" onClick={() => session.signOut()}><LogOut />Sign out</button>}
          </div>
        </div>
        {(!session.user || multiRole) && (
          <div className="role-switch three" aria-label="View as">
            <Link href="/club" aria-current={role === "club" ? "page" : undefined}>Club</Link>
            <Link href="/usg" aria-current={role === "usg" ? "page" : undefined}>USG</Link>
            <Link href="/sponsor" aria-current={role === "sponsor" ? "page" : undefined}>Sponsor</Link>
          </div>
        )}
        <nav className="side-nav" onClick={() => setOpen(false)}>
          {groups.map((g) => (
            <div key={g.title} className="side-group">
              <div className="side-label">{g.title}</div>
              {g.items.map((i) => (
                <Link key={i.href} href={i.href} className="side-link" data-tour={i.tour} aria-current={active(i) ? "page" : undefined}>
                  {active(i) && <motion.span layoutId="side-active" className="side-active" transition={{ type: "spring", stiffness: 420, damping: 36 }} />}
                  <i.Icon />
                  {i.label}
                  {i.count ? <span className="count">{i.count}</span> : null}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div style={{ marginTop: "auto" }} className="stack-sm">
          {ai === false && <div className="offline-tag">AI offline: basic drafts</div>}
          <button className="side-link" style={{ border: 0, background: "transparent", cursor: "pointer", width: "100%" }} onClick={() => setTouring(true)}><CircleHelp />Take the tour</button>
          {session.user ? (
            <button className="side-link" style={{ border: 0, background: "transparent", cursor: "pointer", width: "100%" }} onClick={() => session.signOut()}><LogOut />Sign out</button>
          ) : (
            <>
              <Link href="/login" className="side-link"><ReceiptText />Sign in or create account</Link>
              <button className="side-link" style={{ border: 0, background: "transparent", cursor: "pointer", width: "100%" }} onClick={() => store.reset()}><RotateCcw />Reset demo data</button>
            </>
          )}
        </div>
      </aside>
      <div style={{ minWidth: 0 }}>
        {!session.user && (
          <div className="demo-banner" role="status">
            <span>Demo data. Nothing is sent to USG.</span>
            <Link href="/login" className="link" style={{ color: "inherit", fontWeight: 700 }}>Exit demo</Link>
          </div>
        )}
        <div className="mobile-bar">
          <Link href="/"><Mark /></Link>
          <div className="row" style={{ gap: 6 }}>
            {session.user && <button className="btn btn-sm btn-ghost" onClick={() => session.signOut()} aria-label="Sign out"><LogOut /></button>}
            <button className="btn btn-sm" onClick={() => setOpen(true)} aria-label="Open menu"><Menu />Menu</button>
          </div>
        </div>
        <main className="main">
          <div className="main-in">
            {switching ? (
              <div className="card empty">
                <span className="spinner" aria-hidden="true" />
                <strong>Switching to {ROLE_NAME[role]}</strong>
                <span className="muted">Loading what a {ROLE_NAME[role]} can see.</span>
              </div>
            ) : blockedSignedIn && userRole ? (
              <div className="card empty">
                <strong>This side is for {role === "usg" ? "USG reviewers" : role === "sponsor" ? "sponsors" : "club officers"}.</strong>
                <span className="muted">You are signed in as a {ROLE_NAME[userRole]}.</span>
                <Link className="btn btn-primary" href={userRole === "usg" ? "/usg" : userRole === "sponsor" ? "/sponsor" : "/club"}>
                  Go to your desk
                </Link>
              </div>
            ) : blockedSignedIn ? (
              <div className="card empty">
                <strong>Finish setting up your account</strong>
                <span className="muted">Your signed-in account has no role yet.</span>
                <Link className="btn btn-primary" href="/login">Go to login</Link>
              </div>
            ) : (
              children
            )}
          </div>
        </main>
      </div>
      {touring && <Tour role={role} onClose={() => setTouring(false)} />}
    </div>
  );
}
