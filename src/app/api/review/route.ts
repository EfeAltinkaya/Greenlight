import { reviewComments } from "@/lib/ai";
import type { Application, Check } from "@/lib/types";
import { requireUser, unauthorized } from "@/lib/server/auth";

export async function POST(req: Request) {
  if (!(await requireUser(req))) return unauthorized();
  const { app, checks } = (await req.json()) as { app: Application; checks: Check[] };
  const slim = {
    id: app.id,
    event: app.event,
    items: app.items.map(({ id, item, vendor, total, category, toSponsor }) => ({ id, item, vendor, total, category, toSponsor })),
    answers: app.answers,
    docs: app.docs,
    uepa: app.uepa,
    status: app.status,
  } as Application;
  return Response.json(await reviewComments(slim, checks));
}

export const maxDuration = 60;
