import { connection } from "next/server";
import { hasKey } from "@/lib/claude";

// Read the key at request time, not at build time.
export async function GET() {
  await connection();
  return Response.json({ ai: hasKey() });
}
