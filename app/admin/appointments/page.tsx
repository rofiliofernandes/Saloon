import { createClient } from "@/lib/supabase/server";

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
      "id,start_time,end_time,price,status,services(name),stylists(name)"
    )
    .eq("customer_id", user.id)
    .order("start_time", { ascending: true });

  const now = Date.now();

  const upcoming = (data ?? []).filter(
    (a: any) => new Date(a.start_time).getTime() >= now
  );

  const past = (data ?? [])
    .filter((a: any) => new Date(a.start_time).getTime() < now)
    .sort(
      (a: any, b: any) =>
        new Date(b.start_time).getTime() -
        new Date(a.start_time).getTime()
    );

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="text-4xl font-semibold">My appointments</h1>

      {/* UPCOMING */}
      <section className="mt-8">
        <h2 className="text-xl font-semibold">Upcoming</h2>

        <div className="mt-4 space-y-4">
          {upcoming.map((a: any) => (
            <div
              key={a.id}
              className="rounded-2xl border bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col justify-between gap-3 sm:flex-row">
                <div>
                  <p className="text-lg font-semibold">
                    {a.services?.name}
                  </p>

                  <p className="mt-1 text-sm text-neutral-600">
                    Stylist: {a.stylists?.name || "Not assigned"}
                  </p>

                  <p className="mt-1 text-sm text-neutral-600">
                    {formatDate(a.start_time)} ·{" "}
                    {formatTime(a.start_time)}
                  </p>
                </div>

                <div className="sm:text-right">
                  <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                    {a.status}
                  </span>

                  <p className="mt-2 font-semibold">
                    ₹{a.price}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {!upcoming.length && (
            <p className="rounded-2xl border bg-white px-5 py-10 text-center text-sm text-neutral-500">
              You have no upcoming appointments.
            </p>
          )}
        </div>
      </section>

      {/* PAST */}
      <section className="mt-12">
        <h2 className="text-xl font-semibold">Past appointments</h2>

        <div className="mt-4 space-y-4">
          {past.map((a: any) => (
            <div
              key={a.id}
              className="rounded-2xl border bg-white p-5"
            >
              <div className="flex flex-col justify-between gap-3 sm:flex-row">
                <div>
                  <p className="font-semibold">
                    {a.services?.name}
                  </p>

                  <p className="mt-1 text-sm text-neutral-500">
                    Stylist: {a.stylists?.name || "Not assigned"}
                  </p>

                  <p className="mt-1 text-sm text-neutral-500">
                    {formatDate(a.start_time)} ·{" "}
                    {formatTime(a.start_time)}
                  </p>
                </div>

                <div className="sm:text-right">
                  <span className="inline-flex rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-600">
                    {a.status}
                  </span>

                  <p className="mt-2 text-sm font-medium">
                    ₹{a.price}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {!past.length && (
            <p className="text-sm text-neutral-500">
              No past appointments.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
