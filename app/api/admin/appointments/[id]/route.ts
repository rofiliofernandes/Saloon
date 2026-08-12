import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

type Params = {
  params: Promise<{ id: string }>;
};

/*
 * --------------------------------------------------
 * PATCH
 *
 * Used by the normal Admin Appointments page:
 * - completed
 * - no_show
 * - cancelled
 * --------------------------------------------------
 */
export async function PATCH(
  req: Request,
  { params }: Params
) {
  try {
    const { s, user } = await requireAdmin();
    const { id } = await params;
    const body = await req.json();

    const nextStatus = body.status;

    if (
      !["completed", "no_show", "cancelled"].includes(
        nextStatus
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid appointment status.",
        },
        { status: 400 }
      );
    }

    /*
     * Load the existing appointment first so
     * we can preserve an audit trail.
     */
    const {
      data: appointment,
      error: appointmentError,
    } = await s
      .from("appointments")
      .select("*")
      .eq("id", id)
      .single();

    if (appointmentError || !appointment) {
      return NextResponse.json(
        {
          error: "Appointment not found.",
        },
        { status: 404 }
      );
    }

    /*
     * Prevent changing an already-final appointment.
     */
    if (
      ["cancelled", "completed", "no_show"].includes(
        appointment.status
      )
    ) {
      return NextResponse.json(
        {
          error:
            `This appointment is already ${appointment.status}.`,
        },
        { status: 409 }
      );
    }

    /*
     * Build the update.
     */
    const update: Record<string, any> = {
      status: nextStatus,
    };

    /*
     * Cancellation-specific information.
     */
    if (nextStatus === "cancelled") {
      update.cancelled_by = "admin";
      update.cancelled_at =
        new Date().toISOString();

      update.cancellation_reason =
        String(
          body.cancellation_reason || ""
        ).trim() || null;
    }

    /*
     * Completion timestamp.
     */
    if (nextStatus === "completed") {
      update.completed_at =
        new Date().toISOString();
    }

    const {
      data,
      error,
    } = await s
      .from("appointments")
      .update(update)
      .eq("id", id)
      .eq("status", "confirmed")
      .select()
      .single();

    if (error) throw error;

    /*
     * Audit the change.
     */
    await s.from("audit_logs").insert({
      admin_id: user.id,
      action:
        nextStatus === "cancelled"
          ? "cancel"
          : "update",
      entity: "appointments",
      entity_id: id,
      old_data: appointment,
      new_data: data,
    });

    return NextResponse.json({
      ok: true,
      appointment: data,
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        error:
          e?.message ||
          "Unable to update appointment.",
      },
      { status: 400 }
    );
  }
}

/*
 * --------------------------------------------------
 * POST
 *
 * Used by the stylist time-off workflow:
 * - cancel
 * - reassign
 * --------------------------------------------------
 */
export async function POST(
  req: Request,
  { params }: Params
) {
  try {
    const { s, user } = await requireAdmin();
    const { id } = await params;
    const body = await req.json();

    const action = body.action;

    if (
      !["cancel", "reassign"].includes(action)
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid action. Use cancel or reassign.",
        },
        { status: 400 }
      );
    }

    /*
     * Load appointment.
     */
    const {
      data: appointment,
      error: appointmentError,
    } = await s
      .from("appointments")
      .select(
        "id,customer_id,stylist_id,service_id,start_time,end_time,price,status"
      )
      .eq("id", id)
      .single();

    if (appointmentError || !appointment) {
      return NextResponse.json(
        {
          error: "Appointment not found.",
        },
        { status: 404 }
      );
    }

    if (appointment.status !== "confirmed") {
      return NextResponse.json(
        {
          error:
            `This appointment is already ${appointment.status}.`,
        },
        { status: 409 }
      );
    }

    /*
     * ------------------------------------------------
     * CANCEL
     * ------------------------------------------------
     */
    if (action === "cancel") {
      const reason =
        String(body.reason || "").trim() ||
        "Stylist is unavailable.";

      const {
        data,
        error,
      } = await s
        .from("appointments")
        .update({
          status: "cancelled",
          cancelled_by: "admin",
          cancelled_at:
            new Date().toISOString(),
          cancellation_reason: reason,
        })
        .eq("id", id)
        .eq("status", "confirmed")
        .select()
        .single();

      if (error) throw error;

      await s.from("audit_logs").insert({
        admin_id: user.id,
        action: "cancel",
        entity: "appointments",
        entity_id: id,
        old_data: appointment,
        new_data: data,
      });

      return NextResponse.json({
        ok: true,
        action: "cancel",
        appointment: data,
      });
    }

    /*
     * ------------------------------------------------
     * REASSIGN
     * ------------------------------------------------
     */

    const newStylistId =
      String(body.stylist_id || "").trim();

    if (!newStylistId) {
      return NextResponse.json(
        {
          error:
            "Please select a replacement stylist.",
        },
        { status: 400 }
      );
    }

    if (
      newStylistId === appointment.stylist_id
    ) {
      return NextResponse.json(
        {
          error:
            "The replacement stylist must be different.",
        },
        { status: 400 }
      );
    }

    /*
     * Replacement stylist must exist and be active.
     */
    const {
      data: stylist,
      error: stylistError,
    } = await s
      .from("stylists")
      .select(
        "id,name,active,deleted_at"
      )
      .eq("id", newStylistId)
      .single();

    if (stylistError || !stylist) {
      return NextResponse.json(
        {
          error:
            "Replacement stylist not found.",
        },
        { status: 404 }
      );
    }

    if (
      !stylist.active ||
      stylist.deleted_at !== null
    ) {
      return NextResponse.json(
        {
          error:
            "Replacement stylist is not available.",
        },
        { status: 400 }
      );
    }

    /*
     * Replacement stylist must provide the same service.
     */
    const {
      data: relationship,
    } = await s
      .from("stylist_services")
      .select("stylist_id")
      .eq("stylist_id", newStylistId)
      .eq(
        "service_id",
        appointment.service_id
      )
      .maybeSingle();

    if (!relationship) {
      return NextResponse.json(
        {
          error:
            "The replacement stylist does not provide this service.",
        },
        { status: 400 }
      );
    }

    /*
     * Replacement stylist cannot already be booked.
     */
    const {
      data: conflicts,
      error: conflictError,
    } = await s
      .from("appointments")
      .select(
        "id,start_time,end_time,status"
      )
      .eq("stylist_id", newStylistId)
      .eq("status", "confirmed")
      .lt(
        "start_time",
        appointment.end_time
      )
      .gt(
        "end_time",
        appointment.start_time
      )
      .limit(1);

    if (conflictError) {
      throw conflictError;
    }

    if (
      conflicts &&
      conflicts.length > 0
    ) {
      return NextResponse.json(
        {
          error:
            "The replacement stylist is already booked during this time.",
        },
        { status: 409 }
      );
    }

    /*
     * Reassign appointment.
     */
    const {
      data,
      error,
    } = await s
      .from("appointments")
      .update({
        stylist_id: newStylistId,
      })
      .eq("id", id)
      .eq("status", "confirmed")
      .select()
      .single();

    if (error) throw error;

    await s.from("audit_logs").insert({
      admin_id: user.id,
      action: "reassign",
      entity: "appointments",
      entity_id: id,
      old_data: appointment,
      new_data: data,
    });

    return NextResponse.json({
      ok: true,
      action: "reassign",
      appointment: data,
      stylist,
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        error:
          e?.message ||
          "Unable to resolve appointment.",
      },
      { status: 400 }
    );
  }
}
