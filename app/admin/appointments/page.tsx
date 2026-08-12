import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AdminAppointmentActions from "@/components/admin-appointment-actions";
import AdminWalkIn from "@/components/admin-walk-in";

const SALON_TIME_ZONE = "Asia/Kolkata";

function getIndiaDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SALON_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value || "";

  return `${get("year")}-${get("month")}-${get("day")}`;
}

function isValidDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function shiftDate(value: string, days: number) {
  const [year, month, day] = value
    .split("-")
    .map(Number);

  const date = new Date(
    Date.UTC(year, month - 1, day)
  );

  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}

function formatDateHeading(value: string) {
  return new Date(
    `${value}T12:00:00+05:30`
  ).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: SALON_TIME_ZONE,
  });
}

function formatShortDate(value: string) {
  return new Date(
    `${value}T12:00:00+05:30`
  ).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    timeZone: SALON_TIME_ZONE,
  });
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString(
    "en-IN",
    {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: SALON_TIME_ZONE,
    }
  );
}

function statusLabel(status: string) {
  switch (status) {
    case "confirmed":
      return "Confirmed";

    case "completed":
      return "Completed";

    case "cancelled":
      return "Cancelled";

    case "no_show":
      return "No-show";

    default:
      return status;
  }
}

function statusClass(status: string) {
  switch (status) {
    case "confirmed":
      return "bg-emerald-50 text-emerald-700";

    case "completed":
      return "bg-blue-50 text-blue-700";

    case "cancelled":
      return "bg-red-50 text-red-700";

    case "no_show":
      return "bg-amber-50 text-amber-700";

    default:
      return "bg-neutral-100 text-neutral-600";
  }
}

type Appointment = {
  id: string;
  start_time: string;
  end_time: string;
  price: number;
  base_price?: number;
  discount_amount?: number;
  coupon_code?: string | null;
  booking_source?: string | null;
  status: string;
  cancelled_by?: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  completed_at?: string | null;
  created_at?: string;
  services?: {
    name?: string;
  } | null;
  stylists?: {
    id?: string;
    name?: string;
  } | null;
  profiles?: {
    name?: string;
  } | null;
};

type Stylist = {
  id: string;
  name: string;
};

