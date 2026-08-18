import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    await requireAdmin();

    const admin = createAdminClient();

    /*
     * Compensation coupons are kept separate from
     * normal marketing coupons.
     *
     * We include expired coupons here because this
     * page is also the compensation history.
     */
    const {
      data: coupons,
      error: couponError,
    } = await admin
      .from("coupons")
      .select(
        `
          id,
          code,
          discount_type,
          discount_value,
          usage_limit,
          used_count,
          expires_at,
          active,
          created_at,
          source_appointment_id,
          customer_id,
          reason
        `
      )
      .eq("source", "stylist_cancellation")
      .not(
        "source_appointment_id",
        "is",
        null
      )
      .order("created_at", {
        ascending: false,
      });

    if (couponError) {
      throw couponError;
    }

    const rows = coupons ?? [];

    /*
     * Load affected customers.
     */
    const customerIds = Array.from(
      new Set(
        rows
          .map(
            (coupon) =>
              coupon.customer_id
          )
          .filter(Boolean)
      )
    );

    const customersById: Record<
      string,
      {
        id: string;
        name: string | null;
        email: string | null;
        phone: string | null;
      }
    > = {};

    if (customerIds.length > 0) {
      const {
        data: customers,
        error: customerError,
      } = await admin
        .from("profiles")
        .select(
          "id,name,email,phone"
        )
        .in("id", customerIds);

      if (customerError) {
        throw customerError;
      }

      for (const customer of customers ?? []) {
        customersById[customer.id] =
          customer;
      }
    }

    /*
     * Load appointments so the Admin can see
     * which appointment caused the compensation.
     */
    const appointmentIds = Array.from(
      new Set(
        rows
          .map(
            (coupon) =>
              coupon.source_appointment_id
          )
          .filter(Boolean)
      )
    );

    const appointmentsById: Record<
      string,
      {
        id: string;
        start_time: string;
        status: string;
        stylist_id: string | null;
      }
    > = {};

    if (appointmentIds.length > 0) {
      const {
        data: appointments,
        error: appointmentError,
      } = await admin
        .from("appointments")
        .select(
          "id,start_time,status,stylist_id"
        )
        .in("id", appointmentIds);

      if (appointmentError) {
        throw appointmentError;
      }

      for (const appointment of
        appointments ?? []) {
        appointmentsById[
          appointment.id
        ] = appointment;
      }
    }

    /*
     * Load stylists for the cancellation context.
     */
    const stylistIds = Array.from(
      new Set(
        Object.values(
          appointmentsById
        )
          .map(
            (appointment) =>
              appointment.stylist_id
          )
          .filter(Boolean)
      )
    );

    const stylistsById: Record<
      string,
      {
        id: string;
        name: string;
      }
    > = {};

    if (stylistIds.length > 0) {
      const {
        data: stylists,
        error: stylistError,
      } = await admin
        .from("stylists")
        .select("id,name")
        .in("id", stylistIds);

      if (stylistError) {
        throw stylistError;
      }

      for (const stylist of
        stylists ?? []) {
        stylistsById[stylist.id] =
          stylist;
      }
    }

    /*
     * Build the Admin-friendly response.
     */
    const compensationCoupons =
      rows.map((coupon) => {
        const customer =
          coupon.customer_id
            ? customersById[
                coupon
                  .customer_id
              ] ?? null
            : null;

        const appointment =
          coupon.source_appointment_id
            ? appointmentsById[
                coupon
                  .source_appointment_id
              ] ?? null
            : null;

        const stylist =
          appointment?.stylist_id
            ? stylistsById[
                appointment.stylist_id
              ] ?? null
            : null;

        const expiresAt = coupon.expires_at
          ? new Date(coupon.expires_at)
          : null;

        const expired =
          !expiresAt ||
          expiresAt.getTime() <=
            Date.now();

        const used =
          Number(coupon.used_count ?? 0) >=
          Number(coupon.usage_limit ?? 1);

        let status:
          | "unused"
          | "used"
          | "expired" =
          "unused";

        if (used) {
          status = "used";
        } else if (expired) {
          status = "expired";
        }

        /*
         * Indian phone formatting.
         */
        let phone = customer?.phone ?? null;

        if (phone) {
          const digits =
            phone.replace(/\D/g, "");

          if (
            digits.length === 10
          ) {
            phone =
              `+91 ${digits.slice(
                0,
                5
              )} ${digits.slice(5)}`;
          } else if (
            digits.length === 12 &&
            digits.startsWith("91")
          ) {
            const indian =
              digits.slice(2);

            phone =
              `+91 ${indian.slice(
                0,
                5
              )} ${indian.slice(5)}`;
          }
        }

        /*
         * WhatsApp-ready number.
         */
        let whatsappPhone = null;

        if (customer?.phone) {
          const digits =
            customer.phone.replace(
              /\D/g,
              ""
            );

          if (digits.length === 10) {
            whatsappPhone =
              `91${digits}`;
          } else if (
            digits.length === 12 &&
            digits.startsWith("91")
          ) {
            whatsappPhone = digits;
          }
        }

        const customerName =
          customer?.name ||
          "there";

        const discount =
          Number(
            coupon.discount_value
          );

        const expiryText = expiresAt
          ? expiresAt.toLocaleDateString(
              "en-IN",
              {
                day: "numeric",
                month: "long",
                year: "numeric",
                timeZone:
                  "Asia/Kolkata",
              }
            )
          : "";

        /*
         * This is the exact text the Admin can
         * copy and paste into WhatsApp.
         */
        const stylistName =
          stylist?.name || "your stylist";

        const whatsappMessage =
          `Hi ${customerName}, we're really sorry for the inconvenience caused by the cancellation of your appointment with ${stylistName} at AK Hair & Beauty Salon. We'd like to offer you ${discount}% off your next appointment as an apology.\n\nYour coupon code is: ${coupon.code}\n\nThis coupon can be used once and is valid until ${expiryText}.\n\nWe hope to see you again soon. ❤️`;

        return {
          id: coupon.id,
          code: coupon.code,
          stylistName,
          discount,
          discountType:
            coupon.discount_type,
          usageLimit:
            coupon.usage_limit,
          usedCount:
            coupon.used_count,
          expiresAt:
            coupon.expires_at,
          createdAt:
            coupon.created_at,
          active: coupon.active,

          status,

          customer: customer
            ? {
                id: customer.id,
                name: customer.name,
                email: customer.email,
                phone,
                whatsappPhone,
              }
            : null,

          appointment: appointment
            ? {
                id: appointment.id,
                startTime:
                  appointment.start_time,
                status:
                  appointment.status,
                stylist: stylist
                  ? {
                      id: stylist.id,
                      name: stylist.name,
                    }
                  : null,
              }
            : null,

          reason:
            coupon.reason ||
            "Stylist cancellation",

          whatsappMessage,
        };
      });

    return NextResponse.json({
      compensationCoupons,
    });
  } catch (error: any) {
    console.error(
      "Compensation coupons API error:",
      error
    );

    const message =
      error?.message ||
      "Unable to load compensation coupons.";

    const status =
      message === "FORBIDDEN"
        ? 403
        : message ===
          "UNAUTHENTICATED"
        ? 401
        : 400;

    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
