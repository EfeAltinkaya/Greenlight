#!/usr/bin/env node
/**
 * Demo-mode route smoke test: boots next start (or hits an existing server),
 * fetches every public app route, and fails on non-2xx / HTML that looks like a React crash.
 * Usage: node scripts/smoke-routes.mjs [baseUrl]
 * Default: starts `npm run build && npm run start` on :3456 when no URL is passed.
 */
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const ROUTES = [
  "/",
  "/login",
  "/club",
  "/club/new",
  "/club/requests",
  "/club/deadlines",
  "/club/funding",
  "/club/sponsors",
  "/club/offers",
  "/club/deals",
  "/club/money",
  "/club/help",
  "/club/rules",
  "/club/updates",
  "/usg",
  "/usg/insights",
  "/usg/rules",
  "/usg/updates",
  "/sponsor",
  "/sponsor/deals",
  "/sponsor/updates",
];

const CRASH_MARKERS = [
  "Minified React error",
  "Application error: a client-side exception",
  "maximum update depth exceeded",
  "Unhandled Runtime Error",
];

const baseArg = process.argv[2];
let base = baseArg?.replace(/\/$/, "") ?? "";
let child = null;

async function waitForServer(url, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { redirect: "manual" });
      if (r.status > 0) return;
    } catch {
      /* not up yet */
    }
    await sleep(500);
  }
  throw new Error(`Server did not start at ${url}`);
}

async function main() {
  if (!base) {
    base = "http://127.0.0.1:3456";
    console.log("Building…");
    await run("npm", ["run", "build"]);
    console.log("Starting next on :3456…");
    child = spawn("npx", ["next", "start", "-p", "3456"], {
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, PORT: "3456" },
    });
    let boot = "";
    child.stdout.on("data", (d) => { boot += d; });
    child.stderr.on("data", (d) => { boot += d; });
    await waitForServer(base);
  }

  const failures = [];
  for (const path of ROUTES) {
    const url = base + path;
    try {
      const res = await fetch(url, {
        headers: { Accept: "text/html" },
        redirect: "follow",
      });
      const text = await res.text();
      if (res.status >= 500) {
        failures.push(`${path}: HTTP ${res.status}`);
        continue;
      }
      for (const m of CRASH_MARKERS) {
        if (text.includes(m)) {
          failures.push(`${path}: page HTML contains "${m}"`);
          break;
        }
      }
      // /club/help must render the help chrome, not a blank error boundary forever.
      if (path === "/club/help" && !/Who to contact|Ask a person|office hours|Funding/i.test(text) && res.status >= 400) {
        failures.push(`${path}: unexpected response (${res.status})`);
      }
      console.log(`ok  ${path} (${res.status})`);
    } catch (e) {
      failures.push(`${path}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  if (child) {
    child.kill("SIGTERM");
  }

  if (failures.length) {
    console.error("\nSmoke failures:");
    for (const f of failures) console.error(" -", f);
    process.exit(1);
  }
  console.log(`\nAll ${ROUTES.length} routes passed.`);
}

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: "inherit" });
    p.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(" ")} exited ${code}`))));
  });
}

main().catch((e) => {
  if (child) child.kill("SIGTERM");
  console.error(e);
  process.exit(1);
});
