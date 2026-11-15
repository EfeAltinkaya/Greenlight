"use client";
import { useEffect, useState } from "react";
import { Mail, RefreshCw } from "lucide-react";
import { supabase, useSession } from "@/lib/session";
import { Spinner } from "./ui";

type MailT = { id: string; threadId: string; from: string; subject: string; date: string; snippet: string; direction: "in" | "out" };

async function token() {
  const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
  return data.session?.access_token ?? "";
}

/** Emails between the signed-in officer and one sponsor, read from their own Gmail. */
export function SponsorInbox({ email, name }: { email?: string; name: string }) {
  const session = useSession();
  const [status, setStatus] = useState<{ configured: boolean; connected: boolean; email?: string | null } | null>(null);
  const [mails, setMails] = useState<MailT[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function load() {
    setBusy(true);
    setErr("");
    try {
      const r = await fetch("/api/gmail/messages", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${await token()}` }, body: JSON.stringify({ email, name }) });
      const j = await r.json();
      if (!r.ok) setErr(j.error ?? "Could not read Gmail.");
      else setMails(j.mails);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!session.user) return;
    let off = false;
    token().then((t) => fetch("/api/gmail/messages", { headers: { authorization: `Bearer ${t}` } })).then((r) => r.json()).then((s) => { if (!off) setStatus(s); }).catch(() => {});
    return () => { off = true; };
  }, [session.user]);

  async function connect() {
    window.location.assign(`/api/gmail/start?token=${encodeURIComponent(await token())}`);
  }

  return (
    <div className="inset stack-sm" style={{ padding: 14 }}>
      <div className="between">
        <span className="row small" style={{ gap: 8, fontWeight: 600 }}><Mail style={{ width: 16, height: 16 }} />Emails with {name.replace(/^Sample:\s*/, "")}</span>
        {status?.connected && <button className="btn btn-sm btn-ghost" onClick={load} disabled={busy}>{busy ? <Spinner /> : <RefreshCw />}{mails ? "Refresh" : "Load emails"}</button>}
      </div>
      {!session.user ? (
        <p className="tiny faint">Sign in and connect Gmail to see your emails with this sponsor here.</p>
      ) : status && !status.configured ? (
        <p className="tiny faint">Gmail is not set up on this server yet.</p>
      ) : status && !status.connected ? (
        <div className="row"><button className="btn btn-sm" onClick={connect}><Mail />Connect Gmail (read-only)</button><span className="tiny faint">Greenlight only reads emails with your sponsors. It never sends from your account.</span></div>
      ) : err ? (
        <p className="small" style={{ color: "var(--fix)" }}>{err}</p>
      ) : mails ? (
        mails.length === 0 ? <p className="tiny faint">No emails with them in the last 90 days.</p> : (
          <div className="stack-xs appear">
            {mails.map((m) => (
              <a key={m.id} href={`https://mail.google.com/mail/u/0/#all/${m.threadId}`} target="_blank" rel="noreferrer" className="card" style={{ padding: 12, display: "grid", gap: 2 }}>
                <span className="between tiny"><span className={m.direction === "in" ? "" : "faint"}>{m.direction === "in" ? `From ${m.from.replace(/<.*>/, "").trim()}` : "You sent"}</span><span className="faint">{new Date(m.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span></span>
                <strong className="small">{m.subject || "(no subject)"}</strong>
                <span className="tiny muted">{m.snippet}</span>
              </a>
            ))}
          </div>
        )
      ) : status?.connected ? <p className="tiny faint">Connected as {status.email}. Load to see the latest.</p> : <p className="tiny faint">Checking Gmail…</p>}
    </div>
  );
}
