import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

function makeReferralCode(userId: string) {
  return `AK${userId.replaceAll("-", "").slice(0, 8).toUpperCase()}`;
}

export async function POST() {
  try {
    const { user } = await requireUser();
    const admin = createAdminClient();

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("referral_code")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) throw profileError;

    if (profile?.referral_code) {
      return NextResponse.json({ referralCode: profile.referral_code });
    }

    const referralCode = makeReferralCode(user.id);
    const { data, error } = await admin
      .from("profiles")
      .update({ referral_code: referralCode })
      .eq("id", user.id)
      .is("referral_code", null)
      .select("referral_code")
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({
      referralCode: data?.referral_code || referralCode,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Unable to prepare your referral link." },
      { status: 500 }
    );
  }
}
