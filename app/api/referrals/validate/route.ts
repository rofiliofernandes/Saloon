import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertSameOrigin, enforceRateLimit } from "@/lib/security";
import { z } from "zod";

const schema = z.object({ code: z.string().trim().max(50).regex(/^[A-Z0-9_-]*$/i).optional().default("") });

export async function POST(req: Request) {
  try {
    await assertSameOrigin();
    await enforceRateLimit("referral-validate", 30, 10 * 60_000);
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ valid: false }, { status: 400 });
    const code = parsed.data.code.toUpperCase();
    if (!code) return NextResponse.json({ valid: true });

    const admin = createAdminClient();
    const { data, error } = await admin.from("profiles").select("id,name").eq("referral_code", code).maybeSingle();
    if (error) throw error;

    return NextResponse.json({ valid: Boolean(data), referrerName: data?.name || null });
  } catch (error) {
    if (error instanceof Error && error.name === "RateLimitError") {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    if (error instanceof Error && error.name === "SecurityError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Referral validation failed", error);
    return NextResponse.json({ error: "Unable to validate referral code." }, { status: 500 });
  }
}
