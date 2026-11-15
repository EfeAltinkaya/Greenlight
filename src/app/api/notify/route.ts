// Emails a workflow notice to the people it is for. Called by the browser right after it saves the notice.
// The caller must be signed in; recipients are looked up with the service key, never trusted from the client.
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const resendKey = process.env.RESEND_API_KEY?.trim();
const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://greenlight-lac-tau.vercel.app";

export async function POST(req: Request) {
  if (!url || !anon || !service) return Response.json({ sent: 0, reason: "Database not configured" });
  const token = req.headers.get("authorization")?.replace("Bearer ", "") ?? "";
  const asUser = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: who } = await asUser.auth.getUser(token);
  if (!who.user) return Response.json({ error: "Sign in first." }, { status: 401 });

  const { id } = (await req.json()) as { id: string };
  const admin = createClient(url, service);
  const { data: n } = await admin.from("notices").select("*").eq("id", id).maybeSingle();
  if (!n || n.emailed) return Response.json({ sent: 0 });

  let q = admin.from("profiles").select("email").eq("role", n.to_role);
  if (n.to_role === "club") q = q.eq("club_id", n.club_id);
  if (n.to_role === "sponsor") q = q.eq("org", n.sponsor);
  const { data: people } = await q;
  const to = (people ?? []).map((p) => p.email).filter(Boolean) as string[];
  if (!to.length || !resendKey) return Response.json({ sent: 0, reason: resendKey ? "No recipients" : "Email not configured" });

  const resend = new Resend(resendKey);
  const link = new URL(n.href, site).toString();
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "Greenlight <onboarding@resend.dev>",
    to,
    subject: n.title,
    text: `${n.body}\n\nOpen in Greenlight: ${link}\n\nYou get this email because you have a Greenlight account.`,
  });
  if (error) return Response.json({ sent: 0, error: error.message }, { status: 502 });
  await admin.from("notices").update({ emailed: true }).eq("id", id);
  return Response.json({ sent: to.length });
}
