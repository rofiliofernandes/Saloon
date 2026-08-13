import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

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
    const message =
      error?.message ||
      "Unable to load administrators.";

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

export async function POST(
  req: Request
) {
  try {
    const { user: owner } =
      await requireOwner();

    const body = await req.json();

    const name = String(
      body.name || ""
    ).trim();

    const email = String(
      body.email || ""
    )
      .trim()
      .toLowerCase();

    const password = String(
      body.password || ""
    );

    if (!name) {
      return NextResponse.json(
        {
          error:
            "Please enter the administrator's name.",
        },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        {
          error:
            "Please enter the administrator's email.",
        },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          error:
            "Password must be at least 8 characters.",
        },
        { status: 400 }
      );
    }

    const adminClient =
      createAdminClient();

    /*
     * Find an existing Supabase Auth user.
     *
     * This prevents the ugly:
     * "A user with this email address has
     * already been registered"
     * error.
     */
    let existingUser: any = null;

    const {
      data: usersData,
      error: usersError,
    } =
      await adminClient.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

    if (usersError) {
      throw usersError;
    }

    existingUser =
      usersData.users.find(
        (user) =>
          user.email?.toLowerCase() ===
          email
      ) ?? null;

    /*
     * --------------------------------------------------
     * EXISTING AUTH USER
     * --------------------------------------------------
     */
    if (existingUser) {
      if (existingUser.id === owner.id) {
        return NextResponse.json(
          {
            error:
              "This email belongs to the Owner account.",
          },
          { status: 400 }
        );
      }

      const {
        data: existingProfile,
        error: profileLookupError,
      } = await adminClient
        .from("profiles")
        .select(
          "id,name,email,role"
        )
        .eq("id", existingUser.id)
        .maybeSingle();

      if (profileLookupError) {
        throw profileLookupError;
      }

      if (
        existingProfile?.role ===
        "owner"
      ) {
        return NextResponse.json(
          {
            error:
              "This user is already the Owner.",
          },
          { status: 400 }
        );
      }

      if (
        existingProfile?.role ===
        "admin"
      ) {
        return NextResponse.json(
          {
            error:
              "This user is already an administrator.",
          },
          { status: 409 }
        );
      }

      /*
       * Update the existing Auth user's
       * password and name.
       */
      const {
        error: authUpdateError,
      } =
        await adminClient.auth.admin.updateUserById(
          existingUser.id,
          {
            password,
            user_metadata: {
              ...(existingUser.user_metadata ||
                {}),
              name,
            },
          }
        );

      if (authUpdateError) {
        throw authUpdateError;
      }

      /*
       * Promote the existing customer.
       *
       * If the profile exists, update it.
       * If not, create it.
       */
      if (existingProfile) {
        const {
          error: promoteError,
        } = await adminClient
          .from("profiles")
          .update({
            name,
            email,
            role: "admin",
          })
          .eq(
            "id",
            existingUser.id
          );

        if (promoteError) {
          throw promoteError;
        }
      } else {
        const {
          error: insertProfileError,
        } = await adminClient
          .from("profiles")
          .insert({
            id: existingUser.id,
            name,
            email,
            role: "admin",
          });

        if (insertProfileError) {
          throw insertProfileError;
        }
      }

      await adminClient
        .from("audit_logs")
        .insert({
          admin_id: owner.id,
          action: "promote_customer",
          entity: "admin",
          entity_id:
            existingUser.id,
          old_data: existingProfile,
          new_data: {
            name,
            email,
            role: "admin",
          },
        });

      return NextResponse.json({
        success: true,
        existing: true,
        message:
          "Existing customer promoted to administrator.",
      });
    }

    /*
     * --------------------------------------------------
     * NEW AUTH USER
     * --------------------------------------------------
     */
    const {
      data: created,
      error: createError,
    } =
      await adminClient.auth.admin.createUser(
        {
          email,
          password,
          email_confirm: true,
          user_metadata: {
            name,
          },
        }
      );

    if (createError) {
      throw createError;
    }

    if (!created.user) {
      throw new Error(
        "Unable to create the administrator account."
      );
    }

    /*
     * The normal profile trigger may already
     * have created this row.
     *
     * Update it to administrator.
     */
    const {
      error: profileError,
    } = await adminClient
      .from("profiles")
      .update({
        name,
        email,
        role: "admin",
      })
      .eq(
        "id",
        created.user.id
      );

    if (profileError) {
      /*
       * Clean up the Auth user if the
       * profile could not be created.
       */
      await adminClient.auth.admin.deleteUser(
        created.user.id
      );

      throw profileError;
    }

    await adminClient
      .from("audit_logs")
      .insert({
        admin_id: owner.id,
        action: "create",
        entity: "admin",
        entity_id: created.user.id,
        new_data: {
          name,
          email,
          role: "admin",
        },
      });

    return NextResponse.json({
      success: true,
      existing: false,
      message:
        "Administrator created successfully.",
    });
  } catch (error: any) {
    const message =
      error?.message ||
      "Unable to create administrator.";

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
