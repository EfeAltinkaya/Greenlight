import { decisionEmail } from "@/lib/ai";
import type { Application } from "@/lib/types";

export async function POST(req: Request) {
  const b = (await req.json()) as { app: Application; clubName: string; outcome: string; amount: number; reasonLabel: string; notes: string[] };
  return Response.json(await decisionEmail(b.app, b.clubName, b.outcome, b.amount, b.reasonLabel, b.notes ?? []));
}