export default async function AdminAppointments({
  searchParams,
}: {
  searchParams: Promise<{
    date?: string;
  }>;
}) {
  const params = await searchParams;

  const today = getIndiaDate();

  const selectedDate =
    params.date && isValidDate(params.date)
      ? params.date
      : today;

  /*
   * --------------------------------------------------
   * DATE RANGE
   * --------------------------------------------------
   *
   * The salon operates in India.
   */

  const dayStart = new Date(
    `${selectedDate}T00:00:00+05:30`
  );

  const nextDay = shiftDate(selectedDate, 1);

  const dayEnd = new Date(
    `${nextDay}T00:00:00+05:30`
  );

  const s = await createClient();

  /*
   * --------------------------------------------------
   * LOAD APPOINTMENTS + STYLISTS
   * --------------------------------------------------
   */

  const [
    { data: appointments, error },
    { data: stylists, error: stylistsError },
  ] = await Promise.all([
    s
      .from("appointments")
      .select(
        `
        id,
        start_time,
        end_time,
        price,
        base_price,
        discount_amount,
        coupon_code,
        booking_source,
        status,
        cancelled_by,
        cancelled_at,
        cancellation_reason,
        completed_at,
        created_at,
        services(name),
        stylists(id,name),
        profiles(name)
        `
      )
      .gte(
        "start_time",
        dayStart.toISOString()
      )
      .lt(
        "start_time",
        dayEnd.toISOString()
      )
      .order("start_time", {
        ascending: true,
      }),

    s
      .from("stylists")
      .select("id,name")
      .eq("active", true)
      .is("deleted_at", null)
      .order("name", {
        ascending: true,
      }),
  ]);

  if (error || stylistsError) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-16">
        <p className="text-sm uppercase tracking-widest text-neutral-500">
          Admin
        </p>

        <h1 className="mt-2 text-4xl font-semibold">
          Appointments
        </h1>

        <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          Unable to load appointments:{" "}
          {error?.message ||
            stylistsError?.message ||
            "Unknown error"}
        </div>
      </main>
    );
  }

  const rows =
    (appointments || []) as Appointment[];

  const staff =
    (stylists || []) as Stylist[];

  /*
   * --------------------------------------------------
   * GROUP APPOINTMENTS BY STYLIST
   * --------------------------------------------------
   */

  const grouped = new Map<
    string,
    Appointment[]
  >();

  for (const stylist of staff) {
    grouped.set(stylist.id, []);
  }

  const unassigned: Appointment[] = [];

  for (const appointment of rows) {
    const stylistId =
      appointment.stylists?.id;

    if (!stylistId) {
      unassigned.push(appointment);
      continue;
    }

    if (!grouped.has(stylistId)) {
      grouped.set(stylistId, []);
    }

    grouped.get(stylistId)!.push(
      appointment
    );
  }

  /*
   * --------------------------------------------------
   * SUMMARY
   * --------------------------------------------------
   */

  const nonCancelled = rows.filter(
    (a) => a.status !== "cancelled"
  );

  const confirmed = rows.filter(
    (a) => a.status === "confirmed"
  ).length;

  const completed = rows.filter(
    (a) => a.status === "completed"
  ).length;

  const cancelled = rows.filter(
    (a) => a.status === "cancelled"
  ).length;

  const scheduledValue =
    nonCancelled.reduce(
      (total, appointment) =>
        total + Number(appointment.price || 0),
      0
    );

  /*
   * --------------------------------------------------
   * DATE NAVIGATION
   * --------------------------------------------------
   */

  const yesterday = shiftDate(
    selectedDate,
    -1
  );

  const tomorrow = shiftDate(
    selectedDate,
    1
  );

  const isToday =
    selectedDate === today;

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      {/* HEADER */}

      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-widest text-neutral-500">
            Admin
          </p>

          <h1 className="mt-2 text-4xl font-semibold">
            Appointments
          </h1>

          <p className="mt-2 text-neutral-500">
            View the salon schedule by stylist and date.
          </p>
        </div>

        <AdminWalkIn />
      </div>

      {/* DATE NAVIGATION */}

      <section className="mt-8 rounded-3xl border border-black/10 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <Link
              href={`/admin/appointments?date=${yesterday}`}
              className="rounded-full border px-4 py-2 text-sm hover:bg-neutral-50"
            >
              ← {formatShortDate(yesterday)}
            </Link>

            <Link
              href={`/admin/appointments?date=${today}`}
              className={
                isToday
                  ? "rounded-full bg-neutral-900 px-5 py-2 text-sm font-medium text-white"
                  : "rounded-full border px-5 py-2 text-sm hover:bg-neutral-50"
              }
            >
              {isToday
                ? "Today"
                : `Today · ${formatShortDate(today)}`}
            </Link>

            <Link
              href={`/admin/appointments?date=${tomorrow}`}
              className="rounded-full border px-4 py-2 text-sm hover:bg-neutral-50"
            >
              {formatShortDate(tomorrow)} →
            </Link>
          </div>

          <form
            method="get"
            className="flex items-center gap-3"
          >
            <label className="text-sm text-neutral-500">
              Jump to date
            </label>

            <input
              type="date"
              name="date"
              defaultValue={selectedDate}
              className="rounded-xl border px-3 py-2 text-sm"
            />

            <button
              type="submit"
              className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
            >
              View
            </button>
          </form>
        </div>
      </section>

      {/* DATE TITLE */}

      <div className="mt-8">
        <h2 className="text-2xl font-semibold">
          {isToday
            ? "Today"
            : formatDateHeading(selectedDate)}
        </h2>

        <p className="mt-1 text-sm text-neutral-500">
          {formatDateHeading(selectedDate)}
        </p>
      </div>

      {/* SUMMARY */}

      <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-black/10 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-neutral-400">
            Appointments
          </p>

          <p className="mt-1 text-2xl font-semibold">
            {rows.length}
          </p>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-neutral-400">
            Confirmed
          </p>

          <p className="mt-1 text-2xl font-semibold">
            {confirmed}
          </p>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-neutral-400">
            Completed
          </p>

          <p className="mt-1 text-2xl font-semibold">
            {completed}
          </p>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-neutral-400">
            Scheduled value
          </p>

          <p className="mt-1 text-2xl font-semibold">
            ₹{scheduledValue.toFixed(2)}
          </p>

          {cancelled > 0 && (
            <p className="mt-1 text-xs text-red-500">
              {cancelled} cancelled
            </p>
          )}
        </div>
      </section>

      {/* STAFF SCHEDULE */}

      <section className="mt-8 space-y-5">
        {staff.map((stylist) => {
          const stylistAppointments =
            grouped.get(stylist.id) || [];

          return (
            <div
              key={stylist.id}
              className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-sm"
            >
              {/* STYLIST HEADER */}

              <div className="flex flex-col gap-2 border-b border-black/5 bg-neutral-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold">
                    {stylist.name}
                  </h3>

                  <p className="text-sm text-neutral-500">
                    {stylistAppointments.length ===
                    1
                      ? "1 appointment"
                      : `${stylistAppointments.length} appointments`}
                  </p>
                </div>

                {stylistAppointments.length >
                  0 && (
                  <p className="text-sm font-medium text-neutral-700">
                    ₹
                    {stylistAppointments
                      .filter(
                        (a) =>
                          a.status !==
                          "cancelled"
                      )
                      .reduce(
                        (sum, a) =>
                          sum +
                          Number(
                            a.price || 0
                          ),
                        0
                      )
                      .toFixed(2)}
                  </p>
                )}
              </div>

              {/* APPOINTMENTS */}

              {stylistAppointments.length >
              0 ? (
                <div className="divide-y divide-black/5">
                  {stylistAppointments.map(
                    (appointment) => (
                      <div
                        key={appointment.id}
                        className={
                          appointment.status ===
                          "cancelled"
                            ? "bg-red-50/30 px-5 py-4"
                            : "px-5 py-4"
                        }
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                          <div className="flex min-w-0 items-start gap-5">
                            {/* TIME */}

                            <div className="w-24 shrink-0">
                              <p className="text-base font-semibold">
                                {formatTime(
                                  appointment.start_time
                                )}
                              </p>

                              <p className="text-xs text-neutral-400">
                                {formatTime(
                                  appointment.end_time
                                )}
                              </p>
                            </div>

                            {/* CUSTOMER */}

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-semibold">
                                  {appointment
                                    .profiles
                                    ?.name ||
                                    "Unknown customer"}
                                </p>

                                <span
                                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(
                                    appointment.status
                                  )}`}
                                >
                                  {statusLabel(
                                    appointment.status
                                  )}
                                </span>
                              </div>

                              <p className="mt-1 text-sm text-neutral-600">
                                {appointment
                                  .services
                                  ?.name ||
                                  "Unknown service"}
                              </p>

                              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-400">
                                <span>
                                  ₹
                                  {Number(
                                    appointment.price ||
                                      0
                                  ).toFixed(2)}
                                </span>

                                {appointment.booking_source && (
                                  <span>
                                    Source:{" "}
                                    {appointment.booking_source.replace(
                                      "_",
                                      " "
                                    )}
                                  </span>
                                )}

                                {appointment.coupon_code && (
                                  <span>
                                    Coupon:{" "}
                                    {
                                      appointment.coupon_code
                                    }
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* ACTIONS */}

                          <div className="lg:shrink-0">
                            <AdminAppointmentActions
                              appointmentId={
                                appointment.id
                              }
                              status={
                                appointment.status
                              }
                            />
                          </div>
                        </div>

                        {/* CANCELLED DETAILS */}

                        {appointment.status ===
                          "cancelled" && (
                          <div className="mt-3 rounded-xl border border-red-100 bg-white p-3 text-sm">
                            <p className="font-medium text-red-700">
                              Cancelled by:{" "}
                              {appointment.cancelled_by ===
                              "admin"
                                ? "Admin"
                                : appointment.cancelled_by ===
                                  "customer"
                                ? "Customer"
                                : "Unknown"}
                            </p>

                            {appointment.cancellation_reason && (
                              <p className="mt-1 text-neutral-600">
                                Reason:{" "}
                                {
                                  appointment.cancellation_reason
                                }
                              </p>
                            )}

                            {appointment.cancelled_at && (
                              <p className="mt-1 text-xs text-neutral-400">
                                Cancelled on{" "}
                                {formatTime(
                                  appointment.cancelled_at
                                )}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  )}
                </div>
              ) : (
                <div className="px-5 py-6 text-sm text-neutral-400">
                  No appointments for{" "}
                  {stylist.name} on this date.
                </div>
              )}
            </div>
          );
        })}

        {/* UNASSIGNED */}

        {unassigned.length > 0 && (
          <div className="overflow-hidden rounded-3xl border border-amber-200 bg-amber-50/40">
            <div className="border-b border-amber-100 px-5 py-4">
              <h3 className="font-semibold">
                Unassigned
              </h3>

              <p className="text-sm text-neutral-500">
                {unassigned.length} appointment
                {unassigned.length === 1
                  ? ""
                  : "s"} without a stylist.
              </p>
            </div>

            <div className="divide-y divide-amber-100 bg-white">
              {unassigned.map(
                (appointment) => (
                  <div
                    key={appointment.id}
                    className="px-5 py-4"
                  >
                    <div className="flex items-center gap-5">
                      <div className="w-24 shrink-0">
                        <p className="font-semibold">
                          {formatTime(
                            appointment.start_time
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="font-semibold">
                          {appointment.profiles
                            ?.name ||
                            "Unknown customer"}
                        </p>

                        <p className="text-sm text-neutral-500">
                          {appointment.services
                            ?.name ||
                            "Unknown service"}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {!staff.length && (
          <div className="rounded-3xl border bg-white px-5 py-12 text-center text-sm text-neutral-500">
            No active stylists found.
          </div>
        )}

        {staff.length > 0 &&
          rows.length === 0 && (
            <div className="rounded-3xl border border-dashed bg-white px-5 py-12 text-center">
              <p className="font-medium">
                No appointments on this date.
              </p>

              <p className="mt-1 text-sm text-neutral-500">
                Choose another date above or create
                a walk-in appointment.
              </p>
            </div>
          )}
      </section>
    </main>
  );
}