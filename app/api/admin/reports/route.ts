import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

const TZ = "Asia/Kolkata";

function dateKey(date: Date) {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ).format(date);
}

function weekday(date: Date) {
  return new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone: TZ,
      weekday: "short",
    }
  ).format(date);
}

function todayStart() {
  return new Date(
    `${dateKey(
      new Date()
    )}T00:00:00+05:30`
  );
}

function getRange(
  range: string,
  from?: string,
  to?: string
) {
  const today =
    todayStart();

  if (range === "today") {
    return {
      start: today,
      end: new Date(
        today.getTime() +
          24 * 60 * 60 * 1000
      ),
    };
  }

  if (range === "week") {
    const days = [
      "Sun",
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
      "Sat",
    ];

    const current =
      days.indexOf(
        weekday(today)
      );

    const mondayOffset =
      (current + 6) % 7;

    const start =
      new Date(
        today.getTime() -
          mondayOffset *
            24 *
            60 *
            60 *
            1000
      );

    return {
      start,
      end: new Date(
        start.getTime() +
          7 *
            24 *
            60 *
            60 *
            1000
      ),
    };
  }

  if (range === "year") {
    const year =
      Number(
        dateKey(today).slice(
          0,
          4
        )
      );

    return {
      start: new Date(
        `${year}-01-01T00:00:00+05:30`
      ),
      end: new Date(
        `${year + 1}-01-01T00:00:00+05:30`
      ),
    };
  }

  if (range === "custom") {
    if (!from || !to) {
      throw new Error(
        "Choose both start and end dates."
      );
    }

    const start =
      new Date(
        `${from}T00:00:00+05:30`
      );

    const end =
      new Date(
        `${to}T00:00:00+05:30`
      );

    end.setTime(
      end.getTime() +
        24 *
          60 *
          60 *
          1000
    );

    if (
      Number.isNaN(
        start.getTime()
      ) ||
      Number.isNaN(
        end.getTime()
      ) ||
      end <= start
    ) {
      throw new Error(
        "Invalid date range."
      );
    }

    return {
      start,
      end,
    };
  }

  /*
   * Default = month.
   */
  const current =
    dateKey(today);

  const year =
    current.slice(0, 4);

  const month =
    current.slice(5, 7);

  const start =
    new Date(
      `${year}-${month}-01T00:00:00+05:30`
    );

  const nextMonth =
    month === "12"
      ? `${Number(year) + 1}-01`
      : `${year}-${String(
          Number(month) + 1
        ).padStart(2, "0")}`;

  return {
    start,
    end: new Date(
      `${nextMonth}-01T00:00:00+05:30`
    ),
  };
}

export async function GET(
  req: Request
) {
  try {
  const { s, profile } = await requireAdmin();

if (profile?.role !== "owner") {
  return NextResponse.json(
    {
      error: "Owner access required.",
    },
    {
      status: 403,
    }
  );
}

    const url =
      new URL(req.url);

    const range =
      url.searchParams.get(
        "range"
      ) || "month";

    const from =
      url.searchParams.get(
        "from"
      ) || undefined;

    const to =
      url.searchParams.get(
        "to"
      ) || undefined;

    const {
      start,
      end,
    } = getRange(
      range,
      from,
      to
    );

    const {
      data: appointments,
      error,
    } = await s
      .from("appointments")
      .select(
        `
        id,
        start_time,
        price,
        base_price,
        discount_amount,
        coupon_code,
        booking_source,
        status,
        customer_id,
        services(name),
        stylists(id,name),
        profiles!appointments_customer_id_fkey(name,phone)
        `
      )
      .eq(
        "status",
        "completed"
      )
      .gte(
        "start_time",
        start.toISOString()
      )
      .lt(
        "start_time",
        end.toISOString()
      )
      .order(
        "start_time",
        {
          ascending: true,
        }
      );

    if (error) {
      throw error;
    }

    const rows =
      appointments || [];

    /*
     * Salon totals.
     *
     * Gross = original/base price.
     * Discounts = coupon/discount amount.
     * Net = actual amount collected.
     *
     * Customer visits intentionally count
     * appointments, not unique people.
     */
    let grossRevenue = 0;
    let discounts = 0;
    let revenue = 0;

    for (const row of rows) {
      grossRevenue +=
        Number(
          row.base_price ??
            row.price ??
            0
        );

      discounts +=
        Number(
          row.discount_amount ||
            0
        );

      revenue +=
        Number(
          row.price || 0
        );
    }

    const stylistMap =
      new Map<
        string,
        any
      >();

    const dailyMap =
      new Map<
        string,
        any
      >();

    const transactions =
      rows.map(
        (row: any) => {
          const stylist =
            Array.isArray(
              row.stylists
            )
              ? row.stylists[0]
              : row.stylists;

          const service =
            Array.isArray(
              row.services
            )
              ? row.services[0]
              : row.services;

          const profile =
            Array.isArray(
              row.profiles
            )
              ? row.profiles[0]
              : row.profiles;

          const stylistId =
            stylist?.id ||
            "unassigned";

          const stylistName =
            stylist?.name ||
            "Unassigned";

          if (
            !stylistMap.has(
              stylistId
            )
          ) {
            stylistMap.set(
              stylistId,
              {
                stylistId,
                stylistName,
                customers: 0,
                appointments: 0,
                revenue: 0,
                discounts: 0,
              }
            );
          }

          const stylistStats =
            stylistMap.get(
              stylistId
            );

          stylistStats.customers +=
            1;

          stylistStats.appointments +=
            1;

          stylistStats.revenue +=
            Number(
              row.price || 0
            );

          stylistStats.discounts +=
            Number(
              row.discount_amount ||
                0
            );

          const day =
            dateKey(
              new Date(
                row.start_time
              )
            );

          if (
            !dailyMap.has(day)
          ) {
            dailyMap.set(
              day,
              {
                date: day,
                customers: 0,
                appointments: 0,
                revenue: 0,
                discounts: 0,
              }
            );
          }

          const daily =
            dailyMap.get(day);

          daily.customers +=
            1;

          daily.appointments +=
            1;

          daily.revenue +=
            Number(
              row.price || 0
            );

          daily.discounts +=
            Number(
              row.discount_amount ||
                0
            );

          return {
            id: row.id,
            date:
              row.start_time,
            customer:
              profile?.name ||
              "Walk-in / Guest",
            phone:
              profile?.phone ||
              "",
            stylist:
              stylistName,
            service:
              service?.name ||
              "Service",
            basePrice:
              Number(
                row.base_price ??
                  row.price ??
                  0
              ),
            discount:
              Number(
                row.discount_amount ||
                  0
              ),
            revenue:
              Number(
                row.price || 0
              ),
            coupon:
              row.coupon_code ||
              "",
            bookingSource:
              row.booking_source ||
              "",
            status:
              row.status,
          };
        }
      );

    return NextResponse.json({
      summary: {
        revenue,
        grossRevenue,
        discounts,
        customers:
          rows.length,
        appointments:
          rows.length,
      },

      stylists:
        Array.from(
          stylistMap.values()
        ),

      daily:
        Array.from(
          dailyMap.values()
        ).sort(
          (a, b) =>
            a.date.localeCompare(
              b.date
            )
        ),

      transactions,
    });
  } catch (e: any) {
    const message =
      e?.message ||
      "Unable to load report.";

    return NextResponse.json(
      {
        error: message,
      },
      {
        status:
          message ===
          "UNAUTHENTICATED"
            ? 401
            : message ===
                "FORBIDDEN"
              ? 403
              : 400,
      }
    );
  }
}
