import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import {
  BarChart3,
  CalendarDays,
  Clock3,
  Users,
  Scissors,
  TicketPercent,
  UserCog,
  type LucideIcon,
} from "lucide-react";

const nav: [string, string, LucideIcon][] = [
  ["Dashboard", "/admin", BarChart3],
  ["Appointments", "/admin/appointments", CalendarDays],
  ["Services", "/admin/services", Scissors],
  ["Stylists", "/admin/stylists", Users],
  ["Availability", "/admin/availability", Clock3],
  ["Customers", "/admin/customers", Users],
];

const ownerNav: [string, string, LucideIcon][] = [
  ["Coupons", "/admin/coupons", TicketPercent],
  ["Admin Management", "/admin/admins", UserCog],
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireAdmin();

  const isOwner = profile?.role === "owner";

  const visibleNav = isOwner
    ? [...nav, ...ownerNav]
    : nav;

  return (
    <div className="min-h-[calc(100vh-73px)] lg:flex">
      <aside className="hidden w-64 shrink-0 border-r border-black/5 bg-white p-5 lg:block">
        <div className="mb-7 px-3">
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-neutral-400">
            Management
          </p>

          <p className="mt-1 font-semibold">
            Salon Control
          </p>
        </div>

        <div className="space-y-1">
          {visibleNav.map(([label, href, Icon]) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm hover:bg-neutral-100"
            >
              <Icon size={17} />
              {label}
            </Link>
          ))}
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        {children}
      </main>
    </div>
  );
}
