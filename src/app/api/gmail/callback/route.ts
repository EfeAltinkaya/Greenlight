import { cookies } from "next/headers";
import { admin, exchangeCode } from "@/lib/server/gmail";

// Google sends the user back here with a one-time code; trade it for a refresh token and store it server-side.
export async function GET(req: Request) {
  const u = new URL(req.url);
  const jar = await cookies();
  const [nonce, userId] = (jar.get("gmail_state")?.value ?? "").split(".");
  jar.delete("gmail_state");
  const back = (q: string) => Response.redirect(`${u.origin}/club/sponsors?gmail=${q}`, 302);
  if (!nonce || nonce !== u.searchParams.get("state") || !userId) return back("expired");
  const code = u.searchParams.get("code");
  if (!code) return back("cancelled");
  const t = await exchangeCode(code, u.origin);
  if (!t.refresh_token) return back("failed");
  let email: string | null = null;
  try {
    email = JSON.parse(Buffer.from((t.id_token ?? "").split(".")[1] ?? "", "base64url").toString()).email ?? null;
  } catch {
    /* email is optional */
  }
  const { error } = await admin().from("gmail_tokens").upsert({ user_id: userId, email, refresh_token: t.refresh_token, updated_at: new Date().toISOString() });
  return back(error ? "failed" : "connected");
}
