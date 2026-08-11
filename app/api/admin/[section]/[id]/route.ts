import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

const allowed: any = {
  services: "services",
  stylists: "stylists",
  coupons: "coupons",
  availability: "working_hours",
  "blocked-periods": "blocked_periods",
};

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ section: string; id: string }> }
) {
  try {
    const { s, user } = await requireAdmin();
    const { section, id } = await params;

    const table = allowed[section];

    if (!table) {
      return NextResponse.json(
        { error: "Not found" },
        { status: 404 }
      );
    }

    const body = await req.json();

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
        .update(clean)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      /*
       * Replace the stylist's service relationships with
       * exactly what was selected in the Admin GUI.
       */
      const { error: deleteError } = await s
        .from("stylist_services")
        .delete()
        .eq("stylist_id", id);

      if (deleteError) throw deleteError;

      if (serviceIds.length > 0) {
        const relationships = serviceIds.map((serviceId: string) => ({
          stylist_id: id,
          service_id: serviceId,
        }));

        const { error: relationError } = await s
          .from("stylist_services")
          .insert(relationships);

        if (relationError) throw relationError;
      }

      await s.from("audit_logs").insert({
        admin_id: user.id,
        action: "update",
        entity: "stylists",
        entity_id: id,
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
      .update(clean)
      .eq("id", id)
      .select();

    if (error) throw error;

    await s.from("audit_logs").insert({
      admin_id: user.id,
      action: "update",
      entity: table,
      entity_id: id,
      new_data: data,
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

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ section: string; id: string }> }
) {
  try {
    const { s, user } = await requireAdmin();
    const { section, id } = await params;

    const table = allowed[section];

    if (!table) {
      return NextResponse.json(
        { error: "Not found" },
        { status: 404 }
      );
    }

    const { data: old } = await s
      .from(table)
      .select("*")
      .eq("id", id)
      .single();

    let q: any;

    if (["services", "stylists"].includes(table)) {
      q = s
        .from(table)
        .update({
          active: false,
          deleted_at: new Date().toISOString(),
        })
        .eq("id", id);
    } else {
      q = s
        .from(table)
        .delete()
        .eq("id", id);
    }

    const { error } = await q;

    if (error) throw error;

    await s.from("audit_logs").insert({
      admin_id: user.id,
      action: "delete",
      entity: table,
      entity_id: id,
      old_data: old,
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message },
      { status: 400 }
    );
  }
}
