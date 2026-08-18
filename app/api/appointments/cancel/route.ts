import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assertSameOrigin, enforceRateLimit, isValidUuid } from "@/lib/security";

export async function POST(req: Request) {
  try {
    await assertSameOrigin();
    const s = await createClient();

    const {
      data: { user },
    } = await s.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Please sign in." },
        { status: 401 }
      );
    }

    const body = await req.json();

    await enforceRateLimit("appointment-cancel", 20, 60 * 60_000, user.id);
    const appointmentId = body?.appointment_id;
    const reason =
      typeof body?.reason === "string"
        ? body.reason.trim()
        : null;

    if (!isValidUuid(appointmentId)) {
      return NextResponse.json(
        { error: "A valid appointment_id is required." },
        { status: 400 }
      );
    }

    const { data, error } = await s.rpc("cancel_appointment", {
      p_appointment_id: appointmentId,
      p_reason: reason || null,
    });

    if (error) {
      console.error("Appointment cancellation failed", error);
      return NextResponse.json({ error: "Unable to cancel appointment." }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      appointment: data,
    });
  } catch (e: any) {
    if (e?.name === "RateLimitError") return NextResponse.json({ error: e.message }, { status: 429 });
    if (e?.name === "SecurityError") return NextResponse.json({ error: e.message }, { status: 403 });
    console.error("Appointment cancellation request failed", e);
    return NextResponse.json({ error: "Unable to cancel appointment." }, { status: 500 });
  }
}
