import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendCouponEmail } from "@/lib/email/send-coupon";

type CreateCompensationCouponInput = {
  appointmentId: string;
  customerId: string;
  reason?: string;
  discount?: number;
};

function generateCouponCode(name: string) {
  const cleanName =
    String(name || "CUSTOMER")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 8) || "CUSTOMER";

  const random = crypto
    .randomBytes(3)
    .toString("hex")
    .toUpperCase();

  return `SORRY-${cleanName}-${random}`;
}

function getSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

function getUnsubscribeToken(
  customerId: string
) {
  const secret =
    process.env.MARKETING_UNSUBSCRIBE_SECRET;

  if (!secret) {
    throw new Error(
      "MARKETING_UNSUBSCRIBE_SECRET is missing."
    );
  }

  return crypto
    .createHmac("sha256", secret)
    .update(customerId)
    .digest("hex");
}

export async function createCompensationCoupon({
  appointmentId,
  customerId,
  reason = "Stylist cancellation",
  discount = 15,
}: CreateCompensationCouponInput) {
  const admin = createAdminClient();

  /*
   * IMPORTANT:
   * One appointment can only ever receive
   * one compensation coupon.
   */
  const {
    data: existingCoupon,
    error: existingError,
  } = await admin
    .from("coupons")
    .select(
      "id,code,discount_value,usage_limit,used_count,expires_at,active,compensation_appointment_id,compensation_customer_id,compensation_reason"
    )
    .eq(
      "compensation_appointment_id",
      appointmentId
    )
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existingCoupon) {
    const { data: existingCustomer } =
      await admin
        .from("profiles")
        .select("id,name,email,phone")
        .eq("id", customerId)
        .maybeSingle();

    return {
      coupon: {
        ...existingCoupon,
        customer: existingCustomer,
      },
      alreadyCreated: true,
      emailStatus: "already_created",
    };
  }

  /*
   * Load customer.
   */
  const {
    data: customer,
    error: customerError,
  } = await admin
    .from("profiles")
    .select(
      "id,name,email,phone,marketing_unsubscribed_at"
    )
    .eq("id", customerId)
    .maybeSingle();

  if (customerError) {
    throw customerError;
  }

  if (!customer) {
    throw new Error(
      "Customer could not be found."
    );
  }

  /*
   * 30-day expiry.
   */
  const expiresAt = new Date();

  expiresAt.setDate(
    expiresAt.getDate() + 30
  );

  /*
   * Generate unique coupon.
   */
  let coupon: any = null;

  for (let attempt = 0; attempt < 5; attempt++) {
    const code =
      generateCouponCode(customer.name);

    const {
      data,
      error,
    } = await admin
      .from("coupons")
      .insert({
        code,
        discount_type: "percentage",
        discount_value: discount,

        minimum_amount: 0,

        usage_limit: 1,
        used_count: 0,

        expires_at:
          expiresAt.toISOString(),

        active: true,

        /*
         * Correct compensation metadata.
         */
        compensation_appointment_id:
          appointmentId,

        compensation_customer_id:
          customerId,

        compensation_reason:
          reason,
      })
      .select(
        "id,code,discount_type,discount_value,usage_limit,used_count,expires_at,active,compensation_appointment_id,compensation_customer_id,compensation_reason"
      )
      .single();

    if (!error) {
      coupon = data;
      break;
    }

    /*
     * Retry duplicate coupon code.
     */
    if (error.code === "23505") {
      continue;
    }

    throw error;
  }

  if (!coupon) {
    throw new Error(
      "Unable to generate a unique compensation coupon."
    );
  }

  /*
   * No email? That's okay.
   *
   * The coupon still exists and the admin
   * can send it through WhatsApp.
   */
  if (!customer.email) {
    return {
      coupon: {
        ...coupon,
        customer,
      },
      alreadyCreated: false,
      emailStatus: "skipped_no_email",
    };
  }

  /*
   * Customer unsubscribed.
   */
  if (
    customer.marketing_unsubscribed_at
  ) {
    await admin
      .from("coupon_email_deliveries")
      .insert({
        coupon_id: coupon.id,
        customer_id: customer.id,
        email: customer.email,
        status: "skipped",
      });

    return {
      coupon: {
        ...coupon,
        customer,
      },
      alreadyCreated: false,
      emailStatus: "skipped",
    };
  }

  /*
   * Record pending delivery.
   */
  const {
    data: delivery,
    error: deliveryError,
  } = await admin
    .from("coupon_email_deliveries")
    .insert({
      coupon_id: coupon.id,
      customer_id: customer.id,
      email: customer.email,
      status: "pending",
    })
    .select("id")
    .single();

  /*
   * Email failure must NEVER
   * invalidate the coupon.
   */
  if (deliveryError) {
    console.error(
      "Unable to create coupon email delivery:",
      deliveryError
    );

    return {
      coupon: {
        ...coupon,
        customer,
      },
      alreadyCreated: false,
      emailStatus: "failed",
      emailError:
        deliveryError.message,
    };
  }

  try {
    const siteUrl =
      getSiteUrl();

    const unsubscribeToken =
      getUnsubscribeToken(
        customer.id
      );

    const unsubscribeUrl =
      `${siteUrl}/api/marketing/unsubscribe?customer=${encodeURIComponent(
        customer.id
      )}&token=${encodeURIComponent(
        unsubscribeToken
      )}`;

    const bookingUrl =
      `${siteUrl}/book?coupon=${encodeURIComponent(
        coupon.code
      )}`;

    const expiryDate =
      expiresAt.toLocaleDateString(
        "en-IN",
        {
          day: "numeric",
          month: "long",
          year: "numeric",
          timeZone:
            "Asia/Kolkata",
        }
      );

    const result =
      await sendCouponEmail({
        email: customer.email,
        couponCode:
          coupon.code,
        discount:
          Number(
            coupon.discount_value
          ),
        expiryDate,
        bookingUrl,
        unsubscribeUrl,
      });

    await admin
      .from(
        "coupon_email_deliveries"
      )
      .update({
        status: "sent",
        resend_id:
          result?.id ?? null,
        sent_at:
          new Date().toISOString(),
        error: null,
      })
      .eq(
        "id",
        delivery.id
      );

    return {
      coupon: {
        ...coupon,
        customer,
      },
      alreadyCreated: false,
      emailStatus: "sent",
      resendId:
        result?.id ?? null,
    };
  } catch (error: any) {
    const message =
      error?.message ||
      "Unable to send coupon email.";

    console.error(
      "Compensation coupon email failed:",
      error
    );

    await admin
      .from(
        "coupon_email_deliveries"
      )
      .update({
        status: "failed",
        error: message,
      })
      .eq(
        "id",
        delivery.id
      );

    return {
      coupon: {
        ...coupon,
        customer,
      },
      alreadyCreated: false,
      emailStatus: "failed",
      emailError: message,
    };
  }
}
