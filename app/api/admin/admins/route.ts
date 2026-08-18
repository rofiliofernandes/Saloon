import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

export async function GET() {
  try {
    await requireOwner();

    const adminClient =
      createAdminClient();

    const { data, error } =
      await adminClient
        .from("profiles")
        .select(
          "id,name,email,role,created_at"
        )
        .in("role", ["admin", "owner"])
        .order("created_at", {
          ascending: true,
        });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      rows: (data ?? []).map(
        (row) => ({
          ...row,
          disabled: false,
        })
      ),
    });
  } catch (error: any) {
    const message = error?.message;
    if (message === "FORBIDDEN") return NextResponse.json({ error: message }, { status: 403 });
    if (message === "UNAUTHENTICATED") return NextResponse.json({ error: message }, { status: 401 });
    console.error("Admin list failed", error);
    return NextResponse.json({ error: "Unable to load administrators." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { user: owner } = await requireOwner();
    const body = await req.json();
    const parsed = z.object({
      name: z.string().trim().min(1).max(120),
      email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
    }).safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Enter a valid administrator name and email." }, { status: 400 });
    }

    const { name, email } = parsed.data;
    const adminClient = createAdminClient();
    const { data: usersData, error: usersError } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (usersError) throw usersError;

    const existingUser = usersData.users.find((u) => u.email?.toLowerCase() === email) ?? null;
    if (existingUser) {
      if (existingUser.id === owner.id) return NextResponse.json({ error: "This email belongs to the Owner account." }, { status: 400 });

      const { data: existingProfile, error: profileLookupError } = await adminClient
        .from("profiles")
        .select("id,name,email,role")
        .eq("id", existingUser.id)
        .maybeSingle();
      if (profileLookupError) throw profileLookupError;

      if (existingProfile?.role === "owner") return NextResponse.json({ error: "This user is already the Owner." }, { status: 400 });
      if (existingProfile?.role === "admin") return NextResponse.json({ error: "This user is already an administrator." }, { status: 409 });

      const profilePayload = { name, email, role: "admin" as const };
      const profileMutation = existingProfile
        ? adminClient.from("profiles").update(profilePayload).eq("id", existingUser.id)
        : adminClient.from("profiles").insert({ id: existingUser.id, ...profilePayload });
      const { error: promoteError } = await profileMutation;
      if (promoteError) throw promoteError;

      await adminClient.from("audit_logs").insert({
        admin_id: owner.id,
        action: "promote_customer",
        entity: "admin",
        entity_id: existingUser.id,
        old_data: existingProfile,
        new_data: profilePayload,
      });

      return NextResponse.json({ success: true, existing: true, invited: false, message: "Existing customer promoted to administrator. Their existing password was not changed." });
    }

    const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
    const requestOrigin = new URL(req.url).origin;
    const siteUrl = configuredSiteUrl && !/localhost|127\.0\.0\.1/.test(configuredSiteUrl) ? configuredSiteUrl : requestOrigin;
    const redirectTo = `${siteUrl}/auth/callback?next=${encodeURIComponent("/admin/setup-password")}`;

    const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { name },
      redirectTo,
    });
    if (inviteError) throw inviteError;
    if (!invited.user) throw new Error("Unable to create the administrator invitation.");

    const profilePayload = { name, email, role: "admin" as const };
    const { error: profileError } = await adminClient.from("profiles").upsert(
      { id: invited.user.id, ...profilePayload },
      { onConflict: "id" },
    );
    if (profileError) {
      await adminClient.auth.admin.deleteUser(invited.user.id);
      throw profileError;
    }

    await adminClient.from("audit_logs").insert({
      admin_id: owner.id,
      action: "invite",
      entity: "admin",
      entity_id: invited.user.id,
      new_data: { name, email, role: "admin" },
    });

    return NextResponse.json({ success: true, existing: false, invited: true, message: "Administrator invitation sent. They will choose their own password from the secure invitation link." });
  } catch (error: any) {
    const message = error?.message || "Unable to create administrator.";
    const status = message === "FORBIDDEN" ? 403 : message === "UNAUTHENTICATED" ? 401 : 400;
    if (status >= 500) console.error("Admin invitation failed", error);
    return NextResponse.json({ error: message === "FORBIDDEN" || message === "UNAUTHENTICATED" ? message : "Unable to create administrator." }, { status });
  }
}

export async function DELETE(
  req: Request
) {
  try {
    const { user: owner } =
      await requireOwner();

    const url = new URL(req.url);
    const id =
      url.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Admin ID is required.",
        },
        { status: 400 }
      );
    }

    if (id === owner.id) {
      return NextResponse.json(
        {
          error:
            "You cannot remove your own Owner access.",
        },
        { status: 400 }
      );
    }

    const adminClient =
      createAdminClient();

    const {
      data: target,
      error: targetError,
    } =
      await adminClient
        .from("profiles")
        .select(
          "id,name,email,role"
        )
        .eq("id", id)
        .maybeSingle();

    if (targetError) {
      throw targetError;
    }

    if (!target) {
      return NextResponse.json(
        {
          error:
            "Administrator not found.",
        },
        { status: 404 }
      );
    }

    if (target.role !== "admin") {
      return NextResponse.json(
        {
          error:
            "Only normal administrator accounts can be removed here.",
        },
        { status: 400 }
      );
    }

    const {
      error: updateError,
    } = await adminClient
      .from("profiles")
      .update({
        role: "customer",
      })
      .eq("id", id);

    if (updateError) {
      throw updateError;
    }

    await adminClient
      .from("audit_logs")
      .insert({
        admin_id: owner.id,
        action: "remove_admin",
        entity: "admin",
        entity_id: id,
        old_data: target,
        new_data: {
          role: "customer",
        },
      });

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    const message =
      error?.message ||
      "Unable to remove administrator.";

    const status =
      message === "FORBIDDEN"
        ? 403
        : message === "UNAUTHENTICATED"
          ? 401
          : 400;

    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
