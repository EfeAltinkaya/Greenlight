import { cookies } from "next/headers";
import { gmailReady, googleId, redirectUri, SCOPE, userFrom } from "@/lib/server/gmail";

// Starts "Connect Gmail": checks who is asking, remembers them in a short-lived httpOnly cookie, sends them to Google.
export async function GET(req: Request) {
  const u = new URL(req.url);
  if (!gmailReady()) return Response.redirect(`${u.origin}/club/sponsors?gmail=not-configured`, 302);
  const user = await userFrom(u.searchParams.get("token"));
  if (!user) return Response.redirect(`${u.origin}/login`, 302);
  const nonce = crypto.randomUUID();
  (await cookies()).set("gmail_state", `${nonce}.${user.id}`, { httpOnly: true, secure: u.protocol === "https:", sameSite: "lax", maxAge: 600, path: "/" });
  const google = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  google.search = new URLSearchParams({
    client_id: googleId!, redirect_uri: redirectUri(u.origin), response_type: "code", scope: SCOPE,
    access_type: "offline", prompt: "consent", state: nonce, login_hint: user.email ?? "",
  }).toString();
  return Response.redirect(google.toString(), 302);
}
