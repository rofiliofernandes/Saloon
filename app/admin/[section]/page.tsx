import { requireAdmin } from "@/lib/auth";
import { AdminEditor } from "@/components/admin-editor";
import { AdminServiceCatalogue } from "@/components/admin-service-catalogue";
import AdminAvailability from "@/components/admin-availability";
import AdminCoupons from "@/components/admin-coupons";
import AdminCompensationCoupons from "@/components/admin-compensation-coupons";
import AdminReports from "@/components/admin-reports";

export default async function Section({
  params,
}: {
  params: Promise<{
    section: string;
  }>;
}) {
  await requireAdmin();

  const { section } = await params;

  if (section === "availability") {
    return (
      <main className="mx-auto max-w-7xl px-6 py-12">
        <p className="text-sm uppercase tracking-widest text-neutral-500">
          Admin
        </p>

        <h1 className="mt-2 text-4xl font-semibold">
          Availability
        </h1>

        <AdminAvailability />
      </main>
    );
  }

  if (section === "coupons") {
    return (
      <main className="mx-auto max-w-7xl px-6 py-12">
        <p className="text-sm uppercase tracking-widest text-neutral-500">
          Admin
        </p>

        <h1 className="mt-2 text-4xl font-semibold">
          Coupons
        </h1>

        <AdminCoupons />

        <AdminCompensationCoupons />
      </main>
    );
  }

  if (
    section === "reports" ||
    section === "revenue" ||
    section === "business"
  ) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-12">
        <p className="text-sm uppercase tracking-widest text-neutral-500">
          Admin
        </p>

        <h1 className="mt-2 text-4xl font-semibold">
          Business Reports
        </h1>

        <AdminReports />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <p className="text-sm uppercase tracking-widest text-neutral-500">
        Admin
      </p>

      <h1 className="mt-2 text-4xl font-semibold capitalize">
        {section}
      </h1>

      {section === "services" ? (
        <AdminServiceCatalogue />
      ) : (
        <AdminEditor section={section} />
      )}
    </main>
  );
}
