// Fetches USG Funding Department roster CSV and diffs names/emails vs src/data/people.ts.
// Run manually: node scripts/build-roster.mjs
import { readFileSync } from "node:fs";

const CSV_URL =
  "https://docs.google.com/spreadsheets/d/1ETOTjL6zybDigD3NXk5JVfYrMYInox85SsWf3DqGfpw/gviz/tq?tqx=out:csv&sheet=Funding";

const peoplePath = new URL("../src/data/people.ts", import.meta.url);

function parseCsv(text) {
  const rows = [];
  let row = [],
    cur = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i++;
        } else quoted = false;
      } else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(cur);
      cur = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cur);
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
      cur = "";
    } else cur += c;
  }
  if (cur || row.length) {
    row.push(cur);
    rows.push(row);
  }
  return rows;
}

function fromPeopleTs(source) {
  const names = [...source.matchAll(/name:\s*"([^"]+)"/g)].map((m) => m[1]);
  const emails = [...source.matchAll(/email:\s*"([^"]+)"/g)].map((m) => m[1]);
  return { names: new Set(names), emails: new Set(emails) };
}

function fromSheet(rows) {
  const names = new Set();
  const emails = new Set();
  const emailRe = /[a-z0-9._+-]+@usc\.edu/gi;
  for (const row of rows) {
    for (const cell of row) {
      const t = (cell ?? "").trim();
      if (!t) continue;
      const found = t.match(emailRe);
      if (found) found.forEach((e) => emails.add(e.toLowerCase()));
      if (t.includes("@")) continue;
      if (/^(mon|tue|wed|thu|fri|sat|sun)\b/i.test(t)) continue;
      if (/^\d{1,2}([:.]\d{2})?\s*(am|pm)?/i.test(t)) continue;
      if (/director|delegate|aide|funding|fund|roster|name|email|hours|role|board|fall|spring/i.test(t) && t.length < 40) continue;
      if (/^[A-Z][a-z]+(\s+[A-Z][a-z'.-]+)+$/.test(t)) names.add(t);
    }
  }
  return { names, emails };
}

function diff(label, a, b) {
  const onlyA = [...a].filter((x) => !b.has(x)).sort();
  const onlyB = [...b].filter((x) => !a.has(x)).sort();
  if (!onlyA.length && !onlyB.length) {
    console.log(`${label}: no changes`);
    return;
  }
  console.log(`${label}:`);
  if (onlyA.length) console.log(`  only in people.ts (${onlyA.length}):`, onlyA.join(", ") || "(none)");
  if (onlyB.length) console.log(`  only in sheet (${onlyB.length}):`, onlyB.join(", ") || "(none)");
}

const local = readFileSync(peoplePath, "utf8");
const localData = fromPeopleTs(local);

console.log("Fetching roster CSV…");
const res = await fetch(CSV_URL);
if (!res.ok) {
  console.error(`Fetch failed: ${res.status} ${res.statusText}`);
  process.exit(1);
}
const csv = await res.text();
const sheetData = fromSheet(parseCsv(csv));

diff("Names", localData.names, sheetData.names);
diff("Emails", localData.emails, sheetData.emails);