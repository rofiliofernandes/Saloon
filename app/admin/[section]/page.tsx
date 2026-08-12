import { requireAdmin } from "@/lib/auth";
import { AdminEditor } from "@/components/admin-editor";
import AdminAvailability from "@/components/admin-availability";

export default async function Section({
  params,
}: {
  params: Promise<{ section: string }>;
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

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <p className="text-sm uppercase tracking-widest text-neutral-500">
        Admin
      </p>

      <h1 className="mt-2 text-4xl font-semibold capitalize">
        {section}
      </h1>

      <AdminEditor section={section} />
    </main>
  );
}
