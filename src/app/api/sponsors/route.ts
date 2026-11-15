import { sponsorMatch } from "@/lib/ai";
import type { Major, Sponsor } from "@/data/sponsors";
import type { Application, SponsorPackage } from "@/lib/types";

export async function POST(req: Request) {
  const { app, clubName, packages, majors, extra } = (await req.json()) as { app: Application; clubName: string; packages: SponsorPackage[]; majors?: Major[]; extra?: Sponsor[] };
  return Response.json(await sponsorMatch(app, clubName, packages, majors ?? [], extra ?? []));
}

// AI calls can take 15+ seconds; give them room on Vercel.
export const maxDuration = 60;
