import { intake } from "@/lib/ai";
import { todayISO } from "@/lib/engine";
import { requireUser, unauthorized } from "@/lib/server/auth";

export async function POST(req: Request) {
  if (!(await requireUser(req))) return unauthorized();
  const { text } = (await req.json()) as { text?: string };
  if (!text || text.trim().length < 8) return Response.json({ error: "Describe the event in a sentence or two." }, { status: 400 });
  return Response.json(await intake(text.slice(0, 4000), todayISO()));
}

export const maxDuration = 60;
