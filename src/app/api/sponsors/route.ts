import { sponsorMatch } from "@/lib/ai";
import type { Application, SponsorPackage } from "@/lib/types";

export async function POST(req: Request) {
  const { app, clubName, packages } = (await req.json()) as { app: Application; clubName: string; packages: SponsorPackage[] };
  return Response.json(await sponsorMatch(app, clubName, packages));
}

// AI calls can take 15+ seconds; give them room on Vercel.
export const maxDuration = 60;
