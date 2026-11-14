"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Signal } from "./ui";

export function TopBar() {
  const path = usePathname();
  const usg = path.startsWith("/usg");
  const [ai, setAi] = useState<boolean | null>(null);
  useEffect(() => {
    fetch("/api/status").then((r) => r.json()).then((d) => setAi(Boolean(d.ai))).catch(() => setAi(false));
  }, []);
  return (
    <header className="topbar">
      <div className="topbar-in">
        <Link href={usg ? "/usg" : "/club"} className="wordmark" aria-label="Greenlight home">
          <Signal state="go" />
          Greenlight
        </Link>
        <span className="label" style={{ marginTop: 2 }}>{usg ? "USG Funding Department" : "Club treasurer desk"}</span>
        {ai === false && <span className="offline" title="No ANTHROPIC_API_KEY on the server. Rule checks still run; AI steps use a basic offline parser.">AI offline</span>}
        <nav className="roles" aria-label="View as">
          <Link href="/club" aria-current={!usg ? "page" : undefined}>Club officer</Link>
          <Link href="/usg" aria-current={usg ? "page" : undefined}>USG reviewer</Link>
        </nav>
      </div>
    </header>
  );
}
