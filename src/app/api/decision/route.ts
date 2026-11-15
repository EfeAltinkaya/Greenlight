import { decisionEmail } from "@/lib/ai";
import type { DecisionFacts } from "@/lib/decisionGuard";
import { requireUser, unauthorized } from "@/lib/server/auth";

export async function POST(req: Request) {
  if (!(await requireUser(req))) return unauthorized();
  const f = (await req.json()) as DecisionFacts;
  return Response.json(await decisionEmail(f));
}

export const maxDuration = 60;
