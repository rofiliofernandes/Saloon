import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const ALLOWED_SECTIONS = new Set([
  "services",
  "stylists",
  "availability",
  "blocked-periods",
]);

function getTable(section: string) {
  const tables: Record<string, string> = {
    services: "services",
    stylists: "stylists",
    availability: "working_hours",
    "blocked-periods": "blocked_periods",
  };

  return tables[section] ?? null;
}

function indiaWeekday(value: string | Date): number {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
  }).format(new Date(value));

  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return map[weekday] ?? -1;
}

function timeToMinutes(value: string): number {
  const match = /^(\d{2}):(\d{2})/.exec(value);

  if (!match) {
    return -1;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return -1;
  }

  return hours * 60 + minutes;
}

async function findAffectedAppointments(
  s: any,
  stylistId: string,
  oldSchedule: any,
  newSchedule?: any
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
    .limit(1000);

  if (error) {
    throw error;
  }

  const appointments = data ?? [];

  const oldDay = Number(oldSchedule.day_of_week);

  /*
   * Deleting a working-hours row means the stylist
   * is no longer available on that recurring weekday.
   */
  if (!newSchedule) {
    return appointments.filter(
      (appointment: any) =>
        indiaWeekday(appointment.start_time) === oldDay
    );
  }

  const newDay = Number(newSchedule.day_of_week);

  const newStart = timeToMinutes(
    String(newSchedule.start_time)
  );

  const newEnd = timeToMinutes(
    String(newSchedule.end_time)
  );

  if (
    newStart < 0 ||
    newEnd < 0 ||
    newEnd <= newStart
  ) {
    return appointments;
  }

  /*
   * If the weekday changes, review appointments
   * on both the old and new weekdays.
   */
  if (oldDay !== newDay) {
    return appointments.filter((appointment: any) => {
      const day = indiaWeekday(appointment.start_time);

      return day === oldDay || day === newDay;
    });
  }

  /*
   * Same weekday.
   *
   * Check whether an existing appointment would
   * fall outside the new working-hours window.
   */
  return appointments.filter((appointment: any) => {
    const startDate = new Date(
      appointment.start_time
    );

    const endDate = new Date(
      appointment.end_time
    );

    const startParts = new Intl.DateTimeFormat(
      "en-IN",
      {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }
    ).formatToParts(startDate);

    const endParts = new Intl.DateTimeFormat(
      "en-IN",
      {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }
    ).formatToParts(endDate);

    const startHour = Number(
      startParts.find(
        (part) => part.type === "hour"
      )?.value ?? 0
    );

    const startMinute = Number(
      startParts.find(
        (part) => part.type === "minute"
      )?.value ?? 0
    );

    const endHour = Number(
      endParts.find(
        (part) => part.type === "hour"
      )?.value ?? 0
    );

    const endMinute = Number(
      endParts.find(
        (part) => part.type === "minute"
      )?.value ?? 0
    );

    const appointmentStart =
      startHour * 60 + startMinute;

    const appointmentEnd =
      endHour * 60 + endMinute;

    return (
      appointmentStart < newStart ||
      appointmentEnd > newEnd
    );
  });
}

