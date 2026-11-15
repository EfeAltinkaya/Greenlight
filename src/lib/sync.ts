"use client";
// Mirrors the app's data to Supabase for a signed-in user:
//   load   - pull everything this user may see (row-level security decides what that is),
//   write  - every store change is upserted,
//   live   - a Realtime subscription reloads when the other side changes something,
//   notify - each workflow notice is saved and handed to /api/notify, which emails the people it is for.
import type { SupabaseClient } from "@supabase/supabase-js";
import { attachSync, hydrate, store } from "./store";
import type { Application, Club, Deal, Notice, Offer, Outreach } from "./types";
import type { Sponsor } from "@/data/sponsors";
import type { User } from "./session";

let channel: ReturnType<SupabaseClient["channel"]> | null = null;
let current: { client: SupabaseClient; user: User } | null = null;

type ClubRow = { id: string; name: string; school: Club["school"]; startup_eligible: boolean; received_this_year: number; events_this_semester: number; audience: string[]; mission?: string | null; sample?: boolean | null };
const SEED_IDS = new Set(["builders", "dance", "shore", "fintech", "chess"]);
const toClub = (r: ClubRow, hasOfficers: boolean): Club => ({
  id: r.id,
  name: r.name,
  school: r.school,
  startupEligible: r.startup_eligible,
  receivedThisYear: Number(r.received_this_year),
  eventsThisSemester: r.events_this_semester,
  mission: r.mission ?? "",
  sample: Boolean(r.sample) || SEED_IDS.has(r.id) || /\(sample\)/i.test(r.name),
  hasOfficers,
});

async function loadAll() {
  if (!current) return;
  const { client, user } = current;
  const [clubs, records, notices] = await Promise.all([
    client.from("clubs").select("*"),
    client.from("records").select("kind, data"),
    client.from("notices").select("*").order("created_at", { ascending: false }).limit(200),
  ]);
  let officerList: { club_id: string }[] | null = null;
  try {
    const officerRows = await client.from("club_officer_ids").select("club_id");
    if (!officerRows.error) officerList = (officerRows.data ?? []) as { club_id: string }[];
  } catch {
    officerList = null;
  }
  const rows = (records.data ?? []) as { kind: string; data: unknown }[];
  const of = <T,>(k: string) => rows.filter((r) => r.kind === k).map((r) => r.data as T);
  const clubRows = (clubs.data ?? []) as ClubRow[];
  // If the view is not applied yet, treat the signed-in club as having officers.
  const officerSet = new Set(
    officerList?.map((r) => r.club_id) ??
      (user.clubId ? [user.clubId] : []),
  );
  // Club officers only keep their own club in the client store (plus nothing else).
  // USG keeps clubs that have officers or are marked samples; drop empty test clubs.
  const mapped = clubRows
    .map((r) => toClub(r, officerSet.has(r.id) || (user.role === "club" && r.id === user.clubId)))
    .filter((c) => {
      if (user.role === "club") return c.id === user.clubId;
      if (user.role === "usg") return c.hasOfficers || c.sample;
      return true;
    });
  hydrate({
    clubs: mapped.length ? mapped : clubRows.map((r) => toClub(r, true)),
    currentClub: user.clubId ?? undefined,
    audience: Object.fromEntries(clubRows.map((c) => [c.id, c.audience ?? []])),
    apps: of<Application>("app"),
    outreach: of<Outreach>("outreach"),
    offers: of<Offer>("offer"),
    deals: of<Deal>("deal"),
    customSponsors: of<Sponsor>("sponsor"),
    notices: ((notices.data ?? []) as { id: string; to_role: Notice["to"]; club_id: string | null; title: string; body: string; href: string; read: boolean; created_at: string }[]).map((n) => ({ id: n.id, at: n.created_at, to: n.to_role, clubId: n.club_id, title: n.title, body: n.body, href: n.href, read: n.read })),
  });
}

function write(kind: string, id: string, data: unknown, clubId: string | null) {
  if (!current) return;
  const { client } = current;
  if (kind === "notice-read") {
    client.from("notices").update({ read: true }).in("id", data as string[]).then(logError);
    return;
  }
  if (kind === "club") {
    const c = data as Club & { audience?: string[] };
    client.from("clubs").update({ received_this_year: c.receivedThisYear, events_this_semester: c.eventsThisSemester, audience: c.audience, mission: c.mission ?? "" }).eq("id", id).then(logError);
    return;
  }
  if (data === null) {
    client.from("records").delete().eq("kind", kind).eq("id", id).then(logError);
    return;
  }
  const d = data as { status?: string; stage?: string; sponsorName?: string; sponsorId?: string };
  client.from("records").upsert({ kind, id, club_id: kind === "offer" ? null : clubId, status: d.status ?? d.stage ?? null, sponsor: d.sponsorName ?? d.sponsorId ?? null, data, updated_at: new Date().toISOString() }).then(logError);
}

function notify(n: Notice) {
  if (!current) return;
  const { client } = current;
  const deal = n.to === "sponsor" ? store.get().deals?.find((d) => n.href.includes(d.id)) : undefined;
  client.from("notices").insert({ id: n.id, to_role: n.to, club_id: n.clubId, sponsor: deal?.sponsorName ?? null, title: n.title, body: n.body, href: n.href }).then(async ({ error }) => {
    if (error) return logError({ error });
    const { data } = await client.auth.getSession();
    fetch("/api/notify", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${data.session?.access_token ?? ""}` }, body: JSON.stringify({ id: n.id }) }).catch(() => {});
  });
}

function logError({ error }: { error: unknown }) {
  if (error) console.error("Greenlight sync:", error);
}

export function startSync(client: SupabaseClient, user: User) {
  if (current?.user.id === user.id) return;
  current = { client, user };
  attachSync(write, notify);
  loadAll();
  channel?.unsubscribe();
  let t: ReturnType<typeof setTimeout> | null = null;
  const reload = () => {
    if (t) clearTimeout(t);
    t = setTimeout(loadAll, 250);
  };
  // Live updates check row permissions with the signed-in token, so hand it over before subscribing.
  client.auth.getSession().then(({ data }) => {
    if (current?.client !== client) return;
    if (data.session) client.realtime.setAuth(data.session.access_token);
    channel = client
    .channel("greenlight-live")
    .on("postgres_changes", { event: "*", schema: "public", table: "records" }, reload)
    .on("postgres_changes", { event: "*", schema: "public", table: "notices" }, reload)
    .on("postgres_changes", { event: "*", schema: "public", table: "clubs" }, reload)
    .subscribe();
  });
}

export function stopSync() {
  channel?.unsubscribe();
  channel = null;
  current = null;
  attachSync(null, null);
  // Drop live clubs (including empty test clubs) so demo mode returns to seed only.
  store.reset();
}
