import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { sendBookingConfirmation } from "@/lib/email/send";
import { assertSameOrigin, enforceRateLimit } from "@/lib/security";

const schema = z.object({
  service_id: z.string().uuid(),

  service_option_id: z.string().uuid(),

  stylist_id: z.string().uuid(),

  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/),

  time: z
    .string()
    .regex(/^\d{2}:\d{2}$/),

  coupon: z
    .string()
    .trim()
    .max(50)
    .optional(),
});

export async function POST(req: Request) {
  try {
    await assertSameOrigin();
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Forbidden" }, { status: 403 });
  }
  const s = await createClient();

  const {
    data: { user },
  } = await s.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      new URL(
        "/login?next=/book",
        req.url
      )
    );
  }

  try {
    await enforceRateLimit("booking", 10, 10 * 60_000, user.id);
  } catch (error: any) {
    if (error?.name === "RateLimitError") return NextResponse.json({ error: error.message }, { status: 429, headers: { "Retry-After": String(error.retryAfter || 60) } });
    throw error;
  }
  const formData = await req.formData();

  const parsed = schema.safeParse(
    Object.fromEntries(formData)
  );

  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          "Invalid booking details",
      },
      { status: 400 }
    );
  }

  const p = parsed.data;

  /*
   * The browser gives us an India-local date/time.
   *
   * The database stores timestamptz.
   *
   * Explicit +05:30 prevents the server's own timezone
   * from changing the requested salon time.
   */
  const start = new Date(
    `${p.date}T${p.time}:00+05:30`
  );

  if (Number.isNaN(start.getTime())) {
    return NextResponse.json(
      {
        error:
          "Invalid appointment date or time",
      },
      { status: 400 }
    );
  }

  if (start.getTime() <= Date.now()) {
    return NextResponse.json(
      {
        error:
          "Choose a future time",
      },
      { status: 400 }
    );
  }

  /*
   * The database is the final authority.
   *
   * It checks:
   *
   * service
   * service option
   * stylist
   * stylist/service relationship
   * working hours
   * salon closure
   * blocked period
   * coupon
   * price
   * duration
   * overlap
   */
  const {
    data,
    error,
  } = await s.rpc(
    "create_appointment",
    {
      p_customer_id: user.id,

      p_service_id:
        p.service_id,

      p_stylist_id:
        p.stylist_id,

      p_service_option_id:
        p.service_option_id,

      p_start_time:
        start.toISOString(),

      p_coupon_code:
        p.coupon || null,
    }
  );

  if (error) {
    console.error(
      "create_appointment failed:",
      error
    );

    const message = String(error?.message || "");

    if (message.toLowerCase().includes("slot") || message.toLowerCase().includes("booked") || message.toLowerCase().includes("overlap")) {
      return NextResponse.redirect(
        new URL("/book?error=slot-taken", req.url),
        { status: 303 }
      );
    }

    console.error("create_appointment rejected", { message });
    return NextResponse.json(
      { error: "That appointment could not be booked. Please choose another time." },
      { status: 409 }
    );
  }

  if (!data?.id) {
    return NextResponse.json(
      {
        error:
          "Appointment could not be created",
      },
      { status: 500 }
    );
  }

  try {
    await sendBookingConfirmation(
      data.id
    );
  } catch (error) {
    /*
     * Do NOT fail the booking because email
     * delivery failed.
     *
     * The appointment already exists.
     */
    console.error(
      "Booking confirmation email failed:",
      error
    );
  }

  return NextResponse.redirect(
    new URL(
      "/appointments?booked=1",
      req.url
    )
  );
}
