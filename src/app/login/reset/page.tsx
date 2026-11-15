"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AlertTriangle, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/session";
import { Mark, Spinner } from "@/components/ui";

/** Where the password-reset email lands. Supabase signs the person in from the link; they choose a new password here. */
export default function Reset() {
  const router = useRouter();
  const [ready, setReady] = useState<boolean | null>(supabase ? null : false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!supabase) return;
    const sb = supabase;
    const code = new URLSearchParams(window.location.search).get("code");
    // The client may already have traded the code for a session on load; either way, ask for the session after.
    (code ? sb.auth.exchangeCodeForSession(code).catch(() => null).then(() => sb.auth.getSession()) : sb.auth.getSession())
      .then(({ data }) => setReady(Boolean(data.session)))
      .catch(() => setReady(false));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (pw.length < 8) return setErr("Use at least 8 characters.");
    if (pw !== pw2) return setErr("The two passwords don't match.");
    setBusy(true);
    const { error } = await supabase!.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setErr(error.message);
    router.push("/login?updated=1");
  }

  return (
    <div className="site auth-page">
      <header className="auth-top"><Link href="/" aria-label="Greenlight home"><Mark /></Link></header>
      <main className="auth-main">
        <div className="card auth-card stack">
          <h1 className="auth-h">Choose a new password</h1>
          {ready === null ? (
            <p className="row muted"><Spinner />Checking your reset link</p>
          ) : !ready ? (
            <>
              <p className="small field-error" role="alert"><AlertTriangle />This reset link has expired or was already used.</p>
              <Link href="/login?mode=forgot" className="btn btn-primary">Send a new link</Link>
            </>
          ) : (
            <form className="stack" onSubmit={save} noValidate>
              <label className="field"><span className="lbl">New password</span>
                <span className="pw">
                  <input className="input" type={show ? "text" : "password"} autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
                  <button type="button" className="pw-toggle" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"}>{show ? <EyeOff /> : <Eye />}</button>
                </span>
              </label>
              <label className="field"><span className="lbl">Type it again</span><input className="input" type={show ? "text" : "password"} autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} /></label>
              {err && <p className="small field-error" role="alert"><AlertTriangle />{err}</p>}
              <button className="btn btn-primary btn-lg" type="submit" disabled={busy}>{busy ? <><Spinner />Saving</> : "Save new password"}</button>
            </form>
          )}
          <Link href="/login" className="link small" style={{ justifySelf: "start" }}><ArrowLeft />Back to sign in</Link>
        </div>
      </main>
    </div>
  );
}
