"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, Eye, EyeOff, MailCheck } from "lucide-react";
import { refreshProfile, supabase, useSession } from "@/lib/session";
import { Mark, Spinner } from "@/components/ui";

type Mode = "signin" | "signup" | "forgot";
type Role = "club" | "usg" | "sponsor";
const SCHOOLS = ["Viterbi", "Marshall", "Dornsife", "Price", "Annenberg", "Cinematic Arts", "Thornton", "Kaufman", "Roski", "Other"];
const home = (r: string | null) => (r === "usg" ? "/usg" : r === "sponsor" ? "/sponsor" : "/club");
/** Only same-site paths that belong to the role may be used as "next", so a link can't send people elsewhere. */
const safeNext = (next: string | null, role: string | null) => {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return home(role);
  return next.startsWith(home(role)) ? next : home(role);
};

export default function LoginPage() {
  return <Suspense><Login /></Suspense>;
}

function Login() {
  const router = useRouter();
  const session = useSession();
  const q = useSearchParams();
  const [mode, setMode] = useState<Mode>(() => { const m = q.get("mode"); return m === "signup" || m === "forgot" ? m : "signin"; });
  const next = q.get("next");
  const [role, setRole] = useState<Role>("club");
  const [clubMode, setClubMode] = useState<"create" | "join">("create");
  const [f, setF] = useState({ email: "", password: "", name: "", club: "", school: "Viterbi", code: "", org: "", invite: "" });
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState(() => (q.get("updated") ? "Password updated. Sign in with your new password." : ""));

  // Already signed in: go straight on.
  useEffect(() => {
    if (session.user?.role) router.replace(safeNext(next, session.user.role));
  }, [session.user, next, router]);

  const switchTo = (m: Mode) => { setMode(m); setErr(""); setInfo(""); };

  async function finishSignup() {
    const { data, error } = await supabase!.rpc("complete_signup", {
      p_role: role, p_name: f.name, p_club_name: f.club, p_school: f.school, p_join_code: clubMode === "join" ? f.code : "", p_org: f.org, p_invite: f.invite,
    });
    if (error) throw new Error(error.message);
    await refreshProfile();
    return data as { role: string; join_code: string | null };
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setErr(""); setInfo(""); setBusy(true);
    try {
      if (mode === "forgot") {
        if (!f.email.includes("@")) throw new Error("Enter the email you signed up with.");
        const { error } = await supabase.auth.resetPasswordForEmail(f.email, { redirectTo: `${location.origin}/login/reset` });
        if (error) throw new Error(error.message);
        setInfo(`If ${f.email} has an account, a reset link is on its way. Open it on this device.`);
        return;
      }
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email: f.email, password: f.password });
        if (error) throw new Error(error.message === "Invalid login credentials" ? "That email and password don't match an account. Check both, or reset your password." : error.message);
        // First sign-in after confirming the email: finish the sign-up with the details saved earlier.
        const { data: prof } = await supabase.from("profiles").select("role").maybeSingle();
        if (!prof) {
          const pending = JSON.parse(localStorage.getItem("greenlight:pending-signup") ?? "null");
          if (!pending) throw new Error("Your account has no club or role yet. Choose Create account to finish setting it up.");
          const { error: e2 } = await supabase.rpc("complete_signup", { p_role: pending.role, p_name: pending.name, p_club_name: pending.club, p_school: pending.school, p_join_code: pending.clubMode === "join" ? pending.code : "", p_org: pending.org, p_invite: pending.invite });
          if (e2) throw new Error(e2.message);
          localStorage.removeItem("greenlight:pending-signup");
        }
        await refreshProfile();
        const { data: p2 } = await supabase.from("profiles").select("role").maybeSingle();
        router.push(safeNext(next, (p2?.role as string) ?? null));
        return;
      }
      if (!f.name.trim()) throw new Error("Add your name.");
      if (role === "club" && clubMode === "create" && !f.club.trim()) throw new Error("Add your club's name.");
      if (role === "club" && clubMode === "join" && !f.code.trim()) throw new Error("Add the join code from your club.");
      if (role === "sponsor" && !f.org.trim()) throw new Error("Add your organization's name.");
      if (f.password.length < 8) throw new Error("Use a password of at least 8 characters.");
      const { data, error } = await supabase.auth.signUp({ email: f.email, password: f.password, options: { emailRedirectTo: `${location.origin}/login` } });
      if (error) throw new Error(error.message);
      if (!data.session) {
        localStorage.setItem("greenlight:pending-signup", JSON.stringify({ role, clubMode, ...f, password: "" }));
        setInfo("Check your email to confirm your account, then sign in here.");
        setMode("signin");
        return;
      }
      const r = await finishSignup();
      router.push(safeNext(next, r.role));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const heading = mode === "signin" ? "Sign in" : mode === "signup" ? "Create your account" : "Reset your password";
  const sub =
    mode === "forgot"
      ? "Enter your email and we'll send a link to choose a new password."
      : next === "/club/new"
        ? "Sign in or create an account to start your request. It's saved to your club, so your e-board can work on it too."
        : mode === "signin"
          ? "Welcome back. Your club's requests and sponsors are where you left them."
          : "One account per person. Officers of the same club share everything through a join code.";

  return (
    <div className="site auth-page">
      <header className="auth-top">
        <Link href="/" aria-label="Greenlight home"><Mark slogan /></Link>
        <Link href="/" className="link small"><ArrowLeft />Back to the home page</Link>
      </header>
      <main className="auth-main">
        <div className="card auth-card stack">
          {!supabase ? (
            <>
              <h1 className="auth-h">Accounts are not switched on here</h1>
              <p className="muted">This copy of Greenlight runs in demo mode: everything saves in this browser and you can switch between club, USG and sponsor views.</p>
              <div className="row"><Link className="btn btn-primary" href="/club">Explore the tool<ArrowRight /></Link></div>
            </>
          ) : (
            <form className="stack" onSubmit={submit} noValidate>
              {mode !== "forgot" && (
                <div className="segmented auth-tabs" role="tablist" aria-label="Sign in or create account">
                  <button type="button" role="tab" aria-selected={mode === "signin"} aria-pressed={mode === "signin"} onClick={() => switchTo("signin")}>Sign in</button>
                  <button type="button" role="tab" aria-selected={mode === "signup"} aria-pressed={mode === "signup"} onClick={() => switchTo("signup")}>Create account</button>
                </div>
              )}
              <div className="stack-xs">
                <h1 className="auth-h">{heading}</h1>
                <p className="muted">{sub}</p>
              </div>

              {mode === "signup" && (
                <>
                  <div className="stack-xs"><span className="lbl">I am</span>
                    <div className="segmented" role="group" aria-label="Account type">
                      <button type="button" aria-pressed={role === "club"} onClick={() => setRole("club")}>A club officer</button>
                      <button type="button" aria-pressed={role === "usg"} onClick={() => setRole("usg")}>A USG reviewer</button>
                      <button type="button" aria-pressed={role === "sponsor"} onClick={() => setRole("sponsor")}>A sponsor</button>
                    </div>
                  </div>
                  <label className="field"><span className="lbl">Your name</span><input className="input" name="name" autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
                  {role === "club" && (
                    <>
                      <div className="segmented" role="group" aria-label="Club">
                        <button type="button" aria-pressed={clubMode === "create"} onClick={() => setClubMode("create")}>Register my club</button>
                        <button type="button" aria-pressed={clubMode === "join"} onClick={() => setClubMode("join")}>Join my club</button>
                      </div>
                      {clubMode === "create" ? (
                        <div className="grid cols-2">
                          <label className="field"><span className="lbl">Club name</span><input className="input" value={f.club} onChange={(e) => setF({ ...f, club: e.target.value })} /></label>
                          <label className="field"><span className="lbl">School</span><select className="select" value={f.school} onChange={(e) => setF({ ...f, school: e.target.value })}>{SCHOOLS.map((s) => <option key={s}>{s}</option>)}</select></label>
                        </div>
                      ) : (
                        <label className="field"><span className="lbl">Join code from another officer</span><input className="input code" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} placeholder="A1B2C3" /></label>
                      )}
                    </>
                  )}
                  {role === "sponsor" && <label className="field"><span className="lbl">Organization</span><input className="input" name="organization" autoComplete="organization" value={f.org} onChange={(e) => setF({ ...f, org: e.target.value })} /></label>}
                  {role === "usg" && <label className="field"><span className="lbl">USG invite code</span><input className="input code" value={f.invite} onChange={(e) => setF({ ...f, invite: e.target.value })} /><span className="tiny faint">The Funding Department gives this to reviewers so only they can see the queue.</span></label>}
                </>
              )}

              <label className="field"><span className="lbl">Email</span><input className="input" type="email" name="email" autoComplete={mode === "signup" ? "email" : "username"} required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
              {mode !== "forgot" && (
                <div className="field">
                  <div className="between"><label className="lbl" htmlFor="password">Password</label>{mode === "signin" && <button type="button" className="link small" onClick={() => switchTo("forgot")}>Forgot password?</button>}</div>
                  <div className="pw">
                    <input id="password" className="input" type={show ? "text" : "password"} name="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} required minLength={8} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
                    <button type="button" className="pw-toggle" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"}>{show ? <EyeOff /> : <Eye />}</button>
                  </div>
                  {mode === "signup" && <span className="tiny faint">At least 8 characters.</span>}
                </div>
              )}
              {err && <p className="small field-error" role="alert"><AlertTriangle />{err}</p>}
              {info && <p className="small row" style={{ color: "var(--clear)", gap: 6, flexWrap: "nowrap" }} role="status"><MailCheck style={{ width: 16, flex: "none" }} />{info}</p>}
              <button className="btn btn-primary btn-lg" type="submit" disabled={busy}>
                {busy ? <><Spinner />Working</> : mode === "signin" ? <>Sign in<ArrowRight /></> : mode === "signup" ? <>Create account<ArrowRight /></> : "Send reset link"}
              </button>
              {mode === "forgot"
                ? <button type="button" className="link small" style={{ justifySelf: "start" }} onClick={() => switchTo("signin")}><ArrowLeft />Back to sign in</button>
                : <p className="tiny faint">Your browser can save the password. You stay signed in on this device until you sign out.</p>}
            </form>
          )}
        </div>
        <p className="small faint" style={{ textAlign: "center" }}>Exploring first? <Link href="/club" className="link">Explore the tool without an account</Link></p>
      </main>
    </div>
  );
}
