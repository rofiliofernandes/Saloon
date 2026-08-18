import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(
  req: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const { user } = await requireOwner();

    const { id } = await params;

    if (id === user.id) {
      return NextResponse.json(
        {
          error:
            "You cannot disable your own Owner account.",
        },
        { status: 400 }
      );
    }

    const body = await req.json();
    const disabled = body.disabled === true;

    const adminClient =
      createAdminClient();

    const {
      data: targetProfile,
      error: profileError,
    } = await adminClient
      .from("profiles")
      .select("id,name,email,role")
      .eq("id", id)
      .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    if (!targetProfile) {
      return NextResponse.json(
        {
          error:
            "Administrator account not found.",
        },
        { status: 404 }
      );
    }

    if (targetProfile.role !== "admin") {
      return NextResponse.json(
        {
          error:
            "The Owner account cannot be changed here.",
        },
        { status: 403 }
      );
    }

    const { error: authError } =
      await adminClient.auth.admin.updateUserById(
        id,
        {
          ban_duration: disabled
            ? "876000h"
            : "none",
        }
      );

    if (authError) {
      throw authError;
    }

    await adminClient.from("audit_logs").insert({
      admin_id: user.id,
      action: disabled ? "disable_admin" : "enable_admin",
      entity: "admin",
      entity_id: id,
      old_data: { role: targetProfile.role, disabled: !disabled },
      new_data: { role: targetProfile.role, disabled },
    });

    return NextResponse.json({ success: true, disabled });
  } catch (error: any) {
    const message =
      error?.message ||
      "Unable to update administrator.";

    const status =
      message === "UNAUTHENTICATED"
        ? 401
        : message === "FORBIDDEN"
          ? 403
          : 400;

    if (status >= 500) console.error("Admin account update failed", error);
    return NextResponse.json(
      { error: message === "FORBIDDEN" || message === "UNAUTHENTICATED" ? message : "Unable to update administrator." },
      { status }
    );
  }
}
