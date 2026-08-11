import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
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
    const appointmentId = body?.appointment_id;

    if (!appointmentId) {
      return NextResponse.json(
        { error: "Appointment ID is required." },
        { status: 400 }
      );
    }

    const { data: appointment, error: findError } = await s
      .from("appointments")
      .select("id,customer_id,start_time,status")
      .eq("id", appointmentId)
      .eq("customer_id", user.id)
      .single();

    if (findError || !appointment) {
      return NextResponse.json(
        { error: "Appointment not found." },
        { status: 404 }
      );
    }

    if (appointment.status !== "confirmed") {
      return NextResponse.json(
        { error: "Only confirmed appointments can be cancelled." },
        { status: 400 }
      );
    }

    const start = new Date(appointment.start_time).getTime();
    const now = Date.now();

    if (start <= now) {
      return NextResponse.json(
        { error: "This appointment has already started or passed." },
        { status: 400 }
      );
    }

    const oneHour = 60 * 60 * 1000;

    if (start - now < oneHour) {
      return NextResponse.json(
        {
          error:
            "Cancellation is only available more than 1 hour before the appointment.",
        },
        { status: 400 }
      );
    }

    const { error: updateError } = await s
      .from("appointments")
      .update({
        status: "cancelled",
        cancelled_by: "customer",
        cancelled_at: new Date().toISOString(),
        cancellation_reason: "Cancelled by customer",
      })
      .eq("id", appointment.id)
      .eq("customer_id", user.id)
      .eq("status", "confirmed");

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unable to cancel appointment." },
      { status: 500 }
    );
  }
}
