import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

export async function PATCH(
  req: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const { s, user } = await requireAdmin();
    const { id } = await params;
    const body = await req.json();

    const stylistId = String(body.stylist_id || "");
    const day = Number(body.day_of_week);
    const start = String(body.start_time || "");
    const end = String(body.end_time || "");

    if (!stylistId) {
      return NextResponse.json(
        { error: "Please select a stylist." },
        { status: 400 }
      );
    }

    if (!Number.isInteger(day) || day < 0 || day > 6) {
      return NextResponse.json(
        { error: "Please select a valid day." },
        { status: 400 }
      );
    }

    if (body.day_off) {
      const { data: old } = await s
        .from("working_hours")
        .select("*")
        .eq("id", id)
        .single();

      const { error } = await s
        .from("working_hours")
        .delete()
        .eq("id", id);

      if (error) throw error;

      await s.from("audit_logs").insert({
        admin_id: user.id,
        action: "delete",
        entity: "working_hours",
        entity_id: id,
        old_data: old,
      });

      return NextResponse.json({ ok: true });
    }

    if (!start || !end || start >= end) {
      return NextResponse.json(
        { error: "Please enter valid working hours." },
        { status: 400 }
      );
    }

    const { data: conflict } = await s
      .from("working_hours")
      .select("id")
      .eq("stylist_id", stylistId)
      .eq("day_of_week", day)
      .neq("id", id)
      .limit(1);

    if (conflict?.length) {
      return NextResponse.json(
        {
          error:
            "Another schedule already exists for this stylist on this day.",
        },
        { status: 409 }
      );
    }

    const { data: old } = await s
      .from("working_hours")
      .select("*")
      .eq("id", id)
      .single();

    const { data, error } = await s
      .from("working_hours")
      .update({
        stylist_id: stylistId,
        day_of_week: day,
        start_time: start,
        end_time: end,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    await s.from("audit_logs").insert({
      admin_id: user.id,
      action: "update",
      entity: "working_hours",
      entity_id: id,
      old_data: old,
      new_data: data,
    });

    return NextResponse.json({
      rows: [data],
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unable to update availability." },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _req: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const { s, user } = await requireAdmin();
    const { id } = await params;

    const { data: old } = await s
      .from("working_hours")
      .select("*")
      .eq("id", id)
      .single();

    const { error } = await s
      .from("working_hours")
      .delete()
      .eq("id", id);

    if (error) throw error;

    await s.from("audit_logs").insert({
      admin_id: user.id,
      action: "delete",
      entity: "working_hours",
      entity_id: id,
      old_data: old,
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unable to remove availability." },
      { status: 400 }
    );
  }
}
