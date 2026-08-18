import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function safeRows<T>(query: PromiseLike<{ data: T[] | null; error: { message?: string } | null }>) {
  try {
    const result = await query;
    if (result.error) {
      console.error("Optional customer-history query failed:", result.error.message);
      return [] as T[];
    }
    return result.data ?? [];
  } catch (error) {
    console.error("Optional customer-history query failed:", error);
    return [] as T[];
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    if (!isUuid(id)) {
      return NextResponse.json({ error: "Customer not found." }, { status: 404 });
    }

    const s = createAdminClient();

    // These two are the core customer record. If either fails, the detail view
    // cannot be trusted and should fail cleanly rather than returning partial data.
    const [profileResult, appointmentsResult] = await Promise.all([
      s.from("profiles")
        .select("id,name,email,phone,role,referral_code,referral_points,created_at,marketing_unsubscribed_at")
        .eq("id", id)
        .single(),
      s.from("appointments")
        .select("id,start_time,end_time,status,price,base_price,discount_amount,coupon_code,booking_source,created_at,completed_at,service_id,stylist_id")
        .eq("customer_id", id)
        .order("start_time", { ascending: false }),
    ]);

    if (profileResult.error || !profileResult.data) {
      return NextResponse.json({ error: "Customer not found." }, { status: 404 });
    }

    if (appointmentsResult.error) {
      console.error("Customer appointments query failed:", appointmentsResult.error);
      return NextResponse.json({ error: "Unable to load customer details." }, { status: 500 });
    }

    const appointments = appointmentsResult.data ?? [];

    // History tables were introduced over several migrations. Treat those
    // tables as optional so an older development database can still display
    // the customer's core record and appointment history.
    const [couponUsage, referralRewards, referralRedemptions, issuedCoupons] = await Promise.all([
      safeRows(
        s.from("coupon_usage")
          .select("id,created_at,appointment_id,coupon_id")
          .eq("customer_id", id)
          .order("created_at", { ascending: false })
      ),
      safeRows(
        s.from("referral_rewards")
          .select("id,referred_customer_id,appointment_id,purchase_amount,reward_points,created_at")
          .eq("referrer_id", id)
          .order("created_at", { ascending: false })
      ),
      safeRows(
        s.from("referral_redemptions")
          .select("id,points_redeemed,credit_amount,coupon_id,created_at")
          .eq("customer_id", id)
          .order("created_at", { ascending: false })
      ),
      safeRows(
        s.from("coupons")
          .select("id,code,discount_type,discount_value,source,reason,issued_at,redeemed_at,expires_at,active")
          .eq("customer_id", id)
          .order("issued_at", { ascending: false })
          .limit(100)
      ),
    ]);

    const serviceIds = [...new Set(appointments.map((item) => item.service_id).filter(Boolean))];
    const stylistIds = [...new Set(appointments.map((item) => item.stylist_id).filter(Boolean))];
    const couponIds = [...new Set(couponUsage.map((item) => item.coupon_id).filter(Boolean))];
    const referredIds = [...new Set(referralRewards.map((item) => item.referred_customer_id).filter(Boolean))];

    const [services, stylists, usedCoupons, referredProfiles] = await Promise.all([
      serviceIds.length
        ? safeRows(s.from("services").select("id,name").in("id", serviceIds))
        : Promise.resolve([]),
      stylistIds.length
        ? safeRows(s.from("stylists").select("id,name").in("id", stylistIds))
        : Promise.resolve([]),
      couponIds.length
        ? safeRows(s.from("coupons").select("id,code,discount_type,discount_value").in("id", couponIds))
        : Promise.resolve([]),
      referredIds.length
        ? safeRows(s.from("profiles").select("id,name,email").in("id", referredIds))
        : Promise.resolve([]),
    ]);

    const serviceMap = new Map(services.map((item) => [item.id, item]));
    const stylistMap = new Map(stylists.map((item) => [item.id, item]));
    const couponMap = new Map(usedCoupons.map((item) => [item.id, item]));
    const referredMap = new Map(referredProfiles.map((item) => [item.id, item]));

    const enrichedAppointments = appointments.map((item) => ({
      ...item,
      service: serviceMap.get(item.service_id) ?? null,
      stylist: stylistMap.get(item.stylist_id) ?? null,
    }));

    const enrichedCouponUsage = couponUsage.map((item) => ({
      ...item,
      coupon: couponMap.get(item.coupon_id) ?? null,
    }));

    const enrichedReferrals = referralRewards.map((item) => ({
      ...item,
      referred_customer: referredMap.get(item.referred_customer_id) ?? null,
    }));

    const completedAppointments = appointments.filter((item) => item.status === "completed");
    const currentYear = new Date().getFullYear();
    const completedThisYear = completedAppointments.filter(
      (item) => new Date(item.start_time).getFullYear() === currentYear
    );
    const totalSpent = completedAppointments.reduce(
      (sum, item) => sum + Number(item.price || 0),
      0
    );

    return NextResponse.json({
      customer: profileResult.data,
      summary: {
        total_spent: totalSpent,
        lifetime_visits: completedAppointments.length,
        visits_this_year: completedThisYear.length,
        total_bookings: appointments.filter((item) => item.status !== "cancelled").length,
        cancelled_bookings: appointments.filter((item) => item.status === "cancelled").length,
        average_spend: completedAppointments.length ? totalSpent / completedAppointments.length : 0,
        coupons_used: enrichedCouponUsage.length,
        people_referred: enrichedReferrals.length,
        referral_points: Number(profileResult.data.referral_points || 0),
      },
      appointments: enrichedAppointments,
      coupon_usage: enrichedCouponUsage,
      issued_coupons: issuedCoupons,
      referrals: enrichedReferrals,
      referral_redemptions: referralRedemptions,
    });
  } catch (error) {
    console.error("Admin customer detail error:", error);
    return NextResponse.json({ error: "Unable to load customer details." }, { status: 500 });
  }
}
