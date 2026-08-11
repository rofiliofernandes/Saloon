import { createClient } from "@/lib/supabase/server";
import { CancelAppointmentButton } from "@/components/cancel-appointment-button";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
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
      return "bg-neutral-100 text-neutral-600";
    default:
      return "bg-neutral-100 text-neutral-600";
  }
}

export default async function Appointments() {
  const s = await createClient();

  const {
    data: { user },
  } = await s.auth.getUser();

  if (!user) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-20">
        <h1 className="text-3xl font-semibold">Please sign in.</h1>
      </main>
    );
  }

  const { data } = await s
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
        status,
        cancelled_by,
        cancelled_at,
        cancellation_reason,
        completed_at,
        services(name),
        stylists(name)
      `
    )
    .eq("customer_id", user.id)
    .order("start_time", { ascending: true });

  const appointments = data ?? [];
  const now = Date.now();

  const upcoming = appointments
    .filter(
      (a: any) =>
        new Date(a.start_time).getTime() >= now &&
        a.status === "confirmed"
    )
    .sort(
      (a: any, b: any) =>
        new Date(a.start_time).getTime() -
        new Date(b.start_time).getTime()
    );

  const history = appointments
    .filter(
      (a: any) =>
        !(
          new Date(a.start_time).getTime() >= now &&
          a.status === "confirmed"
        )
    )
    .sort(
      (a: any, b: any) =>
        new Date(b.start_time).getTime() -
        new Date(a.start_time).getTime()
    );

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <p className="text-sm uppercase tracking-widest text-neutral-500">
        Your visits
      </p>

      <h1 className="mt-2 text-4xl font-semibold">
        My appointments
      </h1>

      <p className="mt-2 text-neutral-500">
        Manage your upcoming visits and view your appointment history.
      </p>

      {/* NEXT VISITS */}

      <section className="mt-10">
        <h2 className="text-xl font-semibold">
          Next visits
        </h2>

        <div className="mt-4 space-y-4">
          {upcoming.map((a: any) => {
            const start = new Date(a.start_time).getTime();
            const canCancel = start - now >= 60 * 60 * 1000;

            return (
              <div
                key={a.id}
                className="rounded-3xl border bg-white p-6 shadow-sm"
              >
                <div className="flex flex-col justify-between gap-5 sm:flex-row">
                  <div>
                    <p className="text-xl font-semibold">
                      {a.services?.name}
                    </p>

                    <p className="mt-2 text-sm text-neutral-600">
                      Stylist:{" "}
                      {a.stylists?.name || "Not assigned"}
                    </p>

                    <p className="mt-1 text-sm text-neutral-600">
                      {formatDate(a.start_time)} ·{" "}
                      {formatTime(a.start_time)}
                    </p>
                  </div>

                  <div className="sm:text-right">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusClass(
                        a.status
                      )}`}
                    >
                      {statusLabel(a.status)}
                    </span>

                    <p className="mt-3 text-lg font-semibold">
                      ₹{a.price}
                    </p>

                    {a.discount_amount > 0 && (
                      <p className="mt-1 text-xs text-neutral-500">
                        ₹{a.discount_amount} discount
                      </p>
                    )}
                  </div>
                </div>

                {a.coupon_code && (
                  <div className="mt-5 rounded-2xl bg-neutral-50 px-4 py-3 text-sm">
                    Coupon used:{" "}
                    <span className="font-medium">
                      {a.coupon_code}
                    </span>
                  </div>
                )}

                {canCancel ? (
                  <CancelAppointmentButton
                    appointmentId={a.id}
                  />
                ) : (
                  <p className="mt-5 text-sm text-neutral-500">
                    Cancellation is unavailable within 1 hour
                    of the appointment.
                  </p>
                )}
              </div>
            );
          })}

          {!upcoming.length && (
            <div className="rounded-3xl border bg-white px-6 py-12 text-center">
              <p className="font-medium">
                No upcoming visits
              </p>

              <p className="mt-1 text-sm text-neutral-500">
                Your next appointment will appear here.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* HISTORY */}

      <section className="mt-12">
        <h2 className="text-xl font-semibold">
          Appointment history
        </h2>

        <div className="mt-4 space-y-4">
          {history.map((a: any) => (
            <div
              key={a.id}
              className="rounded-2xl border bg-white p-5"
            >
              <div className="flex flex-col justify-between gap-4 sm:flex-row">
                <div>
                  <p className="font-semibold">
                    {a.services?.name}
                  </p>

                  <p className="mt-1 text-sm text-neutral-500">
                    Stylist:{" "}
                    {a.stylists?.name || "Not assigned"}
                  </p>

                  <p className="mt-1 text-sm text-neutral-500">
                    {formatDate(a.start_time)} ·{" "}
                    {formatTime(a.start_time)}
                  </p>
                </div>

                <div className="sm:text-right">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusClass(
                      a.status
                    )}`}
                  >
                    {statusLabel(a.status)}
                  </span>

                  <p className="mt-2 font-medium">
                    ₹{a.price}
                  </p>
                </div>
              </div>

              {a.status === "cancelled" && (
                <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  <p>
                    Cancelled by:{" "}
                    <span className="font-medium">
                      {a.cancelled_by === "admin"
                        ? "Salon"
                        : "You"}
                    </span>
                  </p>

                  {a.cancellation_reason && (
                    <p className="mt-1">
                      Reason: {a.cancellation_reason}
                    </p>
                  )}
                </div>
              )}

              {a.coupon_code && (
                <p className="mt-3 text-xs text-neutral-500">
                  Coupon: {a.coupon_code} · Discount: ₹
                  {a.discount_amount}
                </p>
              )}
            </div>
          ))}

          {!history.length && (
            <p className="text-sm text-neutral-500">
              No appointment history yet.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
