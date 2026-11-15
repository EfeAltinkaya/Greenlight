"use client";
// Authenticated fetch for AI and decision routes. Demo mode (no Supabase) sends no token.
import { supabase } from "./session";

/** Same as fetch, but adds a Bearer token when the user is signed in. */
export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) headers.set("authorization", `Bearer ${token}`);
  }
  return fetch(input, { ...init, headers });
}
