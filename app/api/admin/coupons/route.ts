import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendCouponEmail } from "@/lib/email/send-coupon";
import crypto from "crypto";

function getUnsubscribeToken(customerId: string) {
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

function getExpiryTimestamp(date: string) {
  /*
   * "Valid until 14 August" means the coupon
   * expires when 14 August begins.
   */
  return new Date(
    `${date}T00:00:00+05:30`
  );
}

function getSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

/*
 * GET /api/admin/coupons
 *
 * Returns coupons plus campaign statistics.
 */
export async function GET() {
  try {
    await requireAdmin();

    const admin = createAdminClient();

    const {
      data: coupons,
      error: couponError,
    } = await admin
      .from("coupons")
      .select(
        "id,code,discount_type,discount_value,expires_at,created_at,active"
      )
      .gt("expires_at", new Date().toISOString())
      .order("created_at", {
        ascending: false,
      });

    if (couponError) {
      throw couponError;
    }

    const couponRows = coupons ?? [];

    const couponIds = couponRows.map(
      (coupon) => coupon.id
    );

    const stats: Record<
      string,
      {
        total: number;
        sent: number;
        failed: number;
        unsubscribed: number;
        pending: number;
      }
    > = {};

    for (const id of couponIds) {
      stats[id] = {
        total: 0,
        sent: 0,
        failed: 0,
        unsubscribed: 0,
        pending: 0,
      };
    }

    if (couponIds.length) {
      const {
        data: deliveries,
        error: deliveryError,
      } = await admin
        .from("coupon_email_deliveries")
        .select(
          "coupon_id,status"
        )
        .in("coupon_id", couponIds);

      if (deliveryError) {
        throw deliveryError;
      }

      for (const delivery of deliveries ?? []) {
        const current =
          stats[delivery.coupon_id];

        if (!current) {
          continue;
        }

        current.total += 1;

        if (
          delivery.status === "sent"
        ) {
          current.sent += 1;
        } else if (
          delivery.status === "failed"
        ) {
          current.failed += 1;
        } else if (
          delivery.status === "skipped"
        ) {
          current.unsubscribed += 1;
        } else if (
          delivery.status === "pending"
        ) {
          current.pending += 1;
        }
      }
    }

    return NextResponse.json({
      coupons: couponRows.map(
        (coupon) => ({
          ...coupon,
          campaign:
            stats[coupon.id] ?? {
              total: 0,
              sent: 0,
              failed: 0,
              unsubscribed: 0,
              pending: 0,
            },
        })
      ),
    });
  } catch (error: any) {
    const message =
      error?.message ||
      "Unable to load coupons.";

    const status =
      message === "FORBIDDEN"
        ? 403
        : message === "UNAUTHENTICATED"
          ? 401
          : 400;

    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}

/*
 * POST /api/admin/coupons
 *
 * Creates a coupon and, optionally, emails
 * eligible customers.
 */
export async function POST(
  req: Request
) {
  try {
    const { user } =
      await requireAdmin();

    const body = await req.json();

    const code = String(
      body.code || ""
    )
      .trim()
      .toUpperCase();

    const discount = Number(
      body.discount_value
    );

    const expiresAtInput = String(
      body.expires_at || ""
    ).trim();

    const emailCustomers =
      body.email_customers === true;

    if (!code) {
      return NextResponse.json(
        {
          error:
            "Please enter a coupon code.",
        },
        { status: 400 }
      );
    }

    if (!/^[A-Z0-9_-]{3,40}$/.test(code)) {
      return NextResponse.json(
        {
          error:
            "Coupon code must be 3–40 characters and may only contain letters, numbers, hyphens or underscores.",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isFinite(discount) ||
      discount <= 0 ||
      discount > 100
    ) {
      return NextResponse.json(
        {
          error:
            "Discount must be between 1% and 100%.",
        },
        { status: 400 }
      );
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(
      expiresAtInput
    )) {
      return NextResponse.json(
        {
          error:
            "Please choose a valid expiry date.",
        },
        { status: 400 }
      );
    }

    const expiryDate =
      getExpiryTimestamp(expiresAtInput);

    if (
      Number.isNaN(expiryDate.getTime())
    ) {
      return NextResponse.json(
        {
          error:
            "Please choose a valid expiry date.",
        },
        { status: 400 }
      );
    }

    /*
     * The coupon must expire in the future.
     */
    if (
      expiryDate.getTime() <=
      Date.now()
    ) {
      return NextResponse.json(
        {
          error:
            "Coupon expiry must be today or a future date.",
        },
        { status: 400 }
      );
    }

    const admin =
      createAdminClient();

    /*
     * Prevent duplicate coupon codes.
     */
    const {
      data: existing,
      error: existingError,
    } = await admin
      .from("coupons")
      .select("id")
      .eq("code", code)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (existing) {
      return NextResponse.json(
        {
          error:
            `Coupon "${code}" already exists.`,
        },
        { status: 409 }
      );
    }

    /*
     * Create the coupon.
     */
    const {
      data: coupon,
      error: couponError,
    } = await admin
      .from("coupons")
      .insert({
        code,
        discount_type: "percentage",
        discount_value: discount,
        expires_at:
          expiryDate.toISOString(),
        active: true,
      })
      .select(
        "id,code,discount_type,discount_value,expires_at,created_at,active"
      )
      .single();

    if (couponError) {
      throw couponError;
    }

    /*
     * If the admin did not request email,
     * we're finished.
     */
    if (!emailCustomers) {
      await admin
        .from("audit_logs")
        .insert({
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
        total: 0,
        sent: 0,
        failed: 0,
        unsubscribed: 0,
        pending: 0,
      });
    }

    /*
     * Find customers who have an email address.
     *
     * Unsubscribed customers are included in the
     * delivery log as "skipped" so the Admin can
     * see exactly why they weren't emailed.
     */
    const {
      data: customers,
      error: customerError,
    } = await admin
      .from("profiles")
      .select(
        "id,name,email,marketing_unsubscribed_at"
      )
      .not("email", "is", null)
      .neq("email", "");

    if (customerError) {
      throw customerError;
    }

    let sent = 0;
    let failed = 0;
    let unsubscribed = 0;
    let pending = 0;

    const siteUrl = getSiteUrl();

    for (const customer of customers ?? []) {
      const email = String(
        customer.email || ""
      )
        .trim()
        .toLowerCase();

      if (!email) {
        continue;
      }

      /*
       * Customer opted out.
       */
      if (
        customer.marketing_unsubscribed_at
      ) {
        const {
          error: skippedError,
        } = await admin
          .from(
            "coupon_email_deliveries"
          )
          .insert({
            coupon_id: coupon.id,
            customer_id: customer.id,
            email,
            status: "skipped",
          });

        if (skippedError) {
          console.error(
            "Failed to record skipped email:",
            skippedError
          );
        }

        unsubscribed += 1;
        continue;
      }

      /*
       * Record pending before attempting delivery.
       */
      const {
        data: delivery,
        error: deliveryError,
      } = await admin
        .from(
          "coupon_email_deliveries"
        )
        .insert({
          coupon_id: coupon.id,
          customer_id: customer.id,
          email,
          status: "pending",
        })
        .select("id")
        .single();

      if (deliveryError) {
        console.error(
          "Failed to create delivery record:",
          deliveryError
        );

        failed += 1;
        continue;
      }

      pending += 1;

      const token =
        getUnsubscribeToken(
          customer.id
        );

      const unsubscribeUrl =
        `${siteUrl}/api/marketing/unsubscribe?customer=${encodeURIComponent(customer.id)}&token=${token}`;

      try {
        const result =
          await sendCouponEmail({
            email,
            couponCode: coupon.code,
            discount: Number(
              coupon.discount_value
            ),
            expiryDate:
              expiryDate.toLocaleDateString(
                "en-IN",
                {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  timeZone:
                    "Asia/Kolkata",
                }
              ),
            bookingUrl:
              `${siteUrl}/book?coupon=${encodeURIComponent(coupon.code)}`,
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
          .eq("id", delivery.id);

        sent += 1;
        pending -= 1;
      } catch (emailError: any) {
        const message =
          emailError?.message ||
          "Unable to send email.";

        await admin
          .from(
            "coupon_email_deliveries"
          )
          .update({
            status: "failed",
            error: message,
          })
          .eq("id", delivery.id);

        failed += 1;
        pending -= 1;
      }
    }

    /*
     * Record the campaign creation.
     */
    await admin
      .from("audit_logs")
      .insert({
        admin_id: user.id,
        action: "create",
        entity: "coupon",
        entity_id: coupon.id,
        new_data: {
          ...coupon,
          email_customers:
            emailCustomers,
          campaign: {
            total:
              sent +
              failed +
              unsubscribed +
              pending,
            sent,
            failed,
            unsubscribed,
            pending,
          },
        },
      });

    return NextResponse.json({
      success: true,
      coupon,
      emailCampaign: true,
      total:
        sent +
        failed +
        unsubscribed +
        pending,
      sent,
      failed,
      unsubscribed,
      pending,
    });
  } catch (error: any) {
    console.error(
      "Coupon API error:",
      error
    );

    const message =
      error?.message ||
      "Unable to create coupon.";

    const status =
      message === "FORBIDDEN"
        ? 403
        : message === "UNAUTHENTICATED"
          ? 401
          : 400;

    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
