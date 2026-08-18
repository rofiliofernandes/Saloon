import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

function getExpiryTimestamp(date: string) {
  // Coupon validity includes the whole selected day in India.
  return new Date(`${date}T23:59:59.999+05:30`);
}

export async function GET() {
  try {
    await requireAdmin();

    const admin = createAdminClient();
    const { data: coupons, error } = await admin
      .from("coupons")
      .select(
        "id,code,discount_type,discount_value,expires_at,created_at,active,used_count,usage_limit,source,event_name,reason"
      )
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ coupons: coupons ?? [] });
  } catch (error: any) {
    const message = error?.message || "Unable to load coupons.";
    const status =
      message === "FORBIDDEN"
        ? 403
        : message === "UNAUTHENTICATED"
          ? 401
          : 400;

    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const { user } = await requireAdmin();
    const body = await req.json();

    const code = String(body.code || "").trim().toUpperCase();
    const discount = Number(body.discount_value);
    const expiresAtInput = String(body.expires_at || "").trim();
    const usageLimitInput = body.usage_limit;
    const usageLimit =
      usageLimitInput === null ||
      usageLimitInput === undefined ||
      usageLimitInput === "" ||
      usageLimitInput === "unlimited"
        ? null
        : Number(usageLimitInput);
    const source = String(body.source || "manual").trim();
    const eventName = String(body.event_name || "").trim() || null;
    const reason = String(body.reason || "").trim() || null;

    if (!code) {
      return NextResponse.json({ error: "Please enter a coupon code." }, { status: 400 });
    }

    if (!/^[A-Z0-9_-]{3,40}$/.test(code)) {
      return NextResponse.json(
        { error: "Coupon code must be 3–40 characters and may only contain letters, numbers, hyphens or underscores." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(discount) || discount <= 0 || discount > 100) {
      return NextResponse.json({ error: "Discount must be between 1% and 100%." }, { status: 400 });
    }

    if (!["manual", "festival_event"].includes(source)) {
      return NextResponse.json({ error: "Invalid coupon source." }, { status: 400 });
    }

    if (source === "festival_event" && !eventName) {
      return NextResponse.json({ error: "Please enter the event or festival name." }, { status: 400 });
    }

    if (usageLimit !== null && (!Number.isInteger(usageLimit) || usageLimit <= 0)) {
      return NextResponse.json({ error: "Usage limit must be a positive whole number." }, { status: 400 });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(expiresAtInput)) {
      return NextResponse.json({ error: "Please choose a valid expiry date." }, { status: 400 });
    }

    const expiryDate = getExpiryTimestamp(expiresAtInput);
    if (Number.isNaN(expiryDate.getTime())) {
      return NextResponse.json({ error: "Please choose a valid expiry date." }, { status: 400 });
    }

    if (expiryDate.getTime() <= Date.now()) {
      return NextResponse.json({ error: "Coupon expiry must be today or a future date." }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: existing, error: existingError } = await admin
      .from("coupons")
      .select("id")
      .eq("code", code)
      .maybeSingle();

    if (existingError) throw existingError;

    if (existing) {
      return NextResponse.json({ error: `Coupon "${code}" already exists.` }, { status: 409 });
    }

    const { data: coupon, error: couponError } = await admin
      .from("coupons")
      .insert({
        code,
        discount_type: "percentage",
        discount_value: discount,
        usage_limit: usageLimit,
        used_count: 0,
        expires_at: expiryDate.toISOString(),
        active: true,
        source,
        event_name: source === "festival_event" ? eventName : null,
        reason,
      })
      .select(
        "id,code,discount_type,discount_value,usage_limit,used_count,expires_at,created_at,active,source,event_name,reason"
      )
      .single();

    if (couponError) throw couponError;

    await admin.from("audit_logs").insert({
      admin_id: user.id,
      action: "create",
      entity: "coupon",
      entity_id: coupon.id,
      new_data: coupon,
    });

    return NextResponse.json({
      success: true,
      coupon,
      emailCampaign: false,
      message: "Coupon created. No coupon email was sent.",
    });
  } catch (error: any) {
    console.error("Coupon API error:", error);
    const message = error?.message || "Unable to create coupon.";
    const status =
      message === "FORBIDDEN"
        ? 403
        : message === "UNAUTHENTICATED"
          ? 401
          : 400;

    return NextResponse.json({ error: message }, { status });
  }
}
