import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createCompensationCoupon } from "@/lib/coupons/create-compensation-coupon";

type Params = {
  params: Promise<{ id: string }>;
};

function formatPhone(phone?: string | null) {
  if (!phone) return null;

  const digits = phone.replace(/\D/g, "");

  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }

  if (
    digits.length === 12 &&
    digits.startsWith("91")
  ) {
    const local = digits.slice(2);

    return `+91 ${local.slice(0, 5)} ${local.slice(5)}`;
  }

  return phone;
}

function buildWhatsAppMessage(
  customerName: string,
  couponCode: string,
  discount: number,
  expiresAt: string
) {
  const firstName =
    customerName.trim().split(/\s+/)[0] ||
    "there";

  const expiry = new Date(
    expiresAt
  ).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return `Hi ${firstName}, we're very sorry for the inconvenience caused by the cancellation of your appointment at AK Hair & Beauty Salon.

As an apology, we've created a ${discount}% off coupon for your next appointment.

Your coupon code is: ${couponCode}

This coupon can be used once and is valid until ${expiry}.

We apologise again and hope to see you soon.`;
}

async function buildCompensationResponse(
  s: any,
  coupon: any,
  customerId: string | null
) {
  if (!coupon) return null;

  let customer: {
    id?: string;
    name?: string | null;
    phone?: string | null;
  } | null = null;

  if (customerId) {
    const { data } = await s
      .from("profiles")
      .select("id,name,phone")
      .eq("id", customerId)
      .maybeSingle();

    customer = data;
  }

  const customerName =
    customer?.name || "Customer";

  const phone =
    formatPhone(customer?.phone);

  const discount = Number(
    coupon.discount_value
  );

  const expiresAt =
    coupon.expires_at;

  const whatsappMessage =
    buildWhatsAppMessage(
      customerName,
      coupon.code,
      discount,
      expiresAt
    );

  return {
    id: coupon.id,
    code: coupon.code,
    discount,
    expiresAt,
    customerId:
      customer?.id || customerId,
    customerName,
    phone,
    whatsappMessage,
  };
}

