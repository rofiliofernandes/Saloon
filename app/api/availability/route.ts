import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const querySchema = z.object({
  service_id: z.string().uuid(),

  service_option_id: z.string().uuid(),

  stylist_id: z.string().uuid(),

  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/),
});

function timeToMinutes(time: string) {
  const [hour, minute] = time
    .slice(0, 5)
    .split(":")
    .map(Number);

  return hour * 60 + minute;
}

export async function GET(req: Request) {
  const url = new URL(req.url);

  const parsed = querySchema.safeParse(
    Object.fromEntries(
      url.searchParams
    )
  );

  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          "Invalid availability request",
      },
      { status: 400 }
    );
  }

  const {
    service_id,
    service_option_id,
    stylist_id,
    date,
  } = parsed.data;

  const s = await createClient();

  /*
   * Make sure the selected option belongs to
   * the selected service and is active.
   */
  const {
    data: option,
    error: optionError,
  } = await s
    .from("service_options")
    .select(
      "id,service_id,duration_minutes,active"
    )
    .eq("id", service_option_id)
    .eq("service_id", service_id)
    .eq("active", true)
    .maybeSingle();

  if (optionError || !option) {
    return NextResponse.json({
      slots: [],
      error:
        "Selected service option is unavailable.",
    });
  }

  /*
   * Make sure the stylist actually provides
   * the selected service.
   */
  const {
    data: relationship,
  } = await s
    .from("stylist_services")
    .select("stylist_id")
    .eq("stylist_id", stylist_id)
    .eq("service_id", service_id)
    .maybeSingle();

  if (!relationship) {
    return NextResponse.json({
      slots: [],
      error:
        "This stylist does not provide this service.",
    });
  }

  /*
   * Salon local day.
   */
  const dayOfWeek = new Date(
    `${date}T12:00:00+05:30`
  ).getDay();

  /*
   * Load all relevant scheduling data.
   *
   * Multiple working-hour intervals are supported.
   */
  const [
    { data: hours },
    { data: blocks },
    { data: closure },
    { data: appointments },
  ] = await Promise.all([
    s
      .from("working_hours")
      .select(
        "start_time,end_time"
      )
      .eq("stylist_id", stylist_id)
      .eq("day_of_week", dayOfWeek)
      .order("start_time"),

    s
      .from("blocked_periods")
      .select(
        "start_time,end_time"
      )
      .or(
        `stylist_id.eq.${stylist_id},stylist_id.is.null`
      ),

    s
      .from("salon_closures")
      .select(
        "closure_date,close_time"
      )
      .eq("closure_date", date)
      .maybeSingle(),

    s
      .from("appointments")
      .select(
        "start_time,end_time"
      )
      .eq("stylist_id", stylist_id)
      .neq("status", "cancelled")
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
   * Completely closed salon.
   */
  if (
    closure &&
    closure.close_time === null
  ) {
    return NextResponse.json({
      slots: [],
    });
  }

  /*
   * No working-hours row means the stylist
   * is not working that day.
   */
  if (!hours?.length) {
    return NextResponse.json({
      slots: [],
    });
  }

  const duration =
    option.duration_minutes;

  /*
   * Convert appointments into timestamps.
   */
  const booked = (
    appointments ?? []
  ).map((appointment: any) => [
    new Date(
      appointment.start_time
    ).getTime(),

    new Date(
      appointment.end_time
    ).getTime(),
  ]);

  /*
   * Convert blocked periods.
   */
  const dayStart = new Date(
    `${date}T00:00:00+05:30`
  ).getTime();

  const dayEnd = new Date(
    `${date}T23:59:59+05:30`
  ).getTime();

  const blocked = (
    blocks ?? []
  )
    .map((block: any) => [
      new Date(
        block.start_time
      ).getTime(),

      new Date(
        block.end_time
      ).getTime(),
    ])
    .filter(
      ([start, end]) =>
        start < dayEnd &&
        end > dayStart
    );

  const slots: string[] = [];

  /*
   * Generate slots inside every working interval.
   */
  for (const hour of hours) {
    const startMin =
      timeToMinutes(
        hour.start_time
      );

    let endMin =
      timeToMinutes(
        hour.end_time
      );

    /*
     * A partial salon closure shortens the
     * working interval.
     */
    if (
      closure?.close_time
    ) {
      endMin = Math.min(
        endMin,
        timeToMinutes(
          closure.close_time
        )
      );
    }

    /*
     * If the closure is before this interval,
     * there are no slots in it.
     */
    if (
      endMin <= startMin
    ) {
      continue;
    }

    for (
      let minute = startMin;
      minute + duration <= endMin;
      minute += 30
    ) {
      const hh = String(
        Math.floor(minute / 60)
      ).padStart(2, "0");

      const mm = String(
        minute % 60
      ).padStart(2, "0");

      const local =
        `${date}T${hh}:${mm}:00+05:30`;

      const start =
        new Date(local).getTime();

      const end =
        start +
        duration * 60 * 1000;

      /*
       * Never show a slot in the past.
       */
      if (start <= Date.now()) {
        continue;
      }

      /*
       * Existing appointment conflict.
       */
      const appointmentConflict =
        booked.some(
          ([existingStart, existingEnd]) =>
            start < existingEnd &&
            end > existingStart
        );

      if (appointmentConflict) {
        continue;
      }

      /*
       * Blocked-period conflict.
       */
      const blockedConflict =
        blocked.some(
          ([blockedStart, blockedEnd]) =>
            start < blockedEnd &&
            end > blockedStart
        );

      if (blockedConflict) {
        continue;
      }

      const value =
        `${hh}:${mm}`;

      /*
       * Avoid duplicates if two working intervals
       * happen to touch.
       */
      if (!slots.includes(value)) {
        slots.push(value);
      }
    }
  }

  slots.sort();

  return NextResponse.json({
    slots,
  });
}
