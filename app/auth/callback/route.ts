import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/";
  return value;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));

  if (!code) return NextResponse.redirect(new URL("/?auth_error=invalid_callback", req.url));

  try {
    const s = await createClient();
    const { error } = await s.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("Auth callback exchange failed", error);
      return NextResponse.redirect(new URL("/login?error=invalid_or_expired_link", req.url));
    }
    return NextResponse.redirect(new URL(next, req.url));
  } catch (error) {
    console.error("Auth callback failed", error);
    return NextResponse.redirect(new URL("/login?error=invalid_or_expired_link", req.url));
  }
}
