import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/**
 * Where Supabase sends people back after Google sign-in or a magic email link.
 * Handles both the PKCE `code` and the `token_hash` + `type` email-link formats.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next");
  const destination = next && next.startsWith("/") && !next.startsWith("//") ? next : "/home";

  const providerError = searchParams.get("error_description") || searchParams.get("error");
  if (providerError) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(providerError)}`);
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Ignore: called from a Server Component
          }
        },
      },
    }
  );

  let errorMessage = "auth";
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${destination}`);
    errorMessage = error.message.toLowerCase().includes("code verifier")
      ? "Open the sign-in link in the same browser you requested it from."
      : error.message;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(`${origin}${destination}`);
    errorMessage = error.message;
  }

  console.error("Auth callback error:", errorMessage);
  return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(errorMessage)}`);
}
