import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  const { data: profile, error: profileError } = user
    ? await supabase
        .from("profiles")
        .select("id,email,role")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null, error: null };

  const {
    data: services,
    error: servicesError,
  } = await supabase
    .from("services")
    .select("id,name,active,deleted_at")
    .order("name");

  const {
    data: stylists,
    error: stylistsError,
  } = await supabase
    .from("stylists")
    .select("id,name,active,deleted_at")
    .order("name");

  return NextResponse.json({
    user: user
      ? {
          id: user.id,
          email: user.email,
        }
      : null,

    userError: userError?.message ?? null,

    profile,
    profileError: profileError
      ? {
          message: profileError.message,
          code: profileError.code,
          details: profileError.details,
          hint: profileError.hint,
        }
      : null,

    services,
    servicesError: servicesError
      ? {
          message: servicesError.message,
          code: servicesError.code,
          details: servicesError.details,
          hint: servicesError.hint,
        }
      : null,

    stylists,
    stylistsError: stylistsError
      ? {
          message: stylistsError.message,
          code: stylistsError.code,
          details: stylistsError.details,
          hint: stylistsError.hint,
        }
      : null,
  });
}
