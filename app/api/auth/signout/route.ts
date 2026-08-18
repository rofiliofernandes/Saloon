import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assertSameOrigin } from "@/lib/security";

export async function POST(req: Request) {
  try {
    await assertSameOrigin();
    const s = await createClient();
    await s.auth.signOut();
    return NextResponse.redirect(new URL("/", req.url), { status: 303 });
  } catch (error: any) {
    if (error?.name === "SecurityError") return NextResponse.json({ error: error.message }, { status: 403 });
    console.error("Signout failed", error);
    return NextResponse.redirect(new URL("/", req.url), { status: 303 });
  }
}
