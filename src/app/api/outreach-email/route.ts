import { followUpEmail, outreachEmail, recapEmail, replyEmail } from "@/lib/ai";
import type { Sponsor } from "@/data/sponsors";
import type { EventInfo, SponsorPackage } from "@/lib/types";
import { requireUser, unauthorized } from "@/lib/server/auth";

export async function POST(req: Request) {
  if (!(await requireUser(req))) return unauthorized();
  const b = (await req.json()) as { sponsor: Sponsor; pkg: SponsorPackage; event: EventInfo; clubName: string; contactName?: string; recap?: boolean; followUp?: boolean; reply?: { theirMessage: string; note: string }; firstSubject?: string };
  if (!b.sponsor || !b.pkg || !b.event) return Response.json({ error: "Missing company, package or event." }, { status: 400 });
  if (b.reply) {
    if (!b.reply.note?.trim()) return Response.json({ error: "Write what you want to say first." }, { status: 400 });
    return Response.json(await replyEmail({ ...b, ...b.reply, firstSubject: b.firstSubject ?? `${b.clubName} and ${b.sponsor.name}` }));
  }
  if (b.followUp) return Response.json(await followUpEmail({ ...b, firstSubject: b.firstSubject ?? `${b.clubName}: ${b.event.title}` }));
  return Response.json(b.recap ? await recapEmail(b) : await outreachEmail(b));
}

export const maxDuration = 60;
