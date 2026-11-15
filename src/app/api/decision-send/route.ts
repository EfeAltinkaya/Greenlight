// Sends the drafted decision email to the club officers. Auth required when Supabase is configured.
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { authConfigured, requireUser, unauthorized } from "@/lib/server/auth";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const resendKey = process.env.RESEND_API_KEY;
const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://greenlight-lac-tau.vercel.app";

export async function POST(req: Request) {
  const user = await requireUser(req);
  if (!user) return unauthorized();

  const body = (await req.json()) as {
    clubId: string;
    appId: string;
    title: string;
    outcome: string;
    amount: number;
    email: string;
  };
  if (!body.email?.trim() || !body.clubId || !body.appId) {
    return Response.json({ error: "Missing decision email." }, { status: 400 });
  }

  // Demo / no mail config: succeed locally so the UI can finish the workflow.
  if (!authConfigured || !url || !service || !resendKey) {
    return Response.json({ sent: 0, offline: "saved", reason: resendKey ? "No recipients lookup" : "Email not configured (saved in Greenlight)" });
  }

  const admin = createClient(url, service);
  const { data: people } = await admin.from("profiles").select("email").eq("role", "club").eq("club_id", body.clubId);
  const to = (people ?? []).map((p) => p.email).filter(Boolean) as string[];
  if (!to.length) return Response.json({ sent: 0, status: "saved", reason: "No club recipients" });

  const resend = new Resend(resendKey);
  const subject =
    body.outcome === "denied"
      ? `USG decision: ${body.title} was not funded`
      : `USG decision: ${body.title} — ${body.outcome === "partial" ? "partly funded" : "funded"}`;
  const link = new URL(`/club/app/${body.appId}#status`, site).toString();
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "Greenlight <onboarding@resend.dev>",
    to,
    subject,
    text: `${body.email.trim()}\n\n---\nOpen in Greenlight: ${link}\n`,
  });
  if (error) return Response.json({ sent: 0, error: error.message }, { status: 502 });
  return Response.json({ sent: to.length, status: "emailed" });
}

export const maxDuration = 30;
