import { sponsorMatch } from "@/lib/ai";
import type { Major, Sponsor } from "@/data/sponsors";
import type { Application, SponsorPackage } from "@/lib/types";
import { requireUser, unauthorized } from "@/lib/server/auth";

export async function POST(req: Request) {
  if (!(await requireUser(req))) return unauthorized();
  const { app, clubName, packages, majors, extra } = (await req.json()) as { app: Application; clubName: string; packages: SponsorPackage[]; majors?: Major[]; extra?: Sponsor[] };
  const slim = { id: app.id, event: app.event, items: app.items, answers: app.answers, decision: app.decision } as Application;
  return Response.json(await sponsorMatch(slim, clubName, packages, majors ?? [], extra ?? []));
}

export const maxDuration = 60;
