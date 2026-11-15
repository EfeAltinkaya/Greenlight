import { decisionEmail } from "@/lib/ai";
import type { Application } from "@/lib/types";
import { requireUser, unauthorized } from "@/lib/server/auth";

export async function POST(req: Request) {
  if (!(await requireUser(req))) return unauthorized();
  const b = (await req.json()) as { app: Application; clubName: string; outcome: string; amount: number; reasonLabel: string; notes: string[] };
  const slim = { id: b.app.id, event: b.app.event, items: b.app.items, answers: b.app.answers } as Application;
  return Response.json(await decisionEmail(slim, b.clubName, b.outcome, b.amount, b.reasonLabel, b.notes ?? []));
}

export const maxDuration = 60;
