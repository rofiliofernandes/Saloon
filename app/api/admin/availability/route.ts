import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    const { s } = await requireAdmin();

    const { data, error } = await s
      .from("working_hours")
      .select("id,stylist_id,day_of_week,start_time,end_time")
      .order("stylist_id")
      .order("day_of_week")
      .order("start_time");

    if (error) throw error;

    return NextResponse.json({
      rows: data ?? [],
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unable to load availability." },
      { status: 400 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { s, user } = await requireAdmin();
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

    if (!body.day_off && (!start || !end || start >= end)) {
      return NextResponse.json(
        { error: "Please enter valid working hours." },
        { status: 400 }
      );
    }

    if (body.day_off) {
      const { error } = await s
        .from("working_hours")
        .delete()
        .eq("stylist_id", stylistId)
        .eq("day_of_week", day);

      if (error) throw error;

      return NextResponse.json({ rows: [] });
    }

    const { data: existing } = await s
      .from("working_hours")
      .select("id")
      .eq("stylist_id", stylistId)
      .eq("day_of_week", day)
      .limit(1);

    if (existing?.length) {
      return NextResponse.json(
        {
          error:
            "Working hours already exist for this stylist on this day. Edit the existing schedule instead.",
        },
        { status: 409 }
      );
    }

    const { data, error } = await s
      .from("working_hours")
      .insert({
        stylist_id: stylistId,
        day_of_week: day,
        start_time: start,
        end_time: end,
      })
      .select()
      .single();

    if (error) throw error;

    await s.from("audit_logs").insert({
      admin_id: user.id,
      action: "create",
      entity: "working_hours",
      entity_id: data.id,
      new_data: data,
    });

    return NextResponse.json({
      rows: [data],
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unable to save availability." },
      { status: 400 }
    );
  }
}
