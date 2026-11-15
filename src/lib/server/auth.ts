// Shared server-side auth for API routes. Demo mode (no Supabase env) stays open.
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const authConfigured = Boolean(url && anon);

/** Bearer token from an Authorization header, or null. */
export function bearer(req: Request) {
  return req.headers.get("authorization")?.replace(/^Bearer\s+/i, "")?.trim() || null;
}

/** The signed-in Supabase user, or null. When auth is not configured, returns a demo stub. */
export async function requireUser(req: Request): Promise<{ id: string; email?: string } | null> {
  if (!authConfigured) return { id: "demo" };
  const token = bearer(req);
  if (!token) return null;
  const c = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data } = await c.auth.getUser(token);
  return data.user ? { id: data.user.id, email: data.user.email } : null;
}

export function unauthorized() {
  return Response.json({ error: "Sign in first." }, { status: 401 });
}
