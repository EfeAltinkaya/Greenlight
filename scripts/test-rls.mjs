// End-to-end permission test against the real Supabase project, using the test accounts in .env.local.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)="?(.*?)"?$/);
  if (m) env[m[1]] = m[2];
}
const as = async (k) => {
  const c = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email: env[`${k}_EMAIL`], password: env[`${k}_PASSWORD`] });
  if (error) throw error;
  const { data } = await c.auth.getSession();
  c.realtime.setAuth(data.session.access_token);
  return c;
};
let fails = 0;
const ok = (name, cond) => { console.log(cond ? "PASS" : "FAIL", name); if (!cond) fails++; };

const club = await as("TEST_CLUB"), usg = await as("TEST_USG"), sponsor = await as("TEST_SPONSOR");
const { data: prof } = await club.from("profiles").select("club_id").single();
const cid = prof.club_id;
const id = "rls-test-" + Date.now();

let r = await club.from("records").insert({ kind: "app", id, club_id: cid, status: "submitted", data: { id, clubId: cid } });
ok("club can submit its own request", !r.error);
r = await club.from("records").insert({ kind: "app", id: id + "x", club_id: "builders", status: "submitted", data: {} });
ok("club cannot write for another club", Boolean(r.error));
r = await usg.from("records").select("id").eq("id", id);
ok("USG sees the submitted request", r.data?.length === 1);
r = await sponsor.from("records").select("id").eq("id", id);
ok("sponsor cannot see club requests", r.data?.length === 0);
r = await usg.from("records").update({ status: "approved" }).eq("id", id).select("id");
ok("USG can decide it", r.data?.length === 1);
r = await sponsor.from("records").select("id").eq("kind", "offer");
ok("sponsor sees offers", (r.data?.length ?? 0) > 0);
r = await usg.from("notices").insert({ id: "n-" + id, to_role: "club", club_id: cid, title: "RLS test", body: "test", href: "/club" });
ok("USG can notify the club", !r.error);
r = await club.from("notices").select("id").eq("title", "RLS test");
ok("club receives the notice", (r.data?.length ?? 0) >= 1);
r = await sponsor.from("notices").select("id").eq("title", "RLS test");
ok("sponsor does not receive it", r.data?.length === 0);

// Realtime: club listens, USG changes the record.
const got = await new Promise((resolve) => {
  const t = setTimeout(() => resolve(false), 8000);
  const ch = club.channel("t").on("postgres_changes", { event: "*", schema: "public", table: "records" }, () => { clearTimeout(t); resolve(true); });
  ch.subscribe(async (s, e) => { console.log("realtime:", s, e?.message ?? ""); if (s === "SUBSCRIBED") { await new Promise((w) => setTimeout(w, 1500)); await usg.from("records").update({ status: "partial" }).eq("id", id); } });
});
ok("club gets the live update", got);

await club.from("records").delete().eq("id", id);
await club.from("notices").delete().eq("title", "RLS test");
console.log(fails ? `${fails} failed` : "all passed");
process.exit(fails ? 1 : 0);
