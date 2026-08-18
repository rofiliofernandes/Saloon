import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BookingForm from "@/components/booking-form";

export default async function BookPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/book");
  }

  return <BookingForm />;
}