export async function PATCH(
  req: Request,
  {
    params,
  }: {
    params: Promise<{
      section: string;
      id: string;
    }>;
  }
) {
  try {
    const { s, user } = await requireAdmin();

    const { section, id } = await params;

    if (!ALLOWED_SECTIONS.has(section)) {
      return NextResponse.json(
        { error: "Not found" },
        { status: 404 }
      );
    }

    if (!id) {
      return NextResponse.json(
        { error: "Missing record ID" },
        { status: 400 }
      );
    }

    const body = await req.json();

    /*
     * --------------------------------------------------
     * STYLISTS
     * --------------------------------------------------
     */

    if (section === "stylists") {
      const name =
        String(body.name ?? "").trim();

      const bio =
        String(body.bio ?? "").trim() || null;

      const category =
        String(body.category ?? "").trim();

      const active =
        body.active === undefined
          ? true
          : Boolean(body.active);

      if (!name) {
        return NextResponse.json(
          { error: "Stylist name is required." },
          { status: 400 }
        );
      }

      if (
        !["male", "female", "unisex"].includes(
          category
        )
      ) {
        return NextResponse.json(
          { error: "Invalid stylist category." },
          { status: 400 }
        );
      }

      const serviceIds = Array.isArray(
        body.service_ids
      )
        ? body.service_ids
            .map((value: unknown) =>
              String(value)
            )
            .filter(Boolean)
        : [];

      const admin = createAdminClient();
      const { data, error } = await admin
        .from("stylists")
        .update({
          name,
          bio,
          category,
          active,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      /*
       * Replace stylist/service relationships using
       * the dedicated relationship table.
       */
      const { error: deleteError } = await admin
        .from("stylist_services")
        .delete()
        .eq("stylist_id", id);

      if (deleteError) {
        throw deleteError;
      }

      if (serviceIds.length > 0) {
        const relationships = serviceIds.map(
          (serviceId: string) => ({
            stylist_id: id,
            service_id: serviceId,
          })
        );

        const { error: relationError } = await admin
          .from("stylist_services")
          .insert(relationships);

        if (relationError) {
          throw relationError;
        }
      }

      await admin.from("audit_logs").insert({
        admin_id: user.id,
        action: "update",
        entity: "stylists",
        entity_id: id,
        new_data: data,
      });

      return NextResponse.json({
        rows: [data],
      });
    }

    /*
     * --------------------------------------------------
     * WORKING HOURS
     * --------------------------------------------------
     */

    if (section === "availability") {
      const dayOfWeek = Number(
        body.day_of_week
      );

      const startTime = String(
        body.start_time ?? ""
      );

      const endTime = String(
        body.end_time ?? ""
      );

      if (
        !Number.isInteger(dayOfWeek) ||
        dayOfWeek < 0 ||
        dayOfWeek > 6
      ) {
        return NextResponse.json(
          { error: "Invalid day of week." },
          { status: 400 }
        );
      }

      const startMinutes =
        timeToMinutes(startTime);

      const endMinutes =
        timeToMinutes(endTime);

      if (
        startMinutes < 0 ||
        endMinutes < 0 ||
        endMinutes <= startMinutes
      ) {
        return NextResponse.json(
          {
            error:
              "Invalid working-hours range.",
          },
          { status: 400 }
        );
      }

      const {
        data: oldSchedule,
        error: oldError,
      } = await s
        .from("working_hours")
        .select("*")
        .eq("id", id)
        .single();

      if (oldError || !oldSchedule) {
        return NextResponse.json(
          {
            error:
              "Working-hours record not found.",
          },
          { status: 404 }
        );
      }

      const newSchedule = {
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
      };

      const affected =
        await findAffectedAppointments(
          s,
          oldSchedule.stylist_id,
          oldSchedule,
          newSchedule
        );

      if (affected.length > 0) {
        return NextResponse.json(
          {
            error:
              "This schedule change affects confirmed appointments. Resolve those appointments first.",
            code: "APPOINTMENTS_AFFECTED",
            appointments: affected,
          },
          { status: 409 }
        );
      }

      const { data, error } = await s
        .from("working_hours")
        .update({
          day_of_week: dayOfWeek,
          start_time: startTime,
          end_time: endTime,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      await s.from("audit_logs").insert({
        admin_id: user.id,
        action: "update",
        entity: "working_hours",
        entity_id: id,
        old_data: oldSchedule,
        new_data: data,
      });

      return NextResponse.json({
        rows: [data],
      });
    }

    /*
     * --------------------------------------------------
     * BLOCKED PERIODS
     * --------------------------------------------------
     */

    if (section === "blocked-periods") {
      const stylistId =
        String(body.stylist_id ?? "").trim();

      const startTime =
        String(body.start_time ?? "").trim();

      const endTime =
        String(body.end_time ?? "").trim();

      const reason =
        String(body.reason ?? "").trim() || null;

      if (!stylistId) {
        return NextResponse.json(
          { error: "Stylist is required." },
          { status: 400 }
        );
      }

      const start = new Date(startTime);
      const end = new Date(endTime);

      if (
        Number.isNaN(start.getTime()) ||
        Number.isNaN(end.getTime()) ||
        end <= start
      ) {
        return NextResponse.json(
          {
            error:
              "Invalid blocked-period range.",
          },
          { status: 400 }
        );
      }

      const { data, error } = await s
        .from("blocked_periods")
        .update({
          stylist_id: stylistId,
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          reason,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      await s.from("audit_logs").insert({
        admin_id: user.id,
        action: "update",
        entity: "blocked_periods",
        entity_id: id,
        new_data: data,
      });

      return NextResponse.json({
        rows: [data],
      });
    }

    /*
     * --------------------------------------------------
     * SERVICES
     * --------------------------------------------------
     *
     * The newer service catalogue has its own API.
     *
     * We deliberately do not allow the generic editor
     * to modify service records anymore.
     */
    if (section === "services") {
      return NextResponse.json(
        {
          error:
            "Use the service catalogue endpoint for service changes.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Unsupported section." },
      { status: 400 }
    );
  } catch (error: any) {
    const message =
      error?.message ||
      "Unable to update record.";

    const status =
      message === "UNAUTHENTICATED"
        ? 401
        : message === "FORBIDDEN"
          ? 403
          : 400;

    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}

export async function DELETE(
  _req: Request,
  {
    params,
  }: {
    params: Promise<{
      section: string;
      id: string;
    }>;
  }
) {
  try {
    const { s, user } = await requireAdmin();

    const { section, id } = await params;

    if (!ALLOWED_SECTIONS.has(section)) {
      return NextResponse.json(
        { error: "Not found" },
        { status: 404 }
      );
    }

    if (!id) {
      return NextResponse.json(
        { error: "Missing record ID" },
        { status: 400 }
      );
    }

    /*
     * --------------------------------------------------
     * WORKING HOURS
     * --------------------------------------------------
     *
     * Removing a recurring working-hours row means
     * the stylist becomes unavailable on that weekday.
     */
    if (section === "availability") {
      const {
        data: schedule,
        error: scheduleError,
      } = await s
        .from("working_hours")
        .select("*")
        .eq("id", id)
        .single();

      if (scheduleError || !schedule) {
        return NextResponse.json(
          {
            error:
              "Working-hours record not found.",
          },
          { status: 404 }
        );
      }

      const affected =
        await findAffectedAppointments(
          s,
          schedule.stylist_id,
          schedule
        );

      if (affected.length > 0) {
        return NextResponse.json(
          {
            error:
              "This day off affects confirmed appointments. Resolve those appointments first.",
            code: "APPOINTMENTS_AFFECTED",
            appointments: affected,
          },
          { status: 409 }
        );
      }

      const { error } = await s
        .from("working_hours")
        .delete()
        .eq("id", id);

      if (error) {
        throw error;
      }

      await s.from("audit_logs").insert({
        admin_id: user.id,
        action: "delete",
        entity: "working_hours",
        entity_id: id,
        old_data: schedule,
      });

      return NextResponse.json({
        ok: true,
      });
    }

    /*
     * --------------------------------------------------
     * BLOCKED PERIODS
     * --------------------------------------------------
     */

    if (section === "blocked-periods") {
      const { data: old, error: oldError } =
        await s
          .from("blocked_periods")
          .select("*")
          .eq("id", id)
          .single();

      if (oldError || !old) {
        return NextResponse.json(
          {
            error:
              "Blocked period not found.",
          },
          { status: 404 }
        );
      }

      const { error } = await s
        .from("blocked_periods")
        .delete()
        .eq("id", id);

      if (error) {
        throw error;
      }

      await s.from("audit_logs").insert({
        admin_id: user.id,
        action: "delete",
        entity: "blocked_periods",
        entity_id: id,
        old_data: old,
      });

      return NextResponse.json({
        ok: true,
      });
    }

    /*
     * --------------------------------------------------
     * STYLISTS
     * --------------------------------------------------
     *
     * Stylists are soft deleted so historical
     * appointments remain intact.
     */
    if (section === "stylists") {
      const admin = createAdminClient();
      const { data: old, error: oldError } =
        await admin
          .from("stylists")
          .select("*")
          .eq("id", id)
          .single();

      if (oldError || !old) {
        return NextResponse.json(
          {
            error: "Stylist not found.",
          },
          { status: 404 }
        );
      }

      const { data, error } = await admin
        .from("stylists")
        .update({
          active: false,
          deleted_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      await admin.from("audit_logs").insert({
        admin_id: user.id,
        action: "delete",
        entity: "stylists",
        entity_id: id,
        old_data: old,
        new_data: data,
      });

      return NextResponse.json({
        ok: true,
      });
    }

    /*
     * Services are managed by the service catalogue.
     */
    if (section === "services") {
      return NextResponse.json(
        {
          error:
            "Use the service catalogue endpoint for service changes.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error:
          "This resource cannot be deleted through the generic admin API.",
      },
      { status: 400 }
    );
  } catch (error: any) {
    const message =
      error?.message ||
      "Unable to delete record.";

    const status =
      message === "UNAUTHENTICATED"
        ? 401
        : message === "FORBIDDEN"
          ? 403
          : 400;

    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
