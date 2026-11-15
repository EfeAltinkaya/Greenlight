import { draftAnswers } from "@/lib/ai";
import type { Application } from "@/lib/types";

export async function POST(req: Request) {
  const { app, clubName, mission } = (await req.json()) as { app: Application; clubName: string; mission?: string };
  return Response.json(await draftAnswers(app, clubName, mission ?? ""));
}

// AI calls can take 15+ seconds; give them room on Vercel.
export const maxDuration = 60;
