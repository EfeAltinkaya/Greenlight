"use client";
import { useEffect, useState } from "react";
import { Link2, Mail } from "lucide-react";
import { supabase, useSession } from "@/lib/session";
import { store, useStore } from "@/lib/store";
import { requestIdOf } from "@/lib/requestId";
import { Spinner, useToast } from "./ui";

type MailT = { id: string; threadId: string; from: string; subject: string; date: string; snippet: string };

async function token() {
  const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
  return data.session?.access_token ?? "";
}

/** Match Gmail subjects that contain [GL-26-XXXX] and let the club attach the note to that request (never auto-changes status). */
export function RequestMailAttach() {
  const session = useSession();
  const { apps } = useStore();
  const [mails, setMails] = useState<MailT[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, say] = useToast();

  async function load() {
    setBusy(true);
    try {
      const r = await fetch("/api/gmail/messages", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${await token()}` },
        body: JSON.stringify({ email: "usgfunds@usc.edu", name: "USG Funding" }),
      });
      const j = await r.json();
      if (r.ok) setMails(j.mails ?? []);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (session.user) void load();
  }, [session.user]); // eslint-disable-line react-hooks/exhaustive-deps

  const tagged = (mails ?? []).flatMap((m) => {
    const match = m.subject.match(/\[(GL-26-[0-9A-F]{4})\]/i);
    if (!match) return [];
    const app = apps.find((a) => requestIdOf(a).toUpperCase() === match[1].toUpperCase());
    return [{ mail: m, tag: match[1].toUpperCase(), app }];
  });

  if (!session.user) return null;

  return (
    <section className="card card-pad stack-sm" style={{ marginTop: 16 }}>
      {toast}
      <div className="between">
        <span className="row" style={{ gap: 8 }}><Mail style={{ width: 18, height: 18 }} /><strong>Gmail with a request ID</strong></span>
        <button className="btn btn-sm btn-ghost" onClick={load} disabled={busy}>{busy ? <Spinner /> : "Refresh"}</button>
      </div>
      <p className="tiny faint">Emails whose subject includes [GL-26-XXXX] can be attached to that request. Attaching never changes the status.</p>
      {tagged.length === 0 ? (
        <p className="small muted">No tagged emails found yet.</p>
      ) : (
        tagged.map(({ mail, tag, app }) => (
          <div key={mail.id} className="inset between" style={{ padding: 12, flexWrap: "nowrap", alignItems: "flex-start" }}>
            <div className="stack-xs">
              <strong className="small">{mail.subject}</strong>
              <span className="tiny faint">{tag} · {mail.snippet}</span>
            </div>
            {app ? (
              <button
                className="btn btn-sm"
                onClick={() => {
                  store.addMessage(app.id, "club", `Attached email: ${mail.subject}\n${mail.snippet}`);
                  store.audit(app.id, { by: "club", action: "attach_email", detail: mail.subject.slice(0, 160) });
                  say(`Attached to ${tag}. Status unchanged.`);
                }}
              >
                <Link2 />Attach to request
              </button>
            ) : (
              <span className="tiny faint">No matching request</span>
            )}
          </div>
        ))
      )}
    </section>
  );
}
