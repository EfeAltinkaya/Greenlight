// Gmail, read-only. Google OAuth 2.0 authorization-code flow done on the server; the refresh token
// lives only in the gmail_tokens table, which the browser cannot read.
import { createClient } from "@supabase/supabase-js";

export const SCOPE = "https://www.googleapis.com/auth/gmail.readonly openid email";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const service = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
// Trimmed: values pasted into Vercel can carry a trailing line break, which Google rejects as an unknown client.
export const googleId = process.env.GOOGLE_CLIENT_ID?.trim();
const googleSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

export const gmailReady = () => Boolean(url && anon && service && googleId && googleSecret);
export const admin = () => createClient(url, service);

/** The signed-in Supabase user behind a bearer token, or null. */
export async function userFrom(token: string | null) {
  if (!token || !url || !anon) return null;
  const c = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data } = await c.auth.getUser(token);
  return data.user ?? null;
}

export const redirectUri = (origin: string) => `${origin}/api/gmail/callback`;

export async function exchangeCode(code: string, origin: string) {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: googleId!, client_secret: googleSecret!, redirect_uri: redirectUri(origin), grant_type: "authorization_code" }),
  });
  return (await r.json()) as { access_token?: string; refresh_token?: string; id_token?: string; error?: string };
}

export async function accessToken(refresh: string) {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ refresh_token: refresh, client_id: googleId!, client_secret: googleSecret!, grant_type: "refresh_token" }),
  });
  const j = (await r.json()) as { access_token?: string };
  return j.access_token ?? null;
}

export type Mail = { id: string; threadId: string; from: string; to: string; subject: string; date: string; snippet: string; direction: "in" | "out" };

export async function search(token: string, q: string, me: string): Promise<Mail[]> {
  const auth = { headers: { Authorization: `Bearer ${token}` } };
  const list = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=8&q=${encodeURIComponent(q)}`, auth).then((r) => r.json());
  const ids: { id: string }[] = list.messages ?? [];
  return Promise.all(
    ids.map(async ({ id }) => {
      const m = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`, auth).then((r) => r.json());
      const h = (n: string) => ((m.payload?.headers ?? []) as { name: string; value: string }[]).find((x) => x.name === n)?.value ?? "";
      const from = h("From");
      return { id, threadId: m.threadId, from, to: h("To"), subject: h("Subject"), date: h("Date"), snippet: m.snippet ?? "", direction: me && from.toLowerCase().includes(me.toLowerCase()) ? "out" : "in" } as Mail;
    }),
  );
}
