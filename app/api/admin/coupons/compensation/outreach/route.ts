import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const ACTIONS = new Set(["phone_copied", "message_copied", "whatsapp_opened"]);

export async function GET() {
  try {
    await requireAdmin();
    const admin = createAdminClient();

    const { data, error } = await admin
      .from("coupon_outreach_history")
      .select("coupon_id,phone_copied_at,message_copied_at,whatsapp_opened_at,last_action,updated_at");

    if (error) throw error;
    return NextResponse.json({ history: data ?? [] });
  } catch (error: any) {
    const message = error?.message || "Unable to load outreach history.";
    return NextResponse.json(
      { error: message },
      { status: message === "FORBIDDEN" ? 403 : message === "UNAUTHENTICATED" ? 401 : 400 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const couponId = String(body?.coupon_id || "").trim();
    const action = String(body?.action || "").trim();

    if (!couponId || !ACTIONS.has(action)) {
      return NextResponse.json({ error: "Invalid coupon outreach action." }, { status: 400 });
    }

    const admin = createAdminClient();
    const now = new Date().toISOString();

    const { data: existing, error: existingError } = await admin
      .from("coupon_outreach_history")
      .select("coupon_id,phone_copied_at,message_copied_at,whatsapp_opened_at")
      .eq("coupon_id", couponId)
      .maybeSingle();

    if (existingError) throw existingError;

    const row: Record<string, string | null> = {
      coupon_id: couponId,
      phone_copied_at: existing?.phone_copied_at ?? null,
      message_copied_at: existing?.message_copied_at ?? null,
      whatsapp_opened_at: existing?.whatsapp_opened_at ?? null,
      last_action: action,
      updated_at: now,
    };

    if (action === "phone_copied") row.phone_copied_at = now;
    if (action === "message_copied") row.message_copied_at = now;
    if (action === "whatsapp_opened") row.whatsapp_opened_at = now;

    const { data, error } = await admin
      .from("coupon_outreach_history")
      .upsert(row, { onConflict: "coupon_id" })
      .select("coupon_id,phone_copied_at,message_copied_at,whatsapp_opened_at,last_action,updated_at")
      .single();

    if (error) throw error;
    return NextResponse.json({ history: data });
  } catch (error: any) {
    const message = error?.message || "Unable to save outreach history.";
    return NextResponse.json(
      { error: message },
      { status: message === "FORBIDDEN" ? 403 : message === "UNAUTHENTICATED" ? 401 : 400 }
    );
  }
}
