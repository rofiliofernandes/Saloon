import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    const { s } = await requireAdmin();

    const { data, error } = await s
      .from("blocked_periods")
      .select("id,stylist_id,start_time,end_time,reason")
      .order("start_time", { ascending: true });

    if (error) throw error;

    return NextResponse.json({
      rows: data ?? [],
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unable to load blocked periods." },
      { status: 400 }
    );
  }
}



export async function POST(req: Request) {
  try {
    const { s, user } = await requireAdmin();

    const body = await req.json();

    const stylistId =
      body.stylist_id === "all"
        ? null
        : String(body.stylist_id || "");

    const startTime = String(body.start_time || "");
    const endTime = String(body.end_time || "");
    const reason = String(body.reason || "").trim();

    if (body.stylist_id !== "all" && !stylistId) {
      return NextResponse.json(
        { error: "Please select a stylist." },
        { status: 400 }
      );
    }

    if (!startTime || !endTime) {
      return NextResponse.json(
        {
          error: "Please select a start and end time.",
        },
        { status: 400 }
      );
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      end <= start
    ) {
      return NextResponse.json(
        {
          error:
            "The end time must be after the start time.",
        },
        { status: 400 }
      );
    }

    /*
     * Check whether this time-off period overlaps
     * any confirmed appointments.
     */
    let appointmentQuery = s
      .from("appointments")
      .select(
        "id,customer_id,service_id,stylist_id,start_time,end_time,price,status"
      )
      .eq("status", "confirmed")
      .lt("start_time", end.toISOString())
      .gt("end_time", start.toISOString());

    /*
     * If a specific stylist was selected, only check
     * appointments belonging to that stylist.
     *
     * If "all" was selected, check every stylist.
     */
    if (stylistId) {
      appointmentQuery = appointmentQuery.eq(
        "stylist_id",
        stylistId
      );
    }

    const {
      data: affectedAppointments,
      error: appointmentError,
    } = await appointmentQuery;

    if (appointmentError) {
      throw appointmentError;
    }

    /*
     * Do not create the blocked period yet.
     *
     * The admin UI will use these appointments to let
     * the admin decide whether to reassign or cancel them.
     */
    if (
      affectedAppointments &&
      affectedAppointments.length > 0
    ) {
      return NextResponse.json(
        {
          error:
            "This time off affects confirmed appointments.",
          code: "APPOINTMENTS_AFFECTED",
          appointments: affectedAppointments,
        },
        { status: 409 }
      );
    }

    /*
     * No confirmed appointments are affected,
     * so it is safe to create the blocked period.
     */
    const { data, error } = await s
      .from("blocked_periods")
      .insert({
        stylist_id: stylistId,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        reason: reason || null,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    await s.from("audit_logs").insert({
      admin_id: user.id,
      action: "create",
      entity: "blocked_periods",
      entity_id: data.id,
      new_data: data,
    });

    return NextResponse.json({
      rows: [data],
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        error:
          e?.message ||
          "Unable to create blocked period.",
      },
      { status: 400 }
    );
  }
}


