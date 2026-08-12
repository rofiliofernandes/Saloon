import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const q = z.object({
  service_id: z.string().uuid(),
  stylist_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function GET(req: Request) {
  const u = new URL(req.url);

  const v = q.safeParse(
    Object.fromEntries(u.searchParams)
  );

  if (!v.success) {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }

  const s = await createClient();

  const {
    service_id,
    stylist_id,
    date,
  } = v.data;

  /*
   * Make absolutely sure this stylist provides
   * the selected service.
   */
  const { data: relationship } = await s
    .from("stylist_services")
    .select("stylist_id")
    .eq("stylist_id", stylist_id)
    .eq("service_id", service_id)
    .maybeSingle();

  if (!relationship) {
    return NextResponse.json({
      slots: [],
      error: "This stylist does not provide this service.",
    });
  }

  const dayOfWeek = new Date(
    `${date}T12:00:00+05:30`
  ).getDay();

  const [
    { data: service },
    { data: hours },
    { data: blocks },
    { data: closure },
    { data: appointments },
  ] = await Promise.all([
    s
      .from("services")
      .select("duration_minutes")
      .eq("id", service_id)
      .eq("active", true)
      .is("deleted_at", null)
      .single(),

    s
      .from("working_hours")
      .select("start_time,end_time")
      .eq("stylist_id", stylist_id)
      .eq("day_of_week", dayOfWeek)
      .maybeSingle(),

    s
      .from("blocked_periods")
      .select("start_time,end_time")
      .or(
        `stylist_id.eq.${stylist_id},stylist_id.is.null`
      ),

    s
      .from("salon_closures")
      .select("*")
      .eq("closure_date", date)
      .maybeSingle(),

    s
      .from("appointments")
      .select("start_time,end_time")
      .eq("stylist_id", stylist_id)
      .eq("status", "confirmed")
      .gte(
        "end_time",
        `${date}T00:00:00+05:30`
      )
      .lte(
        "start_time",
        `${date}T23:59:59+05:30`
      ),
  ]);

  /*
   * No service = no availability.
   *
   * Salon closure = no availability.
   *
   * IMPORTANT:
   * No working_hours row now means the stylist
   * is NOT working that day.
   *
   * We deliberately do NOT fall back to generic
   * 10 AM - 10 PM hours.
   */
  if (!service || !hours || closure) {
    return NextResponse.json({
      slots: [],
    });
  }

  const startTime = hours.start_time;
  const endTime = hours.end_time;

  const dur = service.duration_minutes;

  const startMin =
    Number(startTime.slice(0, 2)) * 60 +
    Number(startTime.slice(3, 5));

  const closeMin =
    Number(endTime.slice(0, 2)) * 60 +
    Number(endTime.slice(3, 5));

  const booked = (appointments ?? []).map(
    (a: any) => [
      new Date(a.start_time).getTime(),
      new Date(a.end_time).getTime(),
    ]
  );

  /*
   * Convert the requested calendar date into
   * India-local timestamps.
   */
  const dayStart = new Date(
    `${date}T00:00:00+05:30`
  ).getTime();

  const dayEnd = new Date(
    `${date}T23:59:59+05:30`
  ).getTime();

  /*
   * Only blocked periods that overlap this date
   * matter.
   */
  const blocked = (blocks ?? [])
    .map((b: any) => [
      new Date(b.start_time).getTime(),
      new Date(b.end_time).getTime(),
    ])
    .filter(
      ([start, end]) =>
        start < dayEnd && end > dayStart
    );

  const slots: string[] = [];

  /*
   * Generate slots every 30 minutes.
   *
   * Example:
   * 10:00
   * 10:30
   * 11:00
   * ...
   *
   * A service must finish by the stylist's
   * configured closing time.
   */
  for (
    let m = startMin;
    m + dur <= closeMin;
    m += 30
  ) {
    const hh = String(
      Math.floor(m / 60)
    ).padStart(2, "0");

    const mm = String(
      m % 60
    ).padStart(2, "0");

    const local =
      `${date}T${hh}:${mm}:00+05:30`;

    const a = new Date(local).getTime();
    const b = a + dur * 60000;

    /*
     * Never show a time that has already passed.
     */
    if (a < Date.now()) {
      continue;
    }

    /*
     * Existing appointment overlap.
     */
    const appointmentConflict =
      booked.some(
        ([x, y]) =>
          a < y && b > x
      );

    /*
     * Blocked-period overlap.
     */
    const blockedConflict =
      blocked.some(
        ([x, y]) =>
          a < y && b > x
      );

    if (
      appointmentConflict ||
      blockedConflict
    ) {
      continue;
    }

    slots.push(`${hh}:${mm}`);
  }

  return NextResponse.json({
    slots,
  });
}
