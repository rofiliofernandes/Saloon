import { createClient } from "@/lib/supabase/server";

export default async function Stylists() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("stylists")
    .select("*")
    .eq("active", true)
    .is("deleted_at", null)
    .order("name");

  return (
    <main className="mx-auto max-w-7xl px-6 py-16">
      <p className="text-sm uppercase tracking-widest text-neutral-500">
        Our team
      </p>

      <h1 className="mt-2 text-4xl font-semibold">
        Stylists
      </h1>

      <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {(data ?? []).map((x: any) => (
          <article
            key={x.id}
            className="rounded-3xl border bg-white p-6"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 text-xl">
              {x.name[0]}
            </div>

            <h2 className="mt-5 text-xl font-semibold">
              {x.name}
            </h2>

            <p className="mt-2 text-sm text-neutral-500">
              {x.category}
            </p>

            <p className="mt-4 text-neutral-600">
              {x.bio}
            </p>
          </article>
        ))}
      </div>
    </main>
  );
}
