import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

/*
 * --------------------------------------------------
 * GET CATEGORIES
 * --------------------------------------------------
 */

export async function GET() {
  try {
    const { s } = await requireAdmin();

    const { data, error } = await s
      .from("service_categories")
      .select("*")
      .order("display_order", {
        ascending: true,
      })
      .order("name", {
        ascending: true,
      });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      rows: data ?? [],
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        error:
          e?.message ||
          "Unable to load service categories.",
      },
      { status: 400 }
    );
  }
}

/*
 * --------------------------------------------------
 * CREATE CATEGORY
 * --------------------------------------------------
 */

export async function POST(req: Request) {
  try {
    const { s } = await requireAdmin();

    const body = await req.json();

    const name =
      String(body.name || "").trim();

    const description =
      String(body.description || "").trim() || null;

    if (!name) {
      return NextResponse.json(
        {
          error:
            "Please enter a category name.",
        },
        { status: 400 }
      );
    }

    const {
      data: existing,
      error: existingError,
    } = await s
      .from("service_categories")
      .select("id")
      .ilike("name", name)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (existing) {
      return NextResponse.json(
        {
          error:
            "A category with this name already exists.",
        },
        { status: 409 }
      );
    }

    const { data: last } = await s
      .from("service_categories")
      .select("display_order")
      .order("display_order", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    const displayOrder =
      Number(
        last?.display_order ?? -1
      ) + 1;

    const {
      data,
      error,
    } = await s
      .from("service_categories")
      .insert({
        name,
        description,
        display_order: displayOrder,
        active: true,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      rows: [data],
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        error:
          e?.message ||
          "Unable to create category.",
      },
      { status: 400 }
    );
  }
}

/*
 * --------------------------------------------------
 * UPDATE CATEGORY
 * --------------------------------------------------
 */

export async function PATCH(req: Request) {
  try {
    const { s } = await requireAdmin();

    const body = await req.json();

    const id =
      String(body.id || "").trim();

    const name =
      String(body.name || "").trim();

    const description =
      String(body.description || "").trim() || null;

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Category ID is required.",
        },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        {
          error:
            "Please enter a category name.",
        },
        { status: 400 }
      );
    }

    const update: Record<
      string,
      any
    > = {
      name,
      description,
    };

    if (
      body.active !== undefined
    ) {
      update.active =
        Boolean(body.active);
    }

    if (
      body.display_order !==
      undefined
    ) {
      update.display_order =
        Number(body.display_order);
    }

    const {
      data,
      error,
    } = await s
      .from("service_categories")
      .update(update)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      rows: [data],
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        error:
          e?.message ||
          "Unable to update category.",
      },
      { status: 400 }
    );
  }
}

/*
 * --------------------------------------------------
 * DELETE CATEGORY
 * --------------------------------------------------
 *
 * A category can only be deleted when it has
 * no active services assigned to it.
 */

export async function DELETE(req: Request) {
  try {
    const { s } = await requireAdmin();

    const url =
      new URL(req.url);

    const id =
      String(
        url.searchParams.get("id") ||
          ""
      ).trim();

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Category ID is required.",
        },
        { status: 400 }
      );
    }

    /*
     * Check for active services.
     */

    const {
      count,
      error: countError,
    } = await s
      .from("services")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("category_id", id)
      .is("deleted_at", null);

    if (countError) {
      throw countError;
    }

    if ((count ?? 0) > 0) {
      return NextResponse.json(
        {
          error:
            "This category still contains services. Delete or move those services first.",
        },
        { status: 409 }
      );
    }

    /*
     * Category is empty.
     * It is safe to delete.
     */

    const { error } = await s
      .from("service_categories")
      .delete()
      .eq("id", id);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        error:
          e?.message ||
          "Unable to delete category.",
      },
      { status: 400 }
    );
  }
}
