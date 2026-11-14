import { readQuote } from "@/lib/ai";

const TYPES = ["application/pdf", "image/png", "image/jpeg", "image/webp"];

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "No file uploaded." }, { status: 400 });
  if (!TYPES.includes(file.type)) return Response.json({ error: "Upload a PDF, PNG, JPG or WebP." }, { status: 415 });
  if (file.size > 8 * 1024 * 1024) return Response.json({ error: "File is over 8 MB." }, { status: 413 });
  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  const r = await readQuote(base64, file.type);
  if (!r) return Response.json({ error: "Reading quotes needs the AI key. Enter the total by hand for now.", offline: true }, { status: 503 });
  return Response.json(r);
}

// AI calls can take 15+ seconds; give them room on Vercel.
export const maxDuration = 60;
