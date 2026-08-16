import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import {
  ArrowUpRight,
  CalendarCheck,
  Clock3,
  Users,
  Scissors,
  type LucideIcon,
} from "lucide-react";


export default async function Admin() {
  const { s } = await requireAdmin();

   const now = new Date();

  const salonParts = new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ).formatToParts(now);

  const year = Number(
    salonParts.find(
      (part) => part.type === "year"
    )?.value
  );

  const month = Number(
    salonParts.find(
      (part) => part.type === "month"
    )?.value
  );

  const day = Number(
    salonParts.find(
      (part) => part.type === "day"
    )?.value
  );

  const start = new Date(
    Date.UTC(
      year,
      month - 1,
      day,
      -5,
      -30,
      0,
      0
    )
  );

  const end = new Date(
    Date.UTC(
      year,
      month - 1,
      day + 1,
      -5,
      -30,
      0,
      0
    )
  );

  const [
    { count: today },
    { count: customers },
    { count: services },
    { count: stylists },
    { data: upcoming },
  ] = await Promise.all([
    s
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .gte("start_time", start.toISOString())
      .lt("start_time", end.toISOString()),

    s
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "customer"),

    s
      .from("services")
      .select("*", { count: "exact", head: true })
      .eq("active", true),

    s
      .from("stylists")
      .select("*", { count: "exact", head: true })
      .eq("active", true),

    s
      .from("appointments")
      .select(
        "id,start_time,status,services(name),stylists(name),profiles(name)"
      )
      .eq("status", "confirmed")
      .gte("start_time", now.toISOString())
      .order("start_time")
      .limit(8),
  ]);

      const stats: [number, string, LucideIcon][] = [
    [today ?? 0, "Appointments today", CalendarCheck],
    [customers ?? 0, "Customers", Users],
    [services ?? 0, "Active services", Scissors],
    [stylists ?? 0, "Active stylists", Users],
  ];

const currentDate = now;
  const dayName = currentDate.toLocaleDateString("en-IN", {
    weekday: "long",
  });

  const hour = currentDate.getHours();

  const greeting =
    hour >= 5 && hour < 12
      ? "Good morning."
      : hour >= 12 && hour < 17
        ? "Good afternoon."
        : hour >= 17 && hour < 21
          ? "Good evening."
          : "Good night.";

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>



         <p className="text-xs font-semibold uppercase tracking-[.25em] text-neutral-400">
  {dayName} · Dashboard
</p>

<h1 className="mt-2 text-4xl font-semibold tracking-tight">
  {greeting}
</h1>

          <p className="mt-2 text-neutral-500">
            Here’s what is happening at your salon.
          </p>
        </div>

        <Link
          href="/admin/appointments"
          className="inline-flex items-center rounded-full bg-neutral-900 px-5 py-3 text-sm text-white"
        >
          Manage appointments
          <ArrowUpRight className="ml-2" size={16} />
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(([value, label, Icon]) => (
          <div
            key={label}
            className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100">
                <Icon size={18} />
              </span>

              <span className="text-xs text-emerald-600">
                Live
              </span>
            </div>

            <p className="mt-6 text-3xl font-semibold">
              {value}
            </p>

            <p className="mt-1 text-sm text-neutral-500">
              {label}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_.6fr]">
        <section className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">
                Upcoming
              </h2>

              <p className="text-sm text-neutral-500">
                Next confirmed visits
              </p>
            </div>

            <Clock3 size={20} />
          </div>

          <div className="mt-6 space-y-2">
            {(upcoming ?? []).map((appointment: any) => (
              <div
                key={appointment.id}
                className="flex items-center justify-between rounded-2xl bg-[#f8f5f1] p-4"
              >
                <div>
                  <p className="font-medium">
                    {appointment.profiles?.name}
                  </p>

                  <p className="text-sm text-neutral-500">
                    {appointment.services?.name} ·{" "}
                    {appointment.stylists?.name}
                  </p>
                </div>

                <div className="text-right text-sm">
                  <p className="font-medium">
                    {new Date(
                      appointment.start_time
                    ).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>

                  <p className="text-xs text-neutral-400">
                    {new Date(
                      appointment.start_time
                    ).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </p>
                </div>
              </div>
            ))}

            {!upcoming?.length && (
              <p className="py-10 text-center text-sm text-neutral-500">
                No upcoming appointments.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-3xl bg-neutral-900 p-7 text-white">
          <p className="text-xs uppercase tracking-[.2em] text-white/40">
            Quick actions
          </p>

          <div className="mt-6 space-y-2">
            {[
              ["Add service", "/admin/services"],
              ["Add stylist", "/admin/stylists"],
              ["Block a period", "/admin/availability"],
              ["Create coupon", "/admin/coupons"],
            ].map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-4 text-sm hover:bg-white/5"
              >
                {label}
                <ArrowUpRight size={16} />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
