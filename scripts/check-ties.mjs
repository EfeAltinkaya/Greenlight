// Fetches every unique tie source URL in src/data/sponsors.ts. Fails on non-2xx/3xx.
// Run: npx tsx scripts/check-ties.mjs
const mod = await import("../src/data/sponsors.ts");
const SPONSORS = mod.SPONSORS ?? mod.default?.SPONSORS;

const TIMEOUT_MS = 15000;
const urls = new Set();
for (const s of SPONSORS) {
  if (s.tieSource) urls.add(s.tieSource);
  for (const t of s.ties ?? []) urls.add(t.source);
}

const attempt = async (url, method) => {
  const res = await fetch(url, { method, redirect: "manual", signal: AbortSignal.timeout(TIMEOUT_MS), headers: { "user-agent": "greenlight-tie-check/1.0" } });
  await res.body?.cancel();
  return res.status;
};
const ok = (status) => status === 200 || (status >= 300 && status < 400);

const check = async (url) => {
  try {
    const head = await attempt(url, "HEAD");
    if (ok(head)) return { url, status: head };
  } catch {}
  try {
    const status = await attempt(url, "GET");
    return { url, status };
  } catch (e) {
    return { url, status: 0, error: e instanceof Error ? e.message : String(e) };
  }
};

const results = await Promise.all([...urls].map(check));
let failed = 0;
for (const r of results) {
  const good = ok(r.status);
  if (!good) failed++;
  console.log(`${good ? "ok  " : "FAIL"} ${r.status || "ERR"} ${r.url}${r.error ? ` (${r.error})` : ""}`);
}
if (failed) {
  console.error(`${failed} tie source(s) failed`);
  process.exit(1);
}
console.log(`All ${results.length} tie sources reachable`);
