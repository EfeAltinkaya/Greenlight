import { reviewComments } from "@/lib/ai";
import type { Application, Check } from "@/lib/types";

export async function POST(req: Request) {
  const { app, checks } = (await req.json()) as { app: Application; checks: Check[] };
  return Response.json(await reviewComments(app, checks));
}
