import { draftAnswers } from "@/lib/ai";
import type { Application } from "@/lib/types";

export async function POST(req: Request) {
  const { app, clubName } = (await req.json()) as { app: Application; clubName: string };
  return Response.json(await draftAnswers(app, clubName));
}
