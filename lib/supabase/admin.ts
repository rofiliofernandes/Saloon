import "server-only";

import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is missing.");
  if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing.");

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export const supabaseAdmin = {
  from: (...args: Parameters<ReturnType<typeof createAdminClient>["from"]>) =>
    createAdminClient().from(...args),
  auth: {
    admin: {
      createUser: (...args: Parameters<ReturnType<typeof createAdminClient>["auth"]["admin"]["createUser"]>) =>
        createAdminClient().auth.admin.createUser(...args),
      inviteUserByEmail: (...args: Parameters<ReturnType<typeof createAdminClient>["auth"]["admin"]["inviteUserByEmail"]>) =>
        createAdminClient().auth.admin.inviteUserByEmail(...args),
      deleteUser: (...args: Parameters<ReturnType<typeof createAdminClient>["auth"]["admin"]["deleteUser"]>) =>
        createAdminClient().auth.admin.deleteUser(...args),
      updateUserById: (...args: Parameters<ReturnType<typeof createAdminClient>["auth"]["admin"]["updateUserById"]>) =>
        createAdminClient().auth.admin.updateUserById(...args),
    },
  },
};
