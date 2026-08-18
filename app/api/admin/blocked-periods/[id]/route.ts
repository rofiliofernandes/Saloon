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

    const stylistId =
      body.stylist_id === "all"
        ? null
        : String(body.stylist_id || "");

    const startTime = String(body.start_time || "");
    const endTime = String(body.end_time || "");
    const reason = String(body.reason || "").trim();

    if (body.stylist_id !== "all" && !stylistId) {
      return NextResponse.json(
        { error: "Please select a stylist." },
        { status: 400 }
      );
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      end <= start
    ) {
      return NextResponse.json(
        { error: "The end time must be after the start time." },
        { status: 400 }
      );
    }

    const { data: old } = await s
      .from("blocked_periods")
      .select("*")
      .eq("id", id)
      .single();

    const { data, error } = await s
      .from("blocked_periods")
      .update({
        stylist_id: stylistId,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        reason: reason || null,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    await s.from("audit_logs").insert({
      admin_id: user.id,
      action: "update",
      entity: "blocked_periods",
      entity_id: id,
      old_data: old,
      new_data: data,
    });

    return NextResponse.json({
      rows: [data],
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unable to update blocked period." },
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
      .from("blocked_periods")
      .select("*")
      .eq("id", id)
      .single();

    const { error } = await s
      .from("blocked_periods")
      .delete()
      .eq("id", id);

    if (error) throw error;

    await s.from("audit_logs").insert({
      admin_id: user.id,
      action: "delete",
      entity: "blocked_periods",
      entity_id: id,
      old_data: old,
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unable to remove blocked period." },
      { status: 400 }
    );
  }
}
