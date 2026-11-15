"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { refreshProfile, supabase, useSession } from "@/lib/session";
import { Mark, Spinner } from "@/components/ui";

type Mode = "signin" | "signup";
type Role = "club" | "usg" | "sponsor";
const SCHOOLS = ["Viterbi", "Marshall", "Dornsife", "Price", "Annenberg", "Cinematic Arts", "Thornton", "Kaufman", "Roski", "Other"];

export default function Login() {
  const router = useRouter();
  const session = useSession();
  const [mode, setMode] = useState<Mode>("signin");
  const [role, setRole] = useState<Role>("club");
  const [clubMode, setClubMode] = useState<"create" | "join">("create");
  const [f, setF] = useState({ email: "", password: "", name: "", club: "", school: "Viterbi", code: "", org: "", invite: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const home = (r: string | null) => (r === "usg" ? "/usg" : r === "sponsor" ? "/sponsor" : "/club");

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
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email: f.email, password: f.password });
        if (error) throw new Error(error.message === "Invalid login credentials" ? "That email and password do not match an account." : error.message);
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
        router.push(home((p2?.role as string) ?? null));
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
        setInfo("Check your email to confirm your account, then sign in here. Your details are saved once you sign in.");
        localStorage.setItem("greenlight:pending-signup", JSON.stringify({ role, clubMode, ...f, password: "" }));
        setMode("signin");
        return;
      }
      const r = await finishSignup();
      router.push(home(r.role));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="site" style={{ display: "grid", placeItems: "center", padding: "48px 16px" }}>
      <div className="stack" style={{ width: "100%", maxWidth: 460 }}>
        <Link href="/" style={{ justifySelf: "center" }}><Mark size="lg" /></Link>
        <div className="card card-pad stack">
          {!supabase ? (
            <>
              <h1 style={{ fontSize: 26 }}>Accounts are not switched on here</h1>
              <p className="muted">This copy of Greenlight runs in demo mode: everything saves in this browser and you can switch between club, USG and sponsor views.</p>
              <div className="row"><Link className="btn btn-primary" href="/club">Open the demo<ArrowRight /></Link></div>
            </>
          ) : (
            <form className="stack" onSubmit={submit}>
              <div className="segmented" role="group" aria-label="Sign in or create account">
                <button type="button" aria-pressed={mode === "signin"} onClick={() => setMode("signin")}>Sign in</button>
                <button type="button" aria-pressed={mode === "signup"} onClick={() => setMode("signup")}>Create account</button>
              </div>
              <h1 style={{ fontSize: 26 }}>{mode === "signin" ? "Welcome back" : "Create your account"}</h1>

              {mode === "signup" && (
                <>
                  <div className="stack-xs"><span className="small" style={{ fontWeight: 600 }}>I am</span>
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

              <label className="field"><span className="lbl">Email</span><input className="input" type="email" name="email" autoComplete={mode === "signin" ? "username" : "email"} required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
              <label className="field"><span className="lbl">Password</span><input className="input" type="password" name="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} required minLength={8} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></label>
              {err && <p className="small" style={{ color: "var(--fix)" }} role="alert">{err}</p>}
              {info && <p className="small" style={{ color: "var(--clear)" }} role="status">{info}</p>}
              <button className="btn btn-primary btn-lg" type="submit" disabled={busy}>{busy ? <><Spinner />Working</> : mode === "signin" ? "Sign in" : "Create account"}</button>
              <p className="tiny faint">Your browser can save the password. You stay signed in on this device until you sign out.</p>
            </form>
          )}
        </div>
        <p className="tiny faint" style={{ textAlign: "center" }}><Link href="/club" className="link">Look around in demo mode instead</Link></p>
      </div>
    </div>
  );
}
