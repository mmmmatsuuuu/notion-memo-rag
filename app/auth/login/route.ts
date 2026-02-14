import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") ?? requestUrl.protocol.replace(":", "");
  const baseUrl = host ? `${protocol}://${host}` : requestUrl.origin;
  const redirectTo = `${baseUrl}/auth/callback`;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo
    }
  });

  if (error || !data.url) {
    console.error("OAuth start failed", error?.message);
    return NextResponse.redirect(new URL("/?auth_error=oauth_start_failed", requestUrl.origin));
  }

  return NextResponse.redirect(data.url);
}
