import { createClient } from "@/lib/supabase/server";

export async function requireUser() {
  const s = await createClient();

  const {
    data: { user },
  } = await s.auth.getUser();

  if (!user) {
    throw new Error("UNAUTHENTICATED");
  }

  return { s, user };
}

export async function requireAdmin() {
  const { s, user } = await requireUser();

  const { data: profile, error } = await s
    .from("profiles")
    .select("role,name,email")
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

  const { data: profile, error } = await s
    .from("profiles")
    .select("role,name,email")
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
