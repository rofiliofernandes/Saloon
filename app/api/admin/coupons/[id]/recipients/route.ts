import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  req: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    await requireAdmin();

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Coupon ID is required.",
        },
        { status: 400 }
      );
    }

    const admin =
      createAdminClient();

    const {
      data,
      error,
    } = await admin
      .from(
        "coupon_email_deliveries"
      )
      .select(
        "id,email,status,resend_id,error,sent_at,created_at"
      )
      .eq("coupon_id", id)
      .order("created_at", {
        ascending: true,
      });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      recipients: data ?? [],
    });
  } catch (error: any) {
    const message =
      error?.message ||
      "Unable to load recipients.";

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
