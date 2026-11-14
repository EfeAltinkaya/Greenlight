"use client";
// Demo storage: one shared store in the browser (localStorage), so a club submission shows up in
// the USG queue on the same machine. The shape matches the database tables in the spec, so this
// file is the only one to change when we move to Supabase.
import { useSyncExternalStore } from "react";
import { SEED_APPS, SEED_CLUBS } from "./seed";
import type { Application, Club, Status } from "./types";

type State = { clubs: Club[]; apps: Application[] };
const KEY = "greenlight:v1";
const SERVER: State = { clubs: SEED_CLUBS, apps: SEED_APPS };

let state: State | null = null;
const listeners = new Set<() => void>();

function load(): State {
  if (state) return state;
  try {
    const raw = localStorage.getItem(KEY);
    state = raw ? (JSON.parse(raw) as State) : structuredClone(SERVER);
  } catch {
    state = structuredClone(SERVER);
  }
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

export const store = {
  get: load,
  upsertApp(app: Application) {
    const s = load();
    const apps = s.apps.some((a) => a.id === app.id) ? s.apps.map((a) => (a.id === app.id ? app : a)) : [app, ...s.apps];
    save({ ...s, apps });
  },
  patchApp(id: string, patch: Partial<Application> | ((a: Application) => Partial<Application>)) {
    const s = load();
    save({ ...s, apps: s.apps.map((a) => (a.id === id ? { ...a, ...(typeof patch === "function" ? patch(a) : patch) } : a)) });
  },
  setStatus(id: string, status: Status, note: string) {
    const at = new Date().toISOString().slice(0, 10);
    store.patchApp(id, (a) => ({ status, history: [...a.history, { at, status, note }] }));
  },
  patchClub(id: string, patch: Partial<Club>) {
    const s = load();
    save({ ...s, clubs: s.clubs.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
  },
  reset() {
    save(structuredClone(SERVER));
  },
};

export const newId = () => Math.random().toString(36).slice(2, 9);
