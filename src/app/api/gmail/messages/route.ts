import { accessToken, admin, gmailReady, search, userFrom } from "@/lib/server/gmail";

const bearer = (req: Request) => req.headers.get("authorization")?.replace("Bearer ", "") ?? null;

// GET: is Gmail set up on the server, and has this user connected it?
export async function GET(req: Request) {
  if (!gmailReady()) return Response.json({ configured: false, connected: false });
  const user = await userFrom(bearer(req));
  if (!user) return Response.json({ configured: true, connected: false });
  const { data } = await admin().from("gmail_tokens").select("email").eq("user_id", user.id).maybeSingle();
  return Response.json({ configured: true, connected: Boolean(data), email: data?.email ?? null });
}

// POST { email?, name? }: recent emails with one sponsor, from the signed-in user's own Gmail (read-only).
export async function POST(req: Request) {
  if (!gmailReady()) return Response.json({ error: "Gmail is not configured on this server." }, { status: 503 });
  const user = await userFrom(bearer(req));
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });
  const { data } = await admin().from("gmail_tokens").select("email, refresh_token").eq("user_id", user.id).maybeSingle();
  if (!data) return Response.json({ error: "Connect Gmail first." }, { status: 409 });
  const token = await accessToken(data.refresh_token);
  if (!token) return Response.json({ error: "Google did not accept the saved connection. Connect Gmail again." }, { status: 401 });
  const { email, name } = (await req.json()) as { email?: string; name?: string };
  const domain = email?.includes("@") ? email.split("@")[1] : null;
  const personal = /gmail\.com|yahoo\.com|outlook\.com|hotmail\.com|example\.com/i;
  const q = domain && !personal.test(domain)
    ? `(from:${domain} OR to:${domain}) newer_than:90d`
    : email?.includes("@")
      ? `(from:${email} OR to:${email}) newer_than:90d`
      : `"${(name ?? "").replace(/^Sample:\s*/, "")}" newer_than:90d`;
  const mails = await search(token, q, data.email ?? user.email ?? "");
  return Response.json({ query: q, mails });
}
