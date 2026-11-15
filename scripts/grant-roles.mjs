// Give an existing account all three roles (club officer, USG reviewer, sponsor) so one person can use every side.
// Usage: node scripts/grant-roles.mjs <email> ["Sponsor organization name"]
// Run by the project owner only (uses the service-role key in .env.local). Accounts can't grant themselves roles.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = {};
for (const l of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)="?(.*?)"?$/);
  if (m) env[m[1]] = m[2];
}
const [email, orgArg] = process.argv.slice(2);
if (!email) throw new Error("Usage: node scripts/grant-roles.mjs <email> [sponsor org]");
const db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const { data: prof, error } = await db.from("profiles").select("id, name, role, roles, club_id, org").ilike("email", email).maybeSingle();
if (error) throw error;
if (!prof) throw new Error(`No Greenlight account for ${email}. Create one on the site first.`);

let club = prof.club_id;
if (!club) {
  // A club side needs a club: make a personal demo club.
  club = "demo-" + prof.id.slice(0, 8);
  await db.from("clubs").upsert({ id: club, name: `${prof.name || "Demo"}'s club`, school: "Viterbi" });
}
const org = prof.org || orgArg || `${prof.name || "Demo"} (sponsor demo)`;
const { error: e2 } = await db.from("profiles").update({ roles: ["club", "usg", "sponsor"], club_id: club, org }).eq("id", prof.id);
if (e2) throw e2;
console.log(`Granted club, usg and sponsor. Active role stays "${prof.role}". Club: ${club}. Sponsor org: ${org}.`);
