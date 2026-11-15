"use client";
// The app's data layer. Pages read with useStore() and write with store.*.
// Every write goes through here, so status changes always run the workflow engine (workflow.ts),
// which records history and creates the notices the other side receives.
// Persistence: the browser cache below, mirrored to Supabase by sync.ts when a user is signed in.
import { useSyncExternalStore } from "react";
import { isSeedClub } from "./clubs";
import { applyAppToLedger, applyDealToLedger, exampleLedgerEvent } from "./ledger";
import { DEMO_CLUB_ID, SEED_APPS, SEED_CLUBS, SEED_DEALS, SEED_LEDGER, SEED_OFFERS, SEED_OUTREACH } from "./seed";
import { autoAdvance, moveApp, moveDeal } from "./workflow";
import { requestIdOf, subjectTag } from "./requestId";
import { todayISO } from "./engine";
import type { Application, AuditEntry, Club, Deal, DealStage, LedgerLine, Notice, Offer, Outreach, Status } from "./types";
import type { Sponsor } from "@/data/sponsors";

export type State = {
  clubs: Club[];
  apps: Application[];
  currentClub?: string;
  outreach?: Outreach[];
  customSponsors?: Sponsor[];
  audience?: Record<string, string[]>;
  offers?: Offer[];
  deals?: Deal[];
  notices?: Notice[];
  ledger?: LedgerLine[];
};
const KEY = "greenlight:v5";
const SERVER: State = { clubs: SEED_CLUBS, apps: SEED_APPS, currentClub: DEMO_CLUB_ID, outreach: SEED_OUTREACH, offers: SEED_OFFERS, deals: SEED_DEALS, notices: [], ledger: SEED_LEDGER };

let state: State | null = null;
const listeners = new Set<() => void>();
/** Set by sync.ts: called with each changed record so it can be saved to Supabase. */
let writer: ((kind: string, id: string, data: unknown, clubId: string | null) => void) | null = null;
let notifier: ((n: Notice) => void) | null = null;
export function attachSync(w: typeof writer, n: typeof notifier) {
  writer = w;
  notifier = n;
}

function load(): State {
  if (state) return state;
  try {
    const raw = localStorage.getItem(KEY);
    state = raw ? (JSON.parse(raw) as State) : structuredClone(SERVER);
  } catch {
    state = structuredClone(SERVER);
  }
  // Drop officer-less test clubs left in localStorage after a signed-in sync.
  const cleaned = (state!.clubs ?? []).filter((c) => isSeedClub(c) || c.hasOfficers === true || c.sample === true);
  if (cleaned.length && cleaned.length !== state!.clubs.length) {
    const currentClub = cleaned.some((c) => c.id === state!.currentClub) ? state!.currentClub : DEMO_CLUB_ID;
    state = { ...state!, clubs: cleaned, currentClub };
  } else if (!cleaned.length) {
    state = { ...state!, clubs: structuredClone(SEED_CLUBS), currentClub: DEMO_CLUB_ID };
  }
  if (!state!.ledger?.length) {
    state = { ...state!, ledger: structuredClone(SEED_LEDGER) };
  }
  // Time-based steps nobody has to click.
  let changed = false;
  const apps = state!.apps.map((a) => {
    const r = autoAdvance(a);
    if (!r) return a;
    changed = true;
    state!.notices = [...r.notices, ...(state!.notices ?? [])];
    return r.app;
  });
  if (changed) state = { ...state!, apps };
  return state!;
}

function save(next: State) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode: keep it in memory */
  }
  listeners.forEach((l) => l());
}

/** Replace the cache with data loaded from the server (sync.ts). */
export function hydrate(next: Partial<State>) {
  save({ ...load(), ...next });
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) {
      state = null;
      listeners.forEach((l) => l());
    }
  });
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useStore(): State {
  return useSyncExternalStore(subscribe, load, () => SERVER);
}

function pushNotices(s: State, list: Notice[]): State {
  list.forEach((n) => notifier?.(n));
  return { ...s, notices: [...list, ...(s.notices ?? [])].slice(0, 200) };
}

