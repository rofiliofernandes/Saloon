import { NextResponse } from "next/server";
import {
  requireAdmin,
  requireOwner,
} from "@/lib/auth";

const allowed: any = {
  services: "services",
  stylists: "stylists",
  coupons: "coupons",
  availability: "working_hours",
  "blocked-periods": "blocked_periods",
};

function ownerOnly(section: string) {
  return section === "coupons";
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

  return map[weekday];
}

/*
 * Find future confirmed appointments affected by
 * a working-hours change or a recurring day off.
 */
async function findAffectedAppointments(
  s: any,
  stylistId: string,
  schedule: any,
  newSchedule?: any
) {
  const { data: appointments, error } = await s
    .from("appointments")
    .select(
      "id,customer_id,service_id,stylist_id,start_time,end_time,price,status"
    )
    .eq("stylist_id", stylistId)
    .eq("status", "confirmed")
    .gte("start_time", new Date().toISOString())
    .order("start_time", { ascending: true })
    .limit(1000);

  if (error) {
    throw error;
  }

  const list = appointments ?? [];

  const oldDay = Number(schedule.day_of_week);

  /*
   * --------------------------------------------------
   * DAY OFF
   * --------------------------------------------------
   *
   * Deleting Maya's Monday working-hours row means
   * Maya will no longer work Mondays.
   *
   * Therefore every future confirmed Monday
   * appointment must block the deletion.
   */
  if (!newSchedule) {
    return list.filter((appointment: any) => {
      return (
        indiaWeekday(appointment.start_time) === oldDay
      );
    });
  }

  /*
   * --------------------------------------------------
   * SCHEDULE CHANGE
   * --------------------------------------------------
   */

  const newDay = Number(newSchedule.day_of_week);

  const newStart =
    Number(String(newSchedule.start_time).slice(0, 2)) * 60 +
    Number(String(newSchedule.start_time).slice(3, 5));

  const newEnd =
    Number(String(newSchedule.end_time).slice(0, 2)) * 60 +
    Number(String(newSchedule.end_time).slice(3, 5));

  /*
   * If the weekday itself changes, appointments on
   * either weekday need to be reviewed.
   */
  if (oldDay !== newDay) {
    return list.filter((appointment: any) => {
      const day = indiaWeekday(appointment.start_time);

      return day === oldDay || day === newDay;
    });
  }

  /*
   * Same weekday, but the working hours changed.
   *
   * Check whether an existing appointment no longer
   * fits inside the new working-hours window.
   */
  return list.filter((appointment: any) => {
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
      )?.value || 0
    );

    const startMinute = Number(
      startParts.find(
        (part) => part.type === "minute"
      )?.value || 0
    );

    const endHour = Number(
      endParts.find(
        (part) => part.type === "hour"
      )?.value || 0
    );

    const endMinute = Number(
      endParts.find(
        (part) => part.type === "minute"
      )?.value || 0
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
   const { s, user, profile } = await requireAdmin();

const { section, id } = await params;

if (ownerOnly(section) && profile?.role !== "owner") {
  return NextResponse.json(
    { error: "FORBIDDEN" },
    { status: 403 }
  );
}

    const table = allowed[section];

    if (!table) {
      return NextResponse.json(
        { error: "Not found" },
        { status: 404 }
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
        .update(clean)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      const { error: deleteError } = await s
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

        const { error: relationError } =
          await s
            .from("stylist_services")
            .insert(relationships);

        if (relationError) {
          throw relationError;
        }
      }

      await s.from("audit_logs").insert({
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
     * AVAILABILITY
     * --------------------------------------------------
     *
     * Changing working hours is blocked if an
     * existing confirmed appointment would no
     * longer fit.
     */

    if (table === "working_hours") {
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
        day_of_week: body.day_of_week,
        start_time: body.start_time,
        end_time: body.end_time,
      };

      const affectedAppointments =
        await findAffectedAppointments(
          s,
          oldSchedule.stylist_id,
          oldSchedule,
          newSchedule
        );

      if (affectedAppointments.length > 0) {
        return NextResponse.json(
          {
            error:
              "This schedule change affects confirmed appointments. Resolve those appointments before changing the working hours.",
            code: "APPOINTMENTS_AFFECTED",
            appointments:
              affectedAppointments,
          },
          { status: 409 }
        );
      }
    }

    /*
     * --------------------------------------------------
     * GENERIC UPDATE
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
          ].includes(key)
      )
    );

    const { data, error } = await s
      .from(table)
      .update(clean)
      .eq("id", id)
      .select();

    if (error) throw error;

    await s.from("audit_logs").insert({
      admin_id: user.id,
      action: "update",
      entity: table,
      entity_id: id,
      new_data: data,
    });

    return NextResponse.json({
      rows: data,
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        error:
          e?.message ||
          "Unable to update record.",
      },
      { status: 400 }
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

    const table = allowed[section];

    if (!table) {
      return NextResponse.json(
        { error: "Not found" },
        { status: 404 }
      );
    }

    /*
     * --------------------------------------------------
     * AVAILABILITY / DAY OFF
     * --------------------------------------------------
     *
     * A working-hours row represents a recurring
     * weekday.
     *
     * Example:
     *
     * Maya + Monday
     *
     * means Maya works Mondays.
     *
     * Deleting that row means Maya is off every
     * Monday.
     *
     * NEVER allow that deletion if there is a
     * future confirmed appointment on that weekday.
     */

    if (table === "working_hours") {
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

      const affectedAppointments =
        await findAffectedAppointments(
          s,
          schedule.stylist_id,
          schedule
        );

      if (affectedAppointments.length > 0) {
        return NextResponse.json(
          {
            error:
              "This day off affects confirmed appointments. Resolve those appointments before taking this stylist off.",
            code: "APPOINTMENTS_AFFECTED",
            appointments:
              affectedAppointments,
          },
          { status: 409 }
        );
      }
    }

    /*
     * --------------------------------------------------
     * LOAD OLD DATA
     * --------------------------------------------------
     */

    const { data: old } = await s
      .from(table)
      .select("*")
      .eq("id", id)
      .single();

    let q: any;

    /*
     * Services and stylists are soft deleted.
     */

    if (
      ["services", "stylists"].includes(table)
    ) {
      q = s
        .from(table)
        .update({
          active: false,
          deleted_at:
            new Date().toISOString(),
        })
        .eq("id", id);
    } else {
      q = s
        .from(table)
        .delete()
        .eq("id", id);
    }

    const { error } = await q;

    if (error) {
      throw error;
    }

    await s.from("audit_logs").insert({
      admin_id: user.id,
      action: "delete",
      entity: table,
      entity_id: id,
      old_data: old,
    });

    return NextResponse.json({
      ok: true,
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        error:
          e?.message ||
          "Unable to delete record.",
      },
      { status: 400 }
    );
  }
}
