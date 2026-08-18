import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    await requireAdmin();
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("stylists")
      .select("id,name,bio,category,image_url,active,deleted_at")
      .is("deleted_at", null)
      .order("name");

    if (error) throw error;
    return NextResponse.json({ rows: data ?? [] });
  } catch (error: any) {
    const message = error?.message || "Unable to load stylists.";
    return NextResponse.json({ error: message }, { status: message === "FORBIDDEN" ? 403 : 401 });
  }
}
