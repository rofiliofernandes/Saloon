import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

async function getCatalogue(s: any) {
  const { data, error } = await s
    .from("services")
    .select(`
      id,
      name,
      description,
      active,
      deleted_at,
      category_id,
      category,
      service_categories (
        id,
        name,
        display_order
      ),
      service_options (
        id,
        name,
        price,
        price_type,
        duration_minutes,
        display_order,
        active
      ),
      service_audiences (
        audience
      )
    `)
    .is("deleted_at", null)
    .order("name");

  if (error) throw error;

  return data ?? [];
}

/*
 * --------------------------------------------------
 * GET SERVICE CATALOGUE
 * --------------------------------------------------
 */

export async function GET() {
  try {
    await requireAdmin();
    const admin = createAdminClient();

    const rows = await getCatalogue(admin);

    return NextResponse.json({
      rows,
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        error:
          e?.message ||
          "Unable to load service catalogue.",
      },
      { status: 400 }
    );
  }
}

/*
 * --------------------------------------------------
 * CREATE SERVICE
 * --------------------------------------------------
 */

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const s = createAdminClient();

    const body = await req.json();

    const categoryId =
      String(body.category_id || "").trim();

    const name =
      String(body.name || "").trim();

    const description =
      String(body.description || "").trim() || null;

    const audiences = Array.isArray(body.audiences)
      ? body.audiences
          .map((x: unknown) =>
            String(x).trim().toLowerCase()
          )
          .filter((x: string) =>
            ["men", "women", "kids"].includes(x)
          )
      : [];

    const options = Array.isArray(body.options)
      ? body.options
      : [];

    if (!categoryId) {
      return NextResponse.json(
        {
          error: "Please select a category.",
        },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        {
          error: "Please enter a service name.",
        },
        { status: 400 }
      );
    }

    if (!audiences.length) {
      return NextResponse.json(
        {
          error:
            "Please select at least one audience.",
        },
        { status: 400 }
      );
    }

    if (!options.length) {
      return NextResponse.json(
        {
          error:
            "Please add at least one pricing option.",
        },
        { status: 400 }
      );
    }

    const cleanedOptions = options.map(
      (option: any, index: number) => {
        const optionName =
          String(option.name || "").trim();

        const price = Number(option.price);

        const duration = Number(
          option.duration_minutes
        );

        const priceType =
          String(
            option.price_type || "fixed"
          ).trim();

        if (!optionName) {
          throw new Error(
            `Pricing option ${index + 1} needs a name.`
          );
        }

        if (
          !Number.isFinite(price) ||
          price < 0
        ) {
          throw new Error(
            `Invalid price for ${optionName}.`
          );
        }

        if (
          !Number.isInteger(duration) ||
          duration <= 0
        ) {
          throw new Error(
            `Invalid duration for ${optionName}.`
          );
        }

        if (
          ![
            "fixed",
            "from",
            "percentage",
          ].includes(priceType)
        ) {
          throw new Error(
            `Invalid price type for ${optionName}.`
          );
        }

        return {
          name: optionName,
          price,
          price_type: priceType,
          duration_minutes: duration,
          display_order: index,
          active: true,
        };
      }
    );

    const {
      data: category,
      error: categoryError,
    } = await s
      .from("service_categories")
      .select("id")
      .eq("id", categoryId)
      .eq("active", true)
      .single();

    if (categoryError || !category) {
      return NextResponse.json(
        {
          error: "Category not found.",
        },
        { status: 404 }
      );
    }

  const firstOption = cleanedOptions[0];

const {
  data: service,
  error: serviceError,
} = await s
  .from("services")
  .insert({
    name,
    description,
    category_id: categoryId,

    // Keep the legacy service fields populated
    // because the existing appointments system
    // still depends on them.
    price: firstOption.price,
    duration_minutes: firstOption.duration_minutes,

    // Audience is now stored properly in
    // service_audiences.
    category: "unisex",

    active: true,
  })
  .select()
  .single();

    if (serviceError || !service) {
      throw (
        serviceError ||
        new Error("Unable to create service.")
      );
    }

    const audienceRows = [
      ...new Set(audiences),
    ].map((audience) => ({
      service_id: service.id,
      audience: String(audience),
    }));

    const {
      error: audienceError,
      } = await s
      .from("service_audiences")
      .insert(audienceRows);

    if (audienceError) {
      await s
        .from("services")
        .delete()
        .eq("id", service.id);

      throw audienceError;
    }

    const optionRows = cleanedOptions.map(
      (option: any) => ({
        ...option,
        service_id: service.id,
      })
    );

    const {
      error: optionError,
    } = await s
      .from("service_options")
      .insert(optionRows);

    if (optionError) {
      await s
        .from("service_audiences")
        .delete()
        .eq("service_id", service.id);

      await s
        .from("services")
        .delete()
        .eq("id", service.id);

      throw optionError;
    }

    const rows = await getCatalogue(s);

    return NextResponse.json({
      rows,
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        error:
          e?.message ||
          "Unable to create service.",
      },
      { status: 400 }
    );
  }
}

/*
 * --------------------------------------------------
 * UPDATE SERVICE
 * --------------------------------------------------
 */

