import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const { s } = await requireAdmin();

    const url = new URL(req.url);
    const stylistId = url.searchParams.get("stylist_id");

    if (!stylistId) {
      return NextResponse.json(
        { error: "stylist_id is required" },
        { status: 400 }
      );
    }

    const { data, error } = await s
      .from("stylist_services")
      .select("service_id")
      .eq("stylist_id", stylistId);

    if (error) throw error;

    return NextResponse.json({
      service_ids: (data ?? []).map(
        (x) => x.service_id
      ),
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message },
      { status: 400 }
    );
  }
}
