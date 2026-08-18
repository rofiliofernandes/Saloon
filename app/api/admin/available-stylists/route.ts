import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

const TIME_ZONE = "Asia/Kolkata";

function getIndiaWeekday(value: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    weekday: "short",
  }).formatToParts(value);

  const weekday = parts.find(
    (part) => part.type === "weekday"
  )?.value;

  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return map[weekday || "Sun"];
}

function indiaMinutes(value: Date) {
  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);

  const hour = Number(
    parts.find((part) => part.type === "hour")?.value || 0
  );

  const minute = Number(
    parts.find((part) => part.type === "minute")?.value || 0
  );

  return hour * 60 + minute;
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value
    .slice(0, 5)
    .split(":")
    .map(Number);

  return hours * 60 + minutes;
}

export async function GET(req: Request) {
  try {
    const { s } = await requireAdmin();

    const url = new URL(req.url);

    const serviceId = String(
      url.searchParams.get("service_id") || ""
    ).trim();

    const date = String(
      url.searchParams.get("date") || ""
    ).trim();

    const time = String(
      url.searchParams.get("time") || ""
    ).trim();

    if (!serviceId || !date || !time) {
      return NextResponse.json(
        {
          error:
            "Service, date and time are required.",
        },
        { status: 400 }
      );
    }

    /*
     * --------------------------------------------------
     * SERVICE
     * --------------------------------------------------
     */

    const {
      data: service,
      error: serviceError,
    } = await s
      .from("services")
      .select(
        "id,name,duration_minutes,active,deleted_at"
      )
      .eq("id", serviceId)
      .single();

    if (serviceError || !service) {
      return NextResponse.json(
        {
          error: "Service not found.",
        },
        { status: 404 }
      );
    }

    if (
      !service.active ||
      service.deleted_at !== null
    ) {
      return NextResponse.json({
        rows: [],
      });
    }

    /*
     * --------------------------------------------------
     * REQUESTED TIME
     * --------------------------------------------------
     */

    const start = new Date(
      `${date}T${time}:00+05:30`
    );

    if (Number.isNaN(start.getTime())) {
      return NextResponse.json(
        {
          error: "Invalid date or time.",
        },
        { status: 400 }
      );
    }

    /*
     * Don't offer a time that has already passed.
     */
    if (start.getTime() < Date.now()) {
      return NextResponse.json({
        rows: [],
      });
    }

    const end = new Date(
      start.getTime() +
        Number(service.duration_minutes) *
          60 *
          1000
    );

    const weekday = getIndiaWeekday(start);

    /*
     * IMPORTANT:
     * These are explicitly India-local minutes.
     */
    const startMinutes = indiaMinutes(start);
    const endMinutes = indiaMinutes(end);

    /*
     * --------------------------------------------------
     * SALON CLOSURE
     * --------------------------------------------------
     */

    const {
      data: closure,
      error: closureError,
    } = await s
      .from("salon_closures")
      .select("id")
      .eq("closure_date", date)
      .maybeSingle();

    if (closureError) {
      throw closureError;
    }

    if (closure) {
      return NextResponse.json({
        rows: [],
      });
    }

    /*
     * --------------------------------------------------
     * ACTIVE STYLISTS
     * --------------------------------------------------
     */

    const {
      data: stylists,
      error: stylistError,
    } = await s
      .from("stylists")
      .select("id,name,category")
      .eq("active", true)
      .is("deleted_at", null)
      .order("name");

    if (stylistError) {
      throw stylistError;
    }

    if (!stylists?.length) {
      return NextResponse.json({
        rows: [],
      });
    }

    /*
     * --------------------------------------------------
     * SERVICE RELATIONSHIPS
     * --------------------------------------------------
     */

    const {
      data: relationships,
      error: relationshipError,
    } = await s
      .from("stylist_services")
      .select("stylist_id")
      .eq("service_id", serviceId);

    if (relationshipError) {
      throw relationshipError;
    }

    const compatibleStylistIds = new Set(
      (relationships ?? []).map(
        (row: any) => row.stylist_id
      )
    );

    /*
     * --------------------------------------------------
     * WORKING HOURS
     * --------------------------------------------------
     */

    const {
      data: workingHours,
      error: workingHoursError,
    } = await s
      .from("working_hours")
      .select(
        "stylist_id,start_time,end_time"
      )
      .eq("day_of_week", weekday);

    if (workingHoursError) {
      throw workingHoursError;
    }

    /*
     * --------------------------------------------------
     * BLOCKED PERIODS
     * --------------------------------------------------
     */

    const {
      data: allBlockedPeriods,
      error: allBlockedError,
    } = await s
      .from("blocked_periods")
      .select(
        "stylist_id,start_time,end_time"
      );

    if (allBlockedError) {
      throw allBlockedError;
    }

    /*
     * --------------------------------------------------
     * EXISTING CONFIRMED APPOINTMENTS
     * --------------------------------------------------
     */

    const {
      data: appointments,
      error: appointmentError,
    } = await s
      .from("appointments")
      .select(
        "stylist_id,start_time,end_time"
      )
      .eq("status", "confirmed")
      .lt(
        "start_time",
        end.toISOString()
      )
      .gt(
        "end_time",
        start.toISOString()
      );

    if (appointmentError) {
      throw appointmentError;
    }

    /*
     * --------------------------------------------------
     * FILTER STYLISTS
     * --------------------------------------------------
     */

    const available = (
      stylists ?? []
    ).filter((stylist: any) => {
      /*
       * Must provide the selected service.
       */
      if (
        !compatibleStylistIds.has(
          stylist.id
        )
      ) {
        return false;
      }

      /*
       * Must actually be working
       * on this day.
       */
      const hours = (
        workingHours ?? []
      ).find(
        (row: any) =>
          row.stylist_id === stylist.id
      );

      if (!hours) {
        return false;
      }

      /*
       * Appointment must fit completely
       * inside working hours.
       */
      const openingMinutes =
        timeToMinutes(
          hours.start_time
        );

      const closingMinutes =
        timeToMinutes(
          hours.end_time
        );

      if (
        startMinutes <
          openingMinutes ||
        endMinutes >
          closingMinutes
      ) {
        return false;
      }

      /*
       * Existing confirmed appointment.
       */
      const appointmentConflict = (
        appointments ?? []
      ).some(
        (appointment: any) =>
          appointment.stylist_id ===
            stylist.id &&
          new Date(
            appointment.start_time
          ).getTime() <
            end.getTime() &&
          new Date(
            appointment.end_time
          ).getTime() >
            start.getTime()
      );

      if (appointmentConflict) {
        return false;
      }

      /*
       * Blocked period.
       *
       * null stylist_id means
       * the whole salon is blocked.
       */
      const blockedConflict = (
        allBlockedPeriods ?? []
      ).some((block: any) => {
        const applies =
          block.stylist_id === null ||
          block.stylist_id ===
            stylist.id;

        if (!applies) {
          return false;
        }

        return (
          new Date(
            block.start_time
          ).getTime() <
            end.getTime() &&
          new Date(
            block.end_time
          ).getTime() >
            start.getTime()
        );
      });

      if (blockedConflict) {
        return false;
      }

      return true;
    });

    return NextResponse.json({
      rows: available,
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        error:
          e?.message ||
          "Unable to determine available stylists.",
      },
      { status: 400 }
    );
  }
}