export const store = {
  get: load,
  patchApp(id: string, patch: Partial<Application> | ((a: Application) => Partial<Application>)) {
    const s = load();
    let saved: Application | null = null;
    save({ ...s, apps: s.apps.map((a) => (a.id === id ? (saved = { ...a, ...(typeof patch === "function" ? patch(a) : patch) }) : a)) });
    if (saved) writer?.("app", id, saved, (saved as Application).clubId);
  },
  /** Append a fairness/audit trail entry without clobbering other fields. */
  audit(id: string, entry: Omit<AuditEntry, "at"> & { at?: string }) {
    const at = entry.at ?? new Date().toISOString();
    this.patchApp(id, (a) => ({ audit: [...(a.audit ?? []), { at, by: entry.by, action: entry.action, detail: entry.detail }] }));
  },
  /** Append a club/USG message and notify the other side (subject includes [GL-26-XXXX]). */
  addMessage(id: string, by: "club" | "usg", text: string) {
    const s = load();
    const a = s.apps.find((x) => x.id === id);
    if (!a || !text.trim()) return;
    const rid = requestIdOf(a);
    const msg = { id: newId(), at: new Date().toISOString(), by, text: text.trim(), requestId: rid };
    const next = { ...a, messages: [...(a.messages ?? []), msg] };
    const to = by === "club" ? "usg" : "club";
    const href = by === "club" ? `/usg/app/${a.id}` : `/club/app/${a.id}#status`;
    const notice = { id: newId(), at: new Date().toISOString(), to: to as "club" | "usg", clubId: a.clubId, title: `${subjectTag(a)} New message on ${a.event.title}`, body: text.trim().slice(0, 240), href, read: false };
    save(pushNotices({ ...s, apps: s.apps.map((x) => (x.id === id ? next : x)) }, [notice]));
    writer?.("app", id, next, a.clubId);
  },
  /** Move an application through the workflow; notices go to the other side automatically. */
  moveApp(id: string, to: Status, by: "club" | "usg" | "system", note: string, patch: Partial<Application> = {}) {
    const s = load();
    const a = s.apps.find((x) => x.id === id);
    if (!a) return;
    const r = moveApp({ ...a, ...patch }, to, by, note);
    const ledger = applyAppToLedger(s.ledger ?? [], r.app, todayISO());
    save(pushNotices({ ...s, apps: s.apps.map((x) => (x.id === id ? r.app : x)), ledger }, r.notices));
    writer?.("app", id, r.app, r.app.clubId);
  },
  upsertApp(app: Application) {
    const s = load();
    const apps = s.apps.some((a) => a.id === app.id) ? s.apps.map((a) => (a.id === app.id ? app : a)) : [app, ...s.apps];
    const ledger = applyAppToLedger(s.ledger ?? [], app, todayISO());
    save({ ...s, apps, ledger });
    writer?.("app", app.id, app, app.clubId);
  },
  patchClub(id: string, patch: Partial<Club>) {
    const s = load();
    const clubs = s.clubs.map((c) => (c.id === id ? { ...c, ...patch } : c));
    save({ ...s, clubs });
    const c = clubs.find((x) => x.id === id);
    if (c) writer?.("club", id, c, id);
  },
  setClub(id: string) {
    save({ ...load(), currentClub: id });
  },
  addOutreach(o: Outreach) {
    const s = load();
    save({ ...s, outreach: [o, ...(s.outreach ?? [])] });
    writer?.("outreach", o.id, o, o.clubId);
  },
  patchOutreach(id: string, patch: Partial<Outreach>) {
    const s = load();
    let saved: Outreach | null = null;
    save({ ...s, outreach: (s.outreach ?? []).map((o) => (o.id === id ? (saved = { ...o, ...patch, updatedAt: new Date().toISOString().slice(0, 10) }) : o)) });
    if (saved) writer?.("outreach", id, saved, (saved as Outreach).clubId);
  },
  removeOutreach(id: string) {
    const s = load();
    const o = (s.outreach ?? []).find((x) => x.id === id);
    save({ ...s, outreach: (s.outreach ?? []).filter((x) => x.id !== id) });
    if (o) writer?.("outreach", id, null, o.clubId);
  },
  addSponsor(sp: Sponsor) {
    const s = load();
    save({ ...s, customSponsors: [...(s.customSponsors ?? []), sp] });
    writer?.("sponsor", sp.id, sp, s.currentClub ?? null);
  },
  setAudience(clubId: string, majors: string[]) {
    const s = load();
    save({ ...s, audience: { ...(s.audience ?? {}), [clubId]: majors } });
    const c = s.clubs.find((x) => x.id === clubId);
    if (c) writer?.("club", clubId, { ...c, audience: majors }, clubId);
  },
  addOffer(o: Offer) {
    const s = load();
    save({ ...s, offers: [o, ...(s.offers ?? [])] });
    writer?.("offer", o.id, o, null);
  },
  addDeal(d: Deal, notice?: Notice) {
    const s = load();
    const next = { ...s, deals: [d, ...(s.deals ?? [])] };
    save(notice ? pushNotices(next, [notice]) : next);
    writer?.("deal", d.id, d, d.clubId);
  },
  /** Move a sponsor deal through its steps; the other side is notified automatically. */
  moveDeal(id: string, to: DealStage, by: "club" | "sponsor", note: string, patch: Partial<Deal> = {}) {
    const s = load();
    const d = (s.deals ?? []).find((x) => x.id === id);
    if (!d) return;
    const r = moveDeal(d, to, by, note, patch);
    const ledger = applyDealToLedger(s.ledger ?? [], r.deal, todayISO());
    save(pushNotices({ ...s, deals: (s.deals ?? []).map((x) => (x.id === id ? r.deal : x)), ledger }, r.notices));
    writer?.("deal", id, r.deal, r.deal.clubId);
  },
  patchDeal(id: string, patch: Partial<Deal>) {
    const s = load();
    let saved: Deal | null = null;
    save({ ...s, deals: (s.deals ?? []).map((d) => (d.id === id ? (saved = { ...d, ...patch }) : d)) });
    if (saved) writer?.("deal", id, saved, (saved as Deal).clubId);
  },
  setLedger(lines: LedgerLine[]) {
    save({ ...load(), ledger: lines });
  },
  deleteExampleLedger(clubId: string) {
    const s = load();
    save({ ...s, ledger: (s.ledger ?? []).filter((l) => !(l.clubId === clubId && l.example)) });
  },
  ensureExampleLedger(clubId: string) {
    const s = load();
    if ((s.ledger ?? []).some((l) => l.clubId === clubId && l.example)) return;
    if ((s.ledger ?? []).some((l) => l.clubId === clubId && !l.example && l.amount > 0)) return;
    const club = s.clubs.find((c) => c.id === clubId);
    if (club?.sample) return;
    save({ ...s, ledger: [...exampleLedgerEvent(clubId, todayISO()), ...(s.ledger ?? [])] });
  },
  readNotices(to: Notice["to"], clubId: string | null) {
    const s = load();
    const ids = (s.notices ?? []).filter((n) => !n.read && n.to === to && (to !== "club" || n.clubId === clubId)).map((n) => n.id);
    if (!ids.length) return;
    save({ ...s, notices: (s.notices ?? []).map((n) => (ids.includes(n.id) ? { ...n, read: true } : n)) });
    writer?.("notice-read", "", ids, clubId);
  },
  reset() {
    save(structuredClone(SERVER));
  },
};

export const newId = () => Math.random().toString(36).slice(2, 9);

/** The club the signed-in officer belongs to (in demo mode: the club picked on the overview). */
export function useCurrentClub() {
  const s = useStore();
  return s.clubs.find((c) => c.id === (s.currentClub ?? DEMO_CLUB_ID)) ?? s.clubs[0];
}
