import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "node:crypto";
import { enforceRateLimit } from "@/lib/security";

function verifyToken(customerId: string, token: string) {
  const secret = process.env.MARKETING_UNSUBSCRIBE_SECRET;
  if (!secret || !/^[0-9a-f-]{36}$/i.test(customerId) || !/^[0-9a-f]{64}$/i.test(token)) return false;

  const expected = crypto.createHmac("sha256", secret).update(customerId).digest("hex");
  const actual = Buffer.from(token, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  return actual.length === expectedBuffer.length && crypto.timingSafeEqual(actual, expectedBuffer);
}

export async function GET(req: Request) {
  try {
    // GET unsubscribe links are intentionally cross-site navigations, so do not
    // apply CSRF protection here. Rate-limit by client IP instead.
    await enforceRateLimit("marketing-unsubscribe", 30, 60 * 60_000);
    const url = new URL(req.url);
    const customerId = url.searchParams.get("customer");
    const token = url.searchParams.get("token");

    if (!customerId || !token || !verifyToken(customerId, token)) {
      return new NextResponse("Invalid unsubscribe link.", {
        status: 400,
        headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
      });
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from("profiles")
      .update({ marketing_unsubscribed_at: new Date().toISOString() })
      .eq("id", customerId);

    if (error) throw error;

    return new NextResponse("You have been unsubscribed from promotional emails from AK Hair & Beauty Salon.", {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  } catch (error: any) {
    if (error?.name === "RateLimitError") return new NextResponse(error.message, { status: 429, headers: { "Retry-After": String(error.retryAfter || 60) } });
    console.error("Unsubscribe error", error);
    return new NextResponse("Unable to process your unsubscribe request.", {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }
}
