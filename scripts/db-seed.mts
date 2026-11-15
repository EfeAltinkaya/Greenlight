// Loads the sample clubs, applications and sponsor offers into Supabase (marked as samples). Safe to re-run.
import { readFileSync } from "node:fs";
import pg from "pg";
const seedModule = await import("../src/lib/seed.ts");
const { SEED_APPS, SEED_CLUBS, SEED_OFFERS } = ((seedModule as { default?: unknown }).default ?? seedModule) as typeof import("../src/lib/seed");

for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)="?(.*?)"?$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const client = new pg.Client({ connectionString: process.env.POSTGRES_URL_NON_POOLING!.replace(/[?&]sslmode=[^&]*/, ""), ssl: { rejectUnauthorized: false } });
await client.connect();
for (const c of SEED_CLUBS) {
  await client.query(
    "insert into clubs (id, name, school, startup_eligible, received_this_year, events_this_semester, sample) values ($1,$2,$3,$4,$5,$6,true) on conflict (id) do update set name = excluded.name, sample = true",
    [c.id, c.name + " (sample)", c.school, c.startupEligible, c.receivedThisYear, c.eventsThisSemester],
  );
}
for (const a of SEED_APPS.filter((x) => x.status !== "draft")) {
  await client.query("insert into records (kind, id, club_id, owner, status, data) values ('app',$1,$2,null,$3,$4) on conflict (kind, id) do update set data = excluded.data, status = excluded.status", [a.id, a.clubId, a.status, a]);
}
for (const o of SEED_OFFERS) {
  await client.query("insert into records (kind, id, club_id, owner, status, sponsor, data) values ('offer',$1,null,null,null,$2,$3) on conflict (kind, id) do update set data = excluded.data", [o.id, o.sponsorName, o]);
}
const { rows } = await client.query("select kind, count(*) from records group by kind order by kind");
console.log(rows.map((r) => `${r.kind}: ${r.count}`).join(", "), "| clubs:", (await client.query("select count(*) from clubs")).rows[0].count);
await client.end();
