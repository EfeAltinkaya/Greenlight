// Creates confirmed test accounts for each role and records them in .env.local (never committed).
import { appendFileSync, readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const envPath = new URL("../.env.local", import.meta.url);
for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)="?(.*?)"?$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const url = process.env.SUPABASE_URL, anon = process.env.SUPABASE_ANON_KEY, service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(url, service);
const invite = (await (await import("pg")).default.Client ? null : null);
void invite;
const accounts = [
  { key: "TEST_CLUB", email: "club.officer@greenlight-test.example", args: { p_role: "club", p_name: "Test Officer", p_club_name: "Test Robotics Club", p_school: "Viterbi", p_join_code: "", p_org: "", p_invite: "" } },
  { key: "TEST_USG", email: "usg.reviewer@greenlight-test.example", args: { p_role: "usg", p_name: "Test Reviewer", p_club_name: "", p_school: "", p_join_code: "", p_org: "", p_invite: "TROJAN-USG-2026" } },
  { key: "TEST_SPONSOR", email: "sponsor@greenlight-test.example", args: { p_role: "sponsor", p_name: "Test Sponsor", p_club_name: "", p_school: "", p_join_code: "", p_org: "Sample: Westside Robotics Supply", p_invite: "" } },
];
const already = readFileSync(envPath, "utf8");
for (const a of accounts) {
  if (already.includes(`${a.key}_EMAIL=`)) { console.log(a.key, "exists"); continue; }
  const password = randomBytes(12).toString("base64url");
  const { error } = await admin.auth.admin.createUser({ email: a.email, password, email_confirm: true });
  if (error && !/already/.test(error.message)) throw error;
  const user = createClient(url, anon);
  const s = await user.auth.signInWithPassword({ email: a.email, password });
  if (s.error) throw s.error;
  const r = await user.rpc("complete_signup", a.args);
  if (r.error) throw r.error;
  appendFileSync(envPath, `\n${a.key}_EMAIL=${a.email}\n${a.key}_PASSWORD=${password}\n`);
  console.log(a.key, "created", JSON.stringify(r.data));
}
