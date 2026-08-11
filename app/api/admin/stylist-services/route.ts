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

    if (error) {
      throw error;
    }

    return NextResponse.json({
      service_ids: (data ?? []).map((row) => row.service_id),
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        error: e?.message || "Unable to load stylist services.",
      },
      { status: 400 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { s } = await requireAdmin();

    const body = await req.json();

    const stylistId = body?.stylist_id;
    const serviceIds = Array.isArray(body?.service_ids)
      ? body.service_ids
      : [];

    if (!stylistId) {
      return NextResponse.json(
        { error: "stylist_id is required" },
        { status: 400 }
      );
    }

    if (!serviceIds.every((id: unknown) => typeof id === "string")) {
      return NextResponse.json(
        { error: "service_ids must be an array of IDs" },
        { status: 400 }
      );
    }

    // Make sure the stylist exists.
    const { data: stylist, error: stylistError } = await s
      .from("stylists")
      .select("id")
      .eq("id", stylistId)
      .single();

    if (stylistError || !stylist) {
      return NextResponse.json(
        { error: "Stylist not found." },
        { status: 404 }
      );
    }

    // Make sure every selected service exists and is active.
    if (serviceIds.length > 0) {
      const { data: services, error: servicesError } = await s
        .from("services")
        .select("id")
        .in("id", serviceIds)
        .eq("active", true)
        .is("deleted_at", null);

      if (servicesError) {
        throw servicesError;
      }

      const validServiceIds = new Set(
        (services ?? []).map((service) => service.id)
      );

      const invalidServiceIds = serviceIds.filter(
        (id: string) => !validServiceIds.has(id)
      );

      if (invalidServiceIds.length > 0) {
        return NextResponse.json(
          { error: "One or more selected services are unavailable." },
          { status: 400 }
        );
      }
    }

    /*
     * Replace the stylist's existing service relationships
     * with the newly selected services.
     *
     * An empty service_ids array is valid and means:
     * "This stylist currently provides no services."
     */

    const { error: deleteError } = await s
      .from("stylist_services")
      .delete()
      .eq("stylist_id", stylistId);

    if (deleteError) {
      throw deleteError;
    }

    if (serviceIds.length > 0) {
      const relationships = serviceIds.map((serviceId: string) => ({
        stylist_id: stylistId,
        service_id: serviceId,
      }));

      const { error: insertError } = await s
        .from("stylist_services")
        .insert(relationships);

      if (insertError) {
        throw insertError;
      }
    }

    return NextResponse.json({
      success: true,
      stylist_id: stylistId,
      service_ids: serviceIds,
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        error: e?.message || "Unable to update stylist services.",
      },
      { status: 400 }
    );
  }
}
