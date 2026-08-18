import { requireAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminReports from "@/components/admin-reports";

export default async function ReportsPage() {
const { profile } = await requireAdmin();

if (profile?.role !== "owner") {
  redirect("/admin");
}
  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <p className="text-sm uppercase tracking-widest text-neutral-500">
        Admin
      </p>

      <h1 className="mt-2 text-4xl font-semibold">
        Reports
      </h1>

      <AdminReports />
    </main>
  );
}