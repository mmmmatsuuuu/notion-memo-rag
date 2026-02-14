import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";
import { isAllowedEmail } from "../../../lib/auth/allowed-email";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const { searchParams } = requestUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") ?? requestUrl.protocol.replace(":", "");
  const baseUrl = host ? `${protocol}://${host}` : requestUrl.origin;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("OAuth code exchange failed", error.message);
      return NextResponse.redirect(new URL("/?auth_error=oauth_exchange_failed", baseUrl));
    }

    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError) {
      console.error("OAuth user fetch failed", userError.message);
      return NextResponse.redirect(new URL("/?auth_error=oauth_user_fetch_failed", baseUrl));
    }

    if (!isAllowedEmail(user?.email)) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/?auth_error=forbidden_email", baseUrl));
    }
  }

  return NextResponse.redirect(new URL(next, baseUrl));
}
