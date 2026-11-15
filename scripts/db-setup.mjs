// Applies supabase/schema.sql to the database in POSTGRES_URL_NON_POOLING (from .env.local). Safe to re-run.
import { readFileSync } from "node:fs";
import pg from "pg";

for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)="?(.*?)"?$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const url = process.env.POSTGRES_URL_NON_POOLING;
if (!url) throw new Error("POSTGRES_URL_NON_POOLING is missing from .env.local");
const client = new pg.Client({ connectionString: url.replace(/[?&]sslmode=[^&]*/, ""), ssl: { rejectUnauthorized: false } });
await client.connect();
await client.query(readFileSync(new URL("../supabase/schema.sql", import.meta.url), "utf8"));
const { rows } = await client.query("select table_name from information_schema.tables where table_schema='public' order by 1");
console.log("Tables:", rows.map((r) => r.table_name).join(", "));
const rls = await client.query("select relname, relrowsecurity from pg_class where relname in ('clubs','profiles','records','notices','gmail_tokens')");
console.log("Row-level security:", rls.rows.map((r) => `${r.relname}=${r.relrowsecurity}`).join(", "));
await client.end();
