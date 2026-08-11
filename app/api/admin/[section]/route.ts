import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";

const allowed: any = {
  services: "services",
  stylists: "stylists",
  coupons: "coupons",
  availability: "working_hours",
  "blocked-periods": "blocked_periods",
  appointments: "appointments",
  customers: "profiles",
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ section: string }> }
) {
  try {
    const { s } = await requireAdmin();
    const { section } = await params;

    const table = allowed[section];

    if (!table) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    let q = s.from(table).select("*").limit(200);

    if (table === "services" || table === "stylists") {
      q = q.is("deleted_at", null);
    }

    const { data, error } = await q;

    if (error) throw error;

    return NextResponse.json({ rows: data ?? [] });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message },
      { status: e.message === "FORBIDDEN" ? 403 : 401 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ section: string }> }
) {
  try {
    const { s, user } = await requireAdmin();
    const { section } = await params;

    const table = allowed[section];

    if (
      !table ||
      table === "appointments" ||
      table === "customers"
    ) {
      return NextResponse.json(
        { error: "Unsupported" },
        { status: 400 }
      );
    }

    const body = await req.json();

    /*
     * Stylists are special because their services are stored
     * in the stylist_services junction table.
     */
    if (table === "stylists") {
      const serviceIds = Array.isArray(body.service_ids)
        ? body.service_ids
        : [];

      const clean = Object.fromEntries(
        Object.entries(body).filter(
          ([key]) =>
            ![
              "id",
              "created_at",
              "updated_at",
              "deleted_at",
              "service_ids",
            ].includes(key)
        )
      );

      const { data, error } = await s
        .from("stylists")
        .insert(clean)
        .select()
        .single();

      if (error) throw error;

      if (serviceIds.length > 0) {
        const relationships = serviceIds.map((serviceId: string) => ({
          stylist_id: data.id,
          service_id: serviceId,
        }));

        const { error: relationError } = await s
          .from("stylist_services")
          .insert(relationships);

        if (relationError) throw relationError;
      }

      await s.from("audit_logs").insert({
        admin_id: user.id,
        action: "create",
        entity: "stylists",
        entity_id: data.id,
        new_data: data,
      });

      return NextResponse.json({
        rows: [data],
      });
    }

    const clean = Object.fromEntries(
      Object.entries(body).filter(
        ([key]) =>
          ![
            "id",
            "created_at",
            "updated_at",
            "deleted_at",
          ].includes(key)
      )
    );

    const { data, error } = await s
      .from(table)
      .insert(clean)
      .select();

    if (error) throw error;

    await s.from("audit_logs").insert({
      admin_id: user.id,
      action: "create",
      entity: table,
      entity_id: data?.[0]?.id,
      new_data: data?.[0],
    });

    return NextResponse.json({
      rows: data,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message },
      { status: 400 }
    );
  }
}