export async function PATCH(req: Request) {
  try {
    await requireAdmin();
    const s = createAdminClient();

    const body = await req.json();

    const serviceId =
      String(body.id || "").trim();

    const categoryId =
      String(body.category_id || "").trim();

    const name =
      String(body.name || "").trim();

    const description =
      String(body.description || "").trim() || null;

    const audiences = Array.isArray(body.audiences)
      ? body.audiences
          .map((x: unknown) =>
            String(x).trim().toLowerCase()
          )
          .filter((x: string) =>
            ["men", "women", "kids"].includes(x)
          )
      : [];

    const options = Array.isArray(body.options)
      ? body.options
      : [];

    if (!serviceId) {
      return NextResponse.json(
        {
          error: "Service ID is required.",
        },
        { status: 400 }
      );
    }

    if (!categoryId) {
      return NextResponse.json(
        {
          error: "Please select a category.",
        },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        {
          error: "Please enter a service name.",
        },
        { status: 400 }
      );
    }

    if (!audiences.length) {
      return NextResponse.json(
        {
          error:
            "Please select at least one audience.",
        },
        { status: 400 }
      );
    }

    if (!options.length) {
      return NextResponse.json(
        {
          error:
            "Please add at least one pricing option.",
        },
        { status: 400 }
      );
    }

    const cleanedOptions = options.map(
      (option: any, index: number) => {
       const optionName =
  String(option.name || "").trim() ||
  "Standard";

const price = Number(option.price);
        const duration = Number(
          option.duration_minutes
        );

        const priceType =
          String(
            option.price_type || "fixed"
          ).trim();

       const cleanedOptions = options.map(
  (option: any, index: number) => {
    const optionName =
      String(option.name || "").trim() ||
      "Standard";

    const price = Number(option.price);

    const duration = Number(
      option.duration_minutes
    );

    const priceType =
      String(
        option.price_type || "fixed"
      ).trim();

    if (
      !Number.isFinite(price) ||
      price < 0
    ) {
      throw new Error(
        `Invalid price for pricing option ${index + 1}.`
      );
    }

    if (
      !Number.isInteger(duration) ||
      duration <= 0
    ) {
      throw new Error(
        `Invalid duration for pricing option ${index + 1}.`
      );
    }

    if (
      ![
        "fixed",
        "from",
        "percentage",
      ].includes(priceType)
    ) {
      throw new Error(
        `Invalid price type for pricing option ${index + 1}.`
      );
    }

    return {
      name: optionName,
      price,
      price_type: priceType,
      duration_minutes: duration,
      display_order: index,
      active: true,
    };
  }
);

        if (
          !Number.isFinite(price) ||
          price < 0
        ) {
          throw new Error(
            `Invalid price for ${optionName}.`
          );
        }

        if (
          !Number.isInteger(duration) ||
          duration <= 0
        ) {
          throw new Error(
            `Invalid duration for ${optionName}.`
          );
        }

        if (
          ![
            "fixed",
            "from",
            "percentage",
          ].includes(priceType)
        ) {
          throw new Error(
            `Invalid price type for ${optionName}.`
          );
        }

        return {
          name: optionName,
          price,
          price_type: priceType,
          duration_minutes: duration,
          display_order: index,
          active: true,
        };
      }
    );

    const {
      error: serviceError,
    } = await s
      .from("services")
      .update({
        name,
        description,
        category_id: categoryId,
        active: true,
        deleted_at: null,
      })
      .eq("id", serviceId);

    if (serviceError) {
      throw serviceError;
    }

    /*
     * Replace audiences.
     */

    await s
      .from("service_audiences")
      .delete()
      .eq("service_id", serviceId);

    const audienceRows = [
      ...new Set(audiences),
    ].map((audience) => ({
      service_id: serviceId,
      audience: String(audience),
    }));

    const {
      error: audienceError,
    } = await s
      .from("service_audiences")
      .insert(audienceRows);

    if (audienceError) {
      throw audienceError;
    }

    /*
     * Replace pricing options.
     */

    await s
      .from("service_options")
      .delete()
      .eq("service_id", serviceId);

    const optionRows = cleanedOptions.map(
      (option: any) => ({
        ...option,
        service_id: serviceId,
      })
    );

    const {
      error: optionError,
    } = await s
      .from("service_options")
      .insert(optionRows);

    if (optionError) {
      throw optionError;
    }

    const rows = await getCatalogue(s);

    return NextResponse.json({
      rows,
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        error:
          e?.message ||
          "Unable to update service.",
      },
      { status: 400 }
    );
  }
}

/*
 * --------------------------------------------------
 * DELETE / ARCHIVE SERVICE
 * --------------------------------------------------
 */

export async function DELETE(req: Request) {
  try {
    await requireAdmin();
    const s = createAdminClient();

    const url = new URL(req.url);

    const id =
      String(
        url.searchParams.get("id") || ""
      ).trim();

    if (!id) {
      return NextResponse.json(
        {
          error: "Service ID is required.",
        },
        { status: 400 }
      );
    }

    /*
     * Do NOT physically delete services.
     *
     * Appointments may already reference them.
     */

    const { error } = await s
      .from("services")
      .update({
        active: false,
        deleted_at: new Date().toISOString(),
      })
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
          "Unable to delete service.",
      },
      { status: 400 }
    );
  }
}
