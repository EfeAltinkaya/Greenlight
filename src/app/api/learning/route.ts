import { admin, userFrom } from "@/lib/server/gmail";
import { tally } from "@/lib/sponsorLearning";
import { todayISO } from "@/lib/engine";
import type { Outreach } from "@/lib/types";

// GET: reply counts per company, pooled across every club's outreach, so the sponsor ranking learns from
// all of USC. Counts only: no club names, contacts, notes or emails leave the server.
export async function GET(req: Request) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "") ?? null;
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !(await userFrom(token))) return Response.json({ tallies: {}, pooled: false });
  const { data, error } = await admin().from("records").select("data").eq("kind", "outreach");
  if (error) return Response.json({ tallies: {}, pooled: false });
  const rows = (data ?? []).map((r) => r.data as Outreach).filter((o) => o?.sponsorId);
  return Response.json({ tallies: tally(rows, todayISO()), pooled: true, outcomes: rows.length });
}