/*
 * --------------------------------------------------
 * PATCH
 *
 * Normal Admin Appointments page:
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
    const { s, user } =
      await requireAdmin();

    const { id } = await params;
    const body = await req.json();

    const nextStatus =
      body.status;

    if (
      ![
        "completed",
        "no_show",
        "cancelled",
      ].includes(nextStatus)
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
     * Load appointment.
     */
    const {
      data: appointment,
      error: appointmentError,
    } = await s
      .from("appointments")
      .select("*")
      .eq("id", id)
      .single();

    if (
      appointmentError ||
      !appointment
    ) {
      return NextResponse.json(
        {
          error:
            "Appointment not found.",
        },
        { status: 404 }
      );
    }

    /*
     * Prevent changing final appointments.
     */
    if (
      [
        "cancelled",
        "completed",
        "no_show",
      ].includes(appointment.status)
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
     * Build update.
     */
    const update: Record<
      string,
      any
    > = {
      status: nextStatus,
    };

    if (
      nextStatus ===
      "cancelled"
    ) {
      update.cancelled_by =
        "admin";

      update.cancelled_at =
        new Date().toISOString();

      update.cancellation_reason =
        String(
          body.cancellation_reason ||
            ""
        ).trim() || null;
    }

    if (
      nextStatus ===
      "completed"
    ) {
      update.completed_at =
        new Date().toISOString();
    }

    /*
     * Update appointment.
     */
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

    if (error) {
      throw error;
    }

    /*
     * Compensation coupon.
     */
    let compensationCoupon =
      null;

    if (
      nextStatus ===
        "cancelled" &&
      appointment.customer_id
    ) {
      try {
        const result =
          await createCompensationCoupon(
            {
              appointmentId:
                appointment.id,

              customerId:
                appointment.customer_id,

              reason:
                "Stylist cancellation",

              discount: 15,
            }
          );

        compensationCoupon =
          await buildCompensationResponse(
            s,
            result.coupon,
            appointment.customer_id
          );
      } catch (
        couponError
      ) {
        console.error(
          "Unable to generate compensation coupon:",
          couponError
        );
      }
    }

    /*
     * Audit.
     */
    await s
      .from("audit_logs")
      .insert({
        admin_id: user.id,

        action:
          nextStatus ===
          "cancelled"
            ? "cancel"
            : `status_${nextStatus}`,

        entity:
          "appointments",

        entity_id: id,

        old_data:
          appointment,

        new_data:
          data,
      });

    return NextResponse.json({
      ok: true,

      action:
        nextStatus,

      appointment:
        data,

      compensationCoupon,
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
 * Stylist time-off workflow:
 * - cancel
 * - reassign
 * --------------------------------------------------
 */
export async function POST(
  req: Request,
  { params }: Params
) {
  try {
    const { s, user } =
      await requireAdmin();

    const { id } = await params;
    const body = await req.json();

    const action =
      body.action;

    if (
      ![
        "cancel",
        "reassign",
      ].includes(action)
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

    if (
      appointmentError ||
      !appointment
    ) {
      return NextResponse.json(
        {
          error:
            "Appointment not found.",
        },
        { status: 404 }
      );
    }

    if (
      appointment.status !==
      "confirmed"
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
     * ------------------------------------------------
     * CANCEL
     * ------------------------------------------------
     */
    if (
      action === "cancel"
    ) {
      const reason =
        String(
          body.reason || ""
        ).trim() ||
        "Stylist is unavailable.";

      /*
       * Cancel appointment.
       */
      const {
        data,
        error,
      } = await s
        .from("appointments")
        .update({
          status:
            "cancelled",

          cancelled_by:
            "admin",

          cancelled_at:
            new Date().toISOString(),

          cancellation_reason:
            reason,
        })
        .eq("id", id)
        .eq("status", "confirmed")
        .select()
        .single();

      if (error) {
        throw error;
      }

      /*
       * Generate compensation
       * coupon for affected customer.
       */
      let compensationCoupon =
        null;

      if (
        appointment.customer_id
      ) {
        try {
          const result =
            await createCompensationCoupon(
              {
                appointmentId:
                  appointment.id,

                customerId:
                  appointment.customer_id,

                reason:
                  "Stylist cancellation",

                discount: 15,
              }
            );

          compensationCoupon =
            await buildCompensationResponse(
              s,
              result.coupon,
              appointment.customer_id
            );
        } catch (
          couponError
        ) {
          /*
           * Coupon failure must
           * never undo cancellation.
           */
          console.error(
            "Unable to generate compensation coupon:",
            couponError
          );
        }
      }

      /*
       * Audit.
       */
      await s
        .from("audit_logs")
        .insert({
          admin_id: user.id,

          action:
            "cancel",

          entity:
            "appointments",

          entity_id: id,

          old_data:
            appointment,

          new_data:
            data,
        });

      return NextResponse.json({
        ok: true,

        action:
          "cancel",

        appointment:
          data,

        compensationCoupon,
      });
    }

    /*
     * ------------------------------------------------
     * REASSIGN
     * ------------------------------------------------
     */

    const newStylistId =
      String(
        body.stylist_id ||
          ""
      ).trim();

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
      newStylistId ===
      appointment.stylist_id
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
     * Replacement stylist.
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

    if (
      stylistError ||
      !stylist
    ) {
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
      stylist.deleted_at !==
        null
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
     * Same service.
     */
    const {
      data: relationship,
    } = await s
      .from(
        "stylist_services"
      )
      .select(
        "stylist_id"
      )
      .eq(
        "stylist_id",
        newStylistId
      )
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
     * Check conflicts.
     */
    const {
      data: conflicts,
      error:
        conflictError,
    } = await s
      .from("appointments")
      .select(
        "id,start_time,end_time,status"
      )
      .eq(
        "stylist_id",
        newStylistId
      )
      .eq(
        "status",
        "confirmed"
      )
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
     * Reassign.
     */
    const {
      data,
      error,
    } = await s
      .from("appointments")
      .update({
        stylist_id:
          newStylistId,
      })
      .eq("id", id)
      .eq("status", "confirmed")
      .select()
      .single();

    if (error) {
      throw error;
    }

    /*
     * Audit.
     */
    await s
      .from("audit_logs")
      .insert({
        admin_id: user.id,

        action:
          "reassign",

        entity:
          "appointments",

        entity_id: id,

        old_data:
          appointment,

        new_data:
          data,
      });

    return NextResponse.json({
      ok: true,

      action:
        "reassign",

      appointment:
        data,

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
