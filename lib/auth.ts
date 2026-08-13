import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function requireUser() {
  const s = await createClient();

  const {
    data: { user },
  } = await s.auth.getUser();

  if (!user) {
    throw new Error("UNAUTHENTICATED");
  }

  return {
    s,
    user,
  };
}

export async function requireAdmin() {
  const { s, user } = await requireUser();

  /*
   * Use the server-side admin client to read the user's
   * profile. This avoids profiles RLS blocking legitimate
   * admin/owner requests.
   */
  const adminClient = createAdminClient();

  const {
    data: profile,
    error,
  } = await adminClient
    .from("profiles")
    .select("id,role,name,email")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (
    profile?.role !== "admin" &&
    profile?.role !== "owner"
  ) {
    throw new Error("FORBIDDEN");
  }

  return {
    s,
    user,
    profile,
  };
}

export async function requireOwner() {
  const { s, user } = await requireUser();

  /*
   * Owners need to be checked against profiles, but
   * profiles is protected by RLS. Use the server-side
   * admin client for this authorization lookup.
   */
  const adminClient = createAdminClient();

  const {
    data: profile,
    error,
  } = await adminClient
    .from("profiles")
    .select("id,role,name,email")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (profile?.role !== "owner") {
    throw new Error("FORBIDDEN");
  }

  return {
    s,
    user,
    profile,
  };
}
