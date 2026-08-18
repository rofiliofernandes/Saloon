import { createClient } from "@/lib/supabase/server";
import StylistGrid from "@/components/stylist-grid";

type Stylist = {
  id: string;
  name: string;
  bio?: string | null;
  category: string;
  image_url?: string | null;
};

export default async function Stylists() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("stylists")
    .select("id,name,bio,category,image_url")
    .eq("active", true)
    .is("deleted_at", null)
    .order("name");

  return (
    <main className="mx-auto max-w-7xl px-6 py-12 sm:py-16">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-neutral-500">Our team</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">Meet our stylists</h1>
        <p className="mt-3 text-sm leading-6 text-neutral-500 sm:text-base">
          Meet the people behind your appointment. Tap a card to expand it and read more about your stylist.
        </p>
      </div>

      <StylistGrid stylists={(data ?? []) as Stylist[]} />
    </main>
  );
}
