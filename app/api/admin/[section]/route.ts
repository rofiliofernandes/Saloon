import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

const allowed: any = {
  services: "services",
  stylists: "stylists",
  coupons: "coupons",
  availability: "working_hours",
  "blocked-periods": "blocked_periods",
  appointments: "appointments",
  customers: "profiles",
};

const SALON_TIME_ZONE = "Asia/Kolkata";

/*
 * Return the weekday (0 = Sunday ... 6 = Saturday)
 * for an appointment in the salon's local timezone.
 */
function getLocalWeekday(value: string | Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SALON_TIME_ZONE,
    weekday: "short",
  }).formatToParts(new Date(value));

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

  return weekday ? map[weekday] : -1;
}

/*
 * Find confirmed future appointments that fall on a
 * particular recurring weekday for a stylist.
 */
async function findAffectedAppointments(
  s: any,
  stylistId: string,
  dayOfWeek: number
) {
  const { data, error } = await s
    .from("appointments")
    .select(
      `
        id,
        customer_id,
        service_id,
        stylist_id,
        start_time,
        end_time,
        price,
        status
      `
    )
    .eq("stylist_id", stylistId)
    .eq("status", "confirmed")
    .gte("start_time", new Date().toISOString())
    .order("start_time", { ascending: true })
    .limit(500);

  if (error) throw error;

  return (data ?? []).filter(
    (appointment: any) =>
      getLocalWeekday(appointment.start_time) === dayOfWeek
  );
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ section: string }> }
) {
  try {
    const { s } = await requireAdmin();
    const { section } = await params;

    const table = allowed[section];

    if (!table) {
      return NextResponse.json(
        { error: "Not found" },
        { status: 404 }
      );
    }

    let q = s
      .from(table)
      .select("*")
      .limit(200);

    if (
      table === "services" ||
      table === "stylists"
    ) {
      q = q.is("deleted_at", null);
    }

    const { data, error } = await q;

    if (error) throw error;

    return NextResponse.json({
      rows: data ?? [],
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message },
      {
        status:
          e.message === "FORBIDDEN"
            ? 403
            : 401,
      }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ section: string }> }
) {
  try {
    const { s, user } = await requireAdmin();
    const { section } = await params;

    const table = allowed[section];

    if (
      !table ||
      table === "appointments" ||
      table === "customers"
    ) {
      return NextResponse.json(
        { error: "Unsupported" },
        { status: 400 }
      );
    }

    const body = await req.json();

    /*
     * --------------------------------------------------
     * STYLISTS
     * --------------------------------------------------
     */

    if (table === "stylists") {
      const serviceIds = Array.isArray(
        body.service_ids
      )
        ? body.service_ids
        : [];

      const clean = Object.fromEntries(
        Object.entries(body).filter(
          ([key]) =>
            ![
              "id",
              "created_at",
              "updated_at",
              "deleted_at",
              "service_ids",
            ].includes(key)
        )
      );

      const { data, error } = await s
        .from("stylists")
        .insert(clean)
        .select()
        .single();

      if (error) throw error;

      if (serviceIds.length > 0) {
        const relationships = serviceIds.map(
          (serviceId: string) => ({
            stylist_id: data.id,
            service_id: serviceId,
          })
        );

        const {
          error: relationError,
        } = await s
          .from("stylist_services")
          .insert(relationships);

        if (relationError) {
          throw relationError;
        }
      }

      await s.from("audit_logs").insert({
        admin_id: user.id,
        action: "create",
        entity: "stylists",
        entity_id: data.id,
        new_data: data,
      });

      return NextResponse.json({
        rows: [data],
      });
    }

    /*
     * --------------------------------------------------
     * AVAILABILITY / WORKING HOURS
     * --------------------------------------------------
     *
     * Before creating a working-hours row, check whether
     * this stylist already has confirmed future bookings
     * on that recurring weekday.
     *
     * This is especially important for "Day off".
     */

    if (table === "working_hours") {
      const stylistId = String(
        body.stylist_id || ""
      );

      const dayOfWeek = Number(
        body.day_of_week
      );

      if (!stylistId) {
        return NextResponse.json(
          {
            error:
              "Please select a stylist.",
          },
          { status: 400 }
        );
      }

      if (
        !Number.isInteger(dayOfWeek) ||
        dayOfWeek < 0 ||
        dayOfWeek > 6
      ) {
        return NextResponse.json(
          {
            error:
              "Please select a valid day.",
          },
          { status: 400 }
        );
      }

      /*
       * Prevent duplicate schedules for the same
       * stylist + weekday.
       */
      const {
        data: existing,
        error: existingError,
      } = await s
        .from("working_hours")
        .select("id")
        .eq("stylist_id", stylistId)
        .eq("day_of_week", dayOfWeek)
        .maybeSingle();

      if (existingError) {
        throw existingError;
      }

      if (existing) {
        return NextResponse.json(
          {
            error:
              "Working hours already exist for this stylist on this day. Edit the existing schedule instead.",
          },
          { status: 409 }
        );
      }

      /*
       * If this is being created as a day off, there
       * cannot be confirmed appointments on that weekday.
       */
      if (body.day_off) {
        const affected =
          await findAffectedAppointments(
            s,
            stylistId,
            dayOfWeek
          );

        if (affected.length > 0) {
          return NextResponse.json(
            {
              error:
                "This stylist has confirmed appointments on this day. The day off cannot be created until those appointments are cancelled or reassigned.",
              code:
                "APPOINTMENTS_AFFECTED",
              appointments: affected,
            },
            { status: 409 }
          );
        }

        /*
         * A day off is represented by the absence
         * of a working-hours row.
         *
         * Since this is a new row, there is nothing
         * to insert.
         */
        return NextResponse.json(
          {
            error:
              "Day off does not create a working-hours record. The stylist has no schedule for this day.",
          },
          { status: 400 }
        );
      }

      const startTime = String(
        body.start_time || ""
      );
      const endTime = String(
        body.end_time || ""
      );

      if (!startTime || !endTime) {
        return NextResponse.json(
          {
            error:
              "Please select start and end times.",
          },
          { status: 400 }
        );
      }

      /*
       * Check whether confirmed appointments on this
       * weekday would fall outside the new working hours.
       */
      const affected =
        await findAffectedAppointments(
          s,
          stylistId,
          dayOfWeek
        );

      const startMinutes =
        Number(startTime.slice(0, 2)) * 60 +
        Number(startTime.slice(3, 5));

      const endMinutes =
        Number(endTime.slice(0, 2)) * 60 +
        Number(endTime.slice(3, 5));

      if (endMinutes <= startMinutes) {
        return NextResponse.json(
          {
            error:
              "End time must be after start time.",
          },
          { status: 400 }
        );
      }

      const conflictingAppointments =
        affected.filter((appointment: any) => {
          const parts =
            new Intl.DateTimeFormat(
              "en-GB",
              {
                timeZone: SALON_TIME_ZONE,
                hour: "2-digit",
                minute: "2-digit",
                hourCycle: "h23",
              }
            ).formatToParts(
              new Date(
                appointment.start_time
              )
            );

          const hour = Number(
            parts.find(
              (p) => p.type === "hour"
            )?.value || 0
          );

          const minute = Number(
            parts.find(
              (p) => p.type === "minute"
            )?.value || 0
          );

          const appointmentStart =
            hour * 60 + minute;

          const endParts =
            new Intl.DateTimeFormat(
              "en-GB",
              {
                timeZone: SALON_TIME_ZONE,
                hour: "2-digit",
                minute: "2-digit",
                hourCycle: "h23",
              }
            ).formatToParts(
              new Date(
                appointment.end_time
              )
            );

          const endHour = Number(
            endParts.find(
              (p) => p.type === "hour"
            )?.value || 0
          );

          const endMinute = Number(
            endParts.find(
              (p) => p.type === "minute"
            )?.value || 0
          );

          const appointmentEnd =
            endHour * 60 + endMinute;

          return (
            appointmentStart <
              startMinutes ||
            appointmentEnd >
              endMinutes
          );
        });

      if (
        conflictingAppointments.length > 0
      ) {
        return NextResponse.json(
          {
            error:
              "The new working hours would conflict with confirmed appointments for this stylist.",
            code:
              "APPOINTMENTS_AFFECTED",
            appointments:
              conflictingAppointments,
          },
          { status: 409 }
        );
      }
    }

    /*
     * --------------------------------------------------
     * NORMAL INSERT
     * --------------------------------------------------
     */

    const clean = Object.fromEntries(
      Object.entries(body).filter(
        ([key]) =>
          ![
            "id",
            "created_at",
            "updated_at",
            "deleted_at",
            "day_off",
          ].includes(key)
      )
    );

    const { data, error } = await s
      .from(table)
      .insert(clean)
      .select();

    if (error) throw error;

    await s.from("audit_logs").insert({
      admin_id: user.id,
      action: "create",
      entity: table,
      entity_id: data?.[0]?.id,
      new_data: data?.[0],
    });

    return NextResponse.json({
      rows: data,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message },
      { status: 400 }
    );
  }
}
