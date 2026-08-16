import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

function verifyToken(
  customerId: string,
  token: string
) {
  const secret =
    process.env.MARKETING_UNSUBSCRIBE_SECRET;

  if (!secret) {
    return false;
  }

  const expected =
    crypto
      .createHmac("sha256", secret)
      .update(customerId)
      .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(token),
    Buffer.from(expected)
  );
}

export async function GET(
  req: Request
) {
  try {
    const url = new URL(req.url);

    const customerId =
      url.searchParams.get("customer");

    const token =
      url.searchParams.get("token");

    if (
      !customerId ||
      !token ||
      !verifyToken(customerId, token)
    ) {
      return new NextResponse(
        "Invalid unsubscribe link.",
        {
          status: 400,
          headers: {
            "Content-Type": "text/plain",
          },
        }
      );
    }

    const admin =
      createAdminClient();

    const { error } =
      await admin
        .from("profiles")
        .update({
          marketing_unsubscribed_at:
            new Date().toISOString(),
        })
        .eq("id", customerId);

    if (error) {
      throw error;
    }

    return new NextResponse(
      "You have been unsubscribed from promotional emails from AK Hair & Beauty Salon.",
      {
        status: 200,
        headers: {
          "Content-Type": "text/plain",
        },
      }
    );
  } catch (error) {
    console.error(
      "Unsubscribe error:",
      error
    );

    return new NextResponse(
      "Unable to process your unsubscribe request.",
      {
        status: 500,
        headers: {
          "Content-Type": "text/plain",
        },
      }
    );
  }
}
