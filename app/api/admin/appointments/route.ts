import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

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

function indiaMinutes(value: string | Date): number {
  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));

  const hour = Number(
    parts.find((part) => part.type === "hour")?.value || 0
  );

  const minute = Number(
    parts.find((part) => part.type === "minute")?.value || 0
  );

  return hour * 60 + minute;
}

export async function POST(req: Request) {
  try {
    const { s, user } = await requireAdmin();

    const body = await req.json();

    const customerId =
      typeof body.customer_id === "string" &&
      body.customer_id.trim()
        ? body.customer_id.trim()
        : null;

    const newCustomer =
      body.new_customer &&
      typeof body.new_customer === "object"
        ? body.new_customer
        : null;

    const serviceId = String(
      body.service_id || ""
    ).trim();

    const serviceOptionId = String(
      body.service_option_id || ""
    ).trim();

    const stylistId = String(
      body.stylist_id || ""
    ).trim();

    const startTime = String(
      body.start_time || ""
    ).trim();

    const requestedPrice = Number(body.price);

    const status =
      body.status === "confirmed"
        ? "confirmed"
        : "completed";

    if (!serviceId) {
      return NextResponse.json(
        { error: "Please select a service." },
        { status: 400 }
      );
    }

    if (!stylistId) {
      return NextResponse.json(
        { error: "Please select a stylist." },
        { status: 400 }
      );
    }

    if (!startTime) {
      return NextResponse.json(
        {
          error:
            "Please select the appointment date and time.",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isFinite(requestedPrice) ||
      requestedPrice < 0
    ) {
      return NextResponse.json(
        { error: "Please enter a valid amount." },
        { status: 400 }
      );
    }

    /*
     * ------------------------------------------------
     * CUSTOMER
     * ------------------------------------------------
     */

    if (!customerId && !newCustomer) {
      return NextResponse.json(
        {
          error:
            "Please select an existing customer or enter a new customer.",
        },
        { status: 400 }
      );
    }

    if (customerId && newCustomer) {
      return NextResponse.json(
        {
          error:
            "Choose either an existing customer or a new customer.",
        },
        { status: 400 }
      );
    }

    let customerName: string | null = null;
    let customerEmail: string | null = null;

    if (customerId) {
      const {
        data: customer,
        error: customerError,
      } = await s
        .from("profiles")
        .select("id,name,email")
        .eq("id", customerId)
        .single();

      if (customerError || !customer) {
        return NextResponse.json(
          { error: "Customer not found." },
          { status: 404 }
        );
      }

      customerName = customer.name;
      customerEmail = customer.email;
    } else {
      customerName = String(
        newCustomer?.name || ""
      ).trim();

      customerEmail =
        String(
          newCustomer?.email || ""
        ).trim() || null;

      if (!customerName) {
        return NextResponse.json(
          {
            error:
              "Please enter the customer's name.",
          },
          { status: 400 }
        );
      }
    }

    /*
     * ------------------------------------------------
     * SERVICE
     * ------------------------------------------------
     */

    const {
      data: service,
      error: serviceError,
    } = await s
      .from("services")
      .select(
        "id,name,price,duration_minutes,active,deleted_at"
      )
      .eq("id", serviceId)
      .single();

    if (serviceError || !service) {
      return NextResponse.json(
        { error: "Service not found." },
        { status: 404 }
      );
    }

    if (
      !service.active ||
      service.deleted_at !== null
    ) {
      return NextResponse.json(
        {
          error:
            "This service is no longer available.",
        },
        { status: 400 }
      );
    }

    /*
     * Service options are the source of truth for duration and
     * the standard/base price. The admin may still override the
     * final walk-in price intentionally, but the client can never
     * change the appointment duration by sending its own value.
     */
    let selectedOption: {
      id: string;
      price: number;
      duration_minutes: number;
      active: boolean;
    } | null = null;

    if (serviceOptionId) {
      const { data: option, error: optionError } = await s
        .from("service_options")
        .select("id,price,duration_minutes,active,service_id")
        .eq("id", serviceOptionId)
        .eq("service_id", serviceId)
        .maybeSingle();

      if (optionError) throw optionError;

      if (!option || option.active === false) {
        return NextResponse.json(
          { error: "Selected service option is not available." },
          { status: 400 }
        );
      }

      selectedOption = {
        id: option.id,
        price: Number(option.price),
        duration_minutes: Number(option.duration_minutes),
        active: option.active !== false,
      };
    }

    const servicePrice = selectedOption?.price ?? Number(service.price || 0);
    const serviceDurationMinutes = selectedOption?.duration_minutes ?? Number(service.duration_minutes || 0);

    if (!Number.isInteger(serviceDurationMinutes) || serviceDurationMinutes <= 0) {
      return NextResponse.json(
        { error: "This service does not have a valid duration." },
        { status: 400 }
      );
    }

    /*
     * ------------------------------------------------
     * STYLIST
     * ------------------------------------------------
     */

    const {
      data: stylist,
      error: stylistError,
    } = await s
      .from("stylists")
      .select(
        "id,name,active,deleted_at"
      )
      .eq("id", stylistId)
      .single();

    if (stylistError || !stylist) {
      return NextResponse.json(
        { error: "Stylist not found." },
        { status: 404 }
      );
    }

    if (
      !stylist.active ||
      stylist.deleted_at !== null
    ) {
      return NextResponse.json(
        {
          error:
            "This stylist is no longer available.",
        },
        { status: 400 }
      );
    }

    /*
     * ------------------------------------------------
     * STYLIST / SERVICE RELATIONSHIP
     * ------------------------------------------------
     */

    const {
      data: relationship,
      error: relationshipError,
    } = await s
      .from("stylist_services")
      .select("stylist_id")
      .eq("stylist_id", stylistId)
      .eq("service_id", serviceId)
      .maybeSingle();

    if (relationshipError) {
      throw relationshipError;
    }

    if (!relationship) {
      return NextResponse.json(
        {
          error:
            "This stylist does not provide the selected service.",
        },
        { status: 400 }
      );
    }

    /*
     * ------------------------------------------------
     * TIME
     * ------------------------------------------------
     */

    const start = new Date(startTime);

    if (Number.isNaN(start.getTime())) {
      return NextResponse.json(
        {
          error:
            "Invalid appointment date or time.",
        },
        { status: 400 }
      );
    }

    const end = new Date(
      start.getTime() +
        serviceDurationMinutes * 60 * 1000
    );

    /*
     * ------------------------------------------------
     * WORKING HOURS
     * ------------------------------------------------
     */

    const dayOfWeek = indiaWeekday(start);
    const appointmentStartMinutes =
      indiaMinutes(start);
    const appointmentEndMinutes =
      indiaMinutes(end);

    const {
      data: workingHours,
      error: workingHoursError,
    } = await s
      .from("working_hours")
      .select(
        "start_time,end_time"
      )
      .eq("stylist_id", stylistId)
      .eq("day_of_week", dayOfWeek);

    if (workingHoursError) {
      throw workingHoursError;
    }

    if (!workingHours?.length) {
      return NextResponse.json(
        {
          error:
            "The stylist is not working on this day.",
        },
        { status: 409 }
      );
    }

    const fitsWorkingHours =
      workingHours.some((window: any) => {
        const startParts =
          String(window.start_time)
            .slice(0, 5)
            .split(":");

        const endParts =
          String(window.end_time)
            .slice(0, 5)
            .split(":");

        const openMinutes =
          Number(startParts[0]) * 60 +
          Number(startParts[1]);

        const closeMinutes =
          Number(endParts[0]) * 60 +
          Number(endParts[1]);

        return (
          appointmentStartMinutes >=
            openMinutes &&
          appointmentEndMinutes <=
            closeMinutes
        );
      });

    if (!fitsWorkingHours) {
      return NextResponse.json(
        {
          error:
            "This appointment falls outside the stylist's working hours.",
        },
        { status: 409 }
      );
    }

    /*
     * ------------------------------------------------
     * BLOCKED PERIODS
     * ------------------------------------------------
     */

    const {
      data: blockedPeriods,
      error: blockedError,
    } = await s
      .from("blocked_periods")
      .select(
        "id,start_time,end_time,reason"
      )
      .or(
        `stylist_id.eq.${stylistId},stylist_id.is.null`
      )
      .lt("start_time", end.toISOString())
      .gt("end_time", start.toISOString());

    if (blockedError) {
      throw blockedError;
    }

    if (
      blockedPeriods &&
      blockedPeriods.length > 0
    ) {
      return NextResponse.json(
        {
          error:
            "That period is blocked for this stylist.",
        },
        { status: 409 }
      );
    }

    /*
     * ------------------------------------------------
     * APPOINTMENT CONFLICT
     * ------------------------------------------------
     */

    const {
      data: conflicts,
      error: conflictError,
    } = await s
      .from("appointments")
      .select(
        "id,start_time,end_time,status"
      )
      .eq("stylist_id", stylistId)
      .eq("status", "confirmed")
      .lt(
        "start_time",
        end.toISOString()
      )
      .gt(
        "end_time",
        start.toISOString()
      )
      .limit(1);

    if (conflictError) {
      throw conflictError;
    }

    if (
      conflicts &&
      conflicts.length > 0
    ) {
      return NextResponse.json(
        {
          error:
            "This stylist is already booked during that time.",
        },
        { status: 409 }
      );
    }

    /*
     * ------------------------------------------------
     * CREATE WALK-IN APPOINTMENT
     * ------------------------------------------------
     */

    const {
      data: appointment,
      error: appointmentError,
    } = await s
      .from("appointments")
      .insert({
        customer_id: customerId,

        walk_in_customer_name:
          customerId
            ? null
            : customerName,

        walk_in_customer_email:
          customerId
            ? null
            : customerEmail,

        service_id: serviceId,
        stylist_id: stylistId,

        start_time:
          start.toISOString(),

        end_time:
          end.toISOString(),

        base_price:
          servicePrice,

        discount_amount: 0,

        price: requestedPrice,

        booking_source: "walk_in",

        status,
      })
      .select()
      .single();

    if (appointmentError) {
      if (
        appointmentError.code ===
        "23P01"
      ) {
        return NextResponse.json(
          {
            error:
              "This stylist is already booked during that time.",
          },
          { status: 409 }
        );
      }

      throw appointmentError;
    }

    /*
     * ------------------------------------------------
     * AUDIT LOG
     * ------------------------------------------------
     */

    await s.from("audit_logs").insert({
      admin_id: user.id,
      action: "create",
      entity: "appointments",
      entity_id: appointment.id,
      old_data: null,
      new_data: appointment,
    });

    return NextResponse.json({
      ok: true,
      appointment,
      customer: {
        id: customerId,
        name: customerName,
        email: customerEmail,
      },
    });
  } catch (e: any) {
    console.error(
      "Admin walk-in appointment error:",
      e
    );

    return NextResponse.json(
      {
        error:
          e?.message ||
          "Unable to create walk-in appointment.",
      },
      { status: 400 }
    );
  }
}
