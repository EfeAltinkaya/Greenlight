import { draftAnswers } from "@/lib/ai";
import type { Application } from "@/lib/types";
import { requireUser, unauthorized } from "@/lib/server/auth";

export async function POST(req: Request) {
  if (!(await requireUser(req))) return unauthorized();
  const { app, clubName, mission } = (await req.json()) as { app: Application; clubName: string; mission?: string };
  // Only the fields answers need — never ship AI comments or audit trail.
  const slim = {
    id: app.id,
    event: app.event,
    items: app.items.map(({ id, item, vendor, total, category, toSponsor, justification }) => ({ id, item, vendor, total, category, toSponsor, justification })),
    answers: app.answers,
  } as Application;
  return Response.json(await draftAnswers(slim, clubName, mission ?? ""));
}

export const maxDuration = 60;
