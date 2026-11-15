"use client";
// Who is signed in. With Supabase configured, this is a real account (email + password, session kept
// by the browser so you stay signed in). Without it, the app runs in demo mode with no login.
import { createBrowserClient } from "@supabase/ssr";
import { useSyncExternalStore } from "react";
import { startSync, stopSync } from "./sync";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const supabase = url && anon ? createBrowserClient(url, anon) : null;
export const authEnabled = Boolean(supabase);

export type User = { id: string; email: string; name: string; role: "club" | "usg" | "sponsor" | null; roles: ("club" | "usg" | "sponsor")[]; clubId: string | null; org: string | null; joinCode: string | null };
type Session = { ready: boolean; user: User | null };

let session: Session = { ready: !supabase, user: null };
const listeners = new Set<() => void>();
const set = (s: Session) => {
  session = s;
  listeners.forEach((l) => l());
};

/** Make another of this account's roles the active one. Permissions on the server follow the active role. */
export async function switchRole(role: "club" | "usg" | "sponsor") {
  if (!supabase) return;
  const { error } = await supabase.rpc("switch_role", { p_role: role });
  if (error) throw new Error(error.message);
  await refreshProfile();
}

export async function refreshProfile() {
  if (!supabase) return;
  const { data } = await supabase.auth.getUser();
  const u = data.user;
  if (!u) {
    stopSync();
    return set({ ready: true, user: null });
  }
  const { data: p } = await supabase.from("profiles").select("name, role, roles, club_id, org").eq("id", u.id).maybeSingle();
  let joinCode: string | null = null;
  if (p?.club_id) {
    const { data: c } = await supabase.from("clubs").select("join_code").eq("id", p.club_id).maybeSingle();
    joinCode = c?.join_code ?? null;
  }
  const user: User = { id: u.id, email: u.email ?? "", name: p?.name ?? "", role: (p?.role as User["role"]) ?? null, roles: ((p?.roles as User["roles"]) ?? []).length ? (p!.roles as User["roles"]) : p?.role ? [p.role as "club"] : [], clubId: p?.club_id ?? null, org: p?.org ?? null, joinCode };
  set({ ready: true, user });
  if (user.role) startSync(supabase, user);
}

if (supabase && typeof window !== "undefined") {
  refreshProfile();
  supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") refreshProfile();
  });
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const SERVER: Session = { ready: false, user: null };

export function useSession() {
  const s = useSyncExternalStore(subscribe, () => session, () => SERVER);
  return {
    ...s,
    enabled: authEnabled,
    async signOut() {
      await supabase?.auth.signOut();
      stopSync();
      window.location.href = "/login";
    },
  };
}
