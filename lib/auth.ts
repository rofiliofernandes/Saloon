import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertSameOrigin, enforceRateLimit } from "@/lib/security";

export async function requireUser() {
  await assertSameOrigin();
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();

  if (!user) throw new Error("UNAUTHENTICATED");
  return { s, user };
}

export async function requireAdmin() {
  const { s, user } = await requireUser();
  await enforceRateLimit("admin-api", 180, 60_000, user.id);

  const adminClient = createAdminClient();
  const { data: profile, error } = await adminClient
    .from("profiles")
    .select("id,role,name,email")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw error;
  if (profile?.role !== "admin" && profile?.role !== "owner") {
    throw new Error("FORBIDDEN");
  }

  return { s: adminClient, user, profile };
}

export async function requireOwner() {
  const { user } = await requireUser();
  await enforceRateLimit("owner-api", 120, 60_000, user.id);

  const adminClient = createAdminClient();
  const { data: profile, error } = await adminClient
    .from("profiles")
    .select("id,role,name,email")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw error;
  if (profile?.role !== "owner") throw new Error("FORBIDDEN");

  return { s: adminClient, user, profile };
}
