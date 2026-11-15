import { decisionEmail } from "@/lib/ai";
import type { DecisionFacts } from "@/lib/decisionGuard";

export async function POST(req: Request) {
  const f = (await req.json()) as DecisionFacts;
  return Response.json(await decisionEmail(f));
}

// AI calls can take 15+ seconds; give them room on Vercel.
export const maxDuration = 60;
