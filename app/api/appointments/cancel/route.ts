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
    const reason =
      typeof body?.reason === "string"
        ? body.reason.trim()
        : null;

    if (!appointmentId) {
      return NextResponse.json(
        { error: "appointment_id is required." },
        { status: 400 }
      );
    }

    const { data, error } = await s.rpc("cancel_appointment", {
      p_appointment_id: appointmentId,
      p_reason: reason || null,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      appointment: data,
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        error:
          e?.message || "Unable to cancel appointment.",
      },
      { status: 500 }
    );
  }
}
