import { intake } from "@/lib/ai";
import { todayISO } from "@/lib/engine";

export async function POST(req: Request) {
  const { text } = (await req.json()) as { text?: string };
  if (!text || text.trim().length < 8) return Response.json({ error: "Describe the event in a sentence or two." }, { status: 400 });
  return Response.json(await intake(text.slice(0, 4000), todayISO()));
}

// AI calls can take 15+ seconds; give them room on Vercel.
export const maxDuration = 60;
