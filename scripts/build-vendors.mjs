// Turns USG's public Vendor List (Google Sheet exported as CSV) into src/data/vendors.json.
// Run: node scripts/build-vendors.mjs   (re-run whenever USG updates the sheet)
import { readFileSync, writeFileSync } from "node:fs";

const csv = readFileSync(new URL("./raw/vendors.csv", import.meta.url), "utf8");

// Minimal CSV parser: handles quoted fields with commas and newlines.
const rows = [];
let row = [], cur = "", quoted = false;
for (let i = 0; i < csv.length; i++) {
  const c = csv[i];
  if (quoted) {
    if (c === '"') { if (csv[i + 1] === '"') { cur += '"'; i++; } else quoted = false; }
    else cur += c;
  } else if (c === '"') quoted = true;
  else if (c === ",") { row.push(cur); cur = ""; }
  else if (c === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
  else cur += c;
}
if (cur || row.length) { row.push(cur); rows.push(row); }

const clean = (s) => (s ?? "").replace(/\s+/g, " ").trim();

function registration(note) {
  const n = note.toLowerCase();
  if (/approved/.test(n)) return "approved";
  if (/in progress|\bip\b/.test(n)) return "in_progress";
  if (/invited/.test(n)) return "invited";
  if (/none/.test(n)) return "none";
  return "unknown";
}

const kinds = { C: "Catering", R: "Restaurant", T: "Food truck" };
let category = "Food";
const vendors = [];
for (const r of rows.slice(2)) {
  const [id, note, type, name, cuisine, website] = r.map(clean);
  if (!name) {
    // A heading row like "Italian/Pizza" (some heading cells hold a supplier code instead).
    if (id && !/^(SUP|KFS)/i.test(id)) category = id.replace(/"/g, "");
    continue;
  }
  vendors.push({
    supplierId: id || null,
    name,
    category,
    kinds: type ? type.split(/[,\s]+/).filter(Boolean).map((k) => kinds[k] ?? k) : [],
    cuisine: cuisine || null,
    website: website || null,
    active: !/inactive|not found/i.test(note),
    registration: registration(note),
    note: note || null,
  });
}

writeFileSync(
  new URL("../src/data/vendors.json", import.meta.url),
  JSON.stringify({ source: "USG Funding Department Vendor List (Google Sheet)", fetched: new Date().toISOString().slice(0, 10), vendors }, null, 2),
);
console.log(`Wrote ${vendors.length} vendors`);
