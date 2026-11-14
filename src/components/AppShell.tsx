"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BarChart3, BookOpen, CalendarClock, FilePlus2, Handshake, Inbox, LayoutGrid, Menu, RotateCcw, X } from "lucide-react";
import { store, useStore } from "@/lib/store";
import { Mark, useAiStatus } from "./ui";

type Item = { href: string; label: string; Icon: typeof Inbox; exact?: boolean; count?: number };

export function AppShell({ role, children }: { role: "club" | "usg"; children: React.ReactNode }) {
  const path = usePathname();
  const { apps } = useStore();
  const ai = useAiStatus();
  const [open, setOpen] = useState(false);

  const waiting = apps.filter((a) => ["submitted", "in_review", "needs_info"].includes(a.status)).length;
  const items: Item[] =
    role === "club"
      ? [
          { href: "/club", label: "Overview", Icon: LayoutGrid, exact: true },
          { href: "/club/new", label: "New request", Icon: FilePlus2 },
          { href: "/club/deadlines", label: "Deadlines", Icon: CalendarClock },
          { href: "/club/sponsors", label: "Sponsors", Icon: Handshake },
          { href: "/club/rules", label: "USG rules", Icon: BookOpen },
        ]
      : [
          { href: "/usg", label: "Review queue", Icon: Inbox, exact: true, count: waiting },
          { href: "/usg/insights", label: "Insights", Icon: BarChart3 },
          { href: "/usg/rules", label: "USG rules", Icon: BookOpen },
        ];
  const active = (i: Item) => (i.exact ? path === i.href || (i.href === "/club" && path.startsWith("/club/app")) || (i.href === "/usg" && path.startsWith("/usg/app")) : path.startsWith(i.href));

  const side = (
    <aside className={"side" + (open ? " open" : "")} aria-label="Navigation">
      <div className="between">
        <Link href="/" aria-label="Greenlight home"><Mark /></Link>
        <button className="btn btn-ghost btn-sm mobile-only" style={{ display: open ? "inline-flex" : "none" }} onClick={() => setOpen(false)} aria-label="Close menu"><X /></button>
      </div>
      <div className="role-switch" aria-label="View as">
        <Link href="/club" aria-current={role === "club" ? "page" : undefined}>Club officer</Link>
        <Link href="/usg" aria-current={role === "usg" ? "page" : undefined}>USG reviewer</Link>
      </div>
      <nav className="side-nav" onClick={() => setOpen(false)}>
        <div className="side-label">{role === "club" ? "Your club" : "Funding Department"}</div>
        {items.map((i) => (
          <Link key={i.href} href={i.href} className="side-link" aria-current={active(i) ? "page" : undefined}>
            <i.Icon />
            {i.label}
            {i.count ? <span className="count">{i.count}</span> : null}
          </Link>
        ))}
      </nav>
      <div style={{ marginTop: "auto" }} className="stack-sm">
        {ai === false && (
          <div className="offline-tag" title="No ANTHROPIC_API_KEY on the server. Rule checks still run in code.">AI offline: basic drafts</div>
        )}
        <button className="side-link" style={{ border: 0, background: "transparent", cursor: "pointer", width: "100%" }} onClick={() => { store.reset(); }}>
          <RotateCcw />Reset demo data
        </button>
        <p className="tiny faint" style={{ padding: "0 12px" }}>Built on USG&apos;s 2026-27 Funding Guidelines. Sample clubs are made up.</p>
      </div>
    </aside>
  );

  return (
    <div className="shell">
      <div className={"scrim" + (open ? " open" : "")} onClick={() => setOpen(false)} />
      {side}
      <div style={{ minWidth: 0 }}>
        <div className="mobile-bar">
          <Link href="/"><Mark /></Link>
          <button className="btn btn-sm" onClick={() => setOpen(true)} aria-label="Open menu"><Menu />Menu</button>
        </div>
        <main className="main"><div className="main-in">{children}</div></main>
      </div>
    </div>
  );
}
