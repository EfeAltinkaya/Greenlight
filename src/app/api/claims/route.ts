import { admin, userFrom } from "@/lib/server/gmail";

// GET ?sponsor=<id>: how many OTHER clubs have an active conversation with this company
// (emailed or replied in the last 30 days). Counts only; never which clubs.
// Chancery's rule: one live conversation per organization, so a company is not flooded by USC.
export async function GET(req: Request) {
  const sponsor = new URL(req.url).searchParams.get("sponsor");
  const token = req.headers.get("authorization")?.replace("Bearer ", "") ?? null;
  const user = await userFrom(token);
  if (!user || !sponsor || !process.env.SUPABASE_SERVICE_ROLE_KEY) return Response.json({ active: 0, checked: false });
  const db = admin();
  const { data: me } = await db.from("profiles").select("club_id").eq("id", user.id).maybeSingle();
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { count } = await db
    .from("records")
    .select("id", { count: "exact", head: true })
    .eq("kind", "outreach")
    .eq("sponsor", sponsor)
    .in("status", ["emailed", "replied"])
    .neq("club_id", me?.club_id ?? "")
    .gte("updated_at", since);
  return Response.json({ active: count ?? 0, checked: true });
}
