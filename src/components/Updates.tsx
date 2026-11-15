"use client";
import Link from "next/link";
import { useEffect } from "react";
import { Bell, Mail } from "lucide-react";
import { store, useCurrentClub, useStore } from "@/lib/store";
import { useSession } from "@/lib/session";
import { RequestMailAttach } from "@/components/RequestMailAttach";

/** Every notice the workflow sent to this role, newest first. Opening the page marks them read. */
export function Updates({ role }: { role: "club" | "usg" | "sponsor" }) {
  const { notices } = useStore();
  const club = useCurrentClub();
  const session = useSession();
  const mine = (notices ?? []).filter((n) => n.to === role && (role !== "club" || n.clubId === club.id));
  useEffect(() => {
    const t = setTimeout(() => store.readNotices(role, role === "club" ? club.id : null), 1500);
    return () => clearTimeout(t);
  }, [role, club.id]);
  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Updates</span>
          <h1>Updates</h1>
          <p className="lede">Decisions, questions and replies from USG and sponsors, newest first. USG may also email you directly; forward those to Greenlight to keep them here{session.user ? ` (${session.user.email})` : ""}.</p>
        </div>
      </div>
      {mine.length === 0 ? (
        <div className="card empty"><Bell /><strong>No updates yet</strong><span className="small">When {role === "usg" ? "a club submits" : role === "club" ? "USG or a sponsor acts" : "a club asks for your support"}, it shows up here.</span></div>
      ) : (
        <div className="card appear">
          {mine.map((n, i) => (
            <Link key={n.id} href={n.href} className="between" style={{ padding: "16px 20px", borderTop: i ? "1px solid var(--line-2)" : 0, flexWrap: "nowrap", alignItems: "flex-start" }}>
              <div className="row" style={{ gap: 14, flexWrap: "nowrap", alignItems: "flex-start" }}>
                <span className={"icon-tile" + (n.read ? "" : " gold")} style={{ width: 34, height: 34 }}><Mail style={{ width: 17, height: 17 }} /></span>
                <div className="stack-xs"><strong>{n.title}</strong><span className="small muted">{n.body}</span></div>
              </div>
              <span className="tiny faint" style={{ whiteSpace: "nowrap" }}>{new Date(n.at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
            </Link>
          ))}
        </div>
      )}
      {role === "club" && <RequestMailAttach />}
    </>
  );
}
