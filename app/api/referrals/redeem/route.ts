import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assertSameOrigin, enforceRateLimit } from "@/lib/security";
import { z } from "zod";

export async function POST(req: Request) {
  try {
    await assertSameOrigin();
    const s = await createClient();
    const {
      data: { user },
    } = await s.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Please sign in." }, { status: 401 });
    }

    await enforceRateLimit("referral-redeem", 10, 60 * 60_000, user.id);
    const body = await req.json();
    const parsed = z.object({ points: z.coerce.number().int().min(1).max(100000) }).safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Points must be a whole number." }, { status: 400 });
    }

    const { data, error } = await s.rpc("redeem_referral_points", {
      p_customer_id: user.id,
      p_points: parsed.data.points,
    });

    if (error) {
      console.error("Referral redemption failed", error);
      return NextResponse.json({ error: "Unable to redeem referral points." }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      coupon: {
        code: data.code,
        amount: Number(data.discount_value),
        expiresAt: data.expires_at,
      },
    });
  } catch (error: any) {
    if (error?.name === "RateLimitError") return NextResponse.json({ error: error.message }, { status: 429 });
    if (error?.name === "SecurityError") return NextResponse.json({ error: error.message }, { status: 403 });
    console.error("Referral redemption request failed", error);
    return NextResponse.json({ error: "Unable to redeem referral points." }, { status: 500 });
  }
}
