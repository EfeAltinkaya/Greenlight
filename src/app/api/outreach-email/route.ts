import { outreachEmail, recapEmail } from "@/lib/ai";
import type { Sponsor } from "@/data/sponsors";
import type { EventInfo, SponsorPackage } from "@/lib/types";

export async function POST(req: Request) {
  const b = (await req.json()) as { sponsor: Sponsor; pkg: SponsorPackage; event: EventInfo; clubName: string; contactName?: string; recap?: boolean };
  if (!b.sponsor || !b.pkg || !b.event) return Response.json({ error: "Missing company, package or event." }, { status: 400 });
  return Response.json(b.recap ? await recapEmail(b) : await outreachEmail(b));
}

// AI calls can take 15+ seconds; give them room on Vercel.
export const maxDuration = 60;
