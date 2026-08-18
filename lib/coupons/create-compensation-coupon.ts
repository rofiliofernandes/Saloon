import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

type CreateCompensationCouponInput = {
  appointmentId: string;
  customerId: string;
  reason?: string;
  discount?: number;
};

function generateCouponCode(name: string) {
  const cleanName =
    String(name || "CUSTOMER")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 8) || "CUSTOMER";

  return `SORRY-${cleanName}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

export async function createCompensationCoupon({
  appointmentId,
  customerId,
  reason = "Stylist cancellation",
  discount = 15,
}: CreateCompensationCouponInput) {
  const admin = createAdminClient();

  // Never create two compensation coupons for the same appointment.
  const { data: existingCoupon, error: existingError } = await admin
    .from("coupons")
    .select(
      "id,code,discount_type,discount_value,usage_limit,used_count,expires_at,active,source_appointment_id,customer_id,reason"
    )
    .eq("source_appointment_id", appointmentId)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existingCoupon) {
    const { data: existingCustomer } = await admin
      .from("profiles")
      .select("id,name,email,phone")
      .eq("id", customerId)
      .maybeSingle();

    return {
      coupon: { ...existingCoupon, customer: existingCustomer },
      alreadyCreated: true,
      emailStatus: "not_sent" as const,
    };
  }

  const { data: customer, error: customerError } = await admin
    .from("profiles")
    .select("id,name,email,phone")
    .eq("id", customerId)
    .maybeSingle();

  if (customerError) throw customerError;
  if (!customer) throw new Error("Customer could not be found.");

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  let coupon: any = null;

  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await admin
      .from("coupons")
      .insert({
        code: generateCouponCode(customer.name),
        discount_type: "percentage",
        discount_value: discount,
        minimum_amount: 0,
        usage_limit: 1,
        used_count: 0,
        expires_at: expiresAt.toISOString(),
        active: true,
        source: "stylist_cancellation",
        source_appointment_id: appointmentId,
        customer_id: customerId,
        reason,
      })
      .select(
        "id,code,discount_type,discount_value,usage_limit,used_count,expires_at,active,source_appointment_id,customer_id,reason"
      )
      .single();

    if (!error) {
      coupon = data;
      break;
    }

    if (error.code === "23505") continue;
    throw error;
  }

  if (!coupon) {
    throw new Error("Unable to generate a unique compensation coupon.");
  }

  // Coupon email delivery has deliberately been removed. The admin can
  // copy the customer's phone/message from the recovery history instead.
  return {
    coupon: { ...coupon, customer },
    alreadyCreated: false,
    emailStatus: "not_sent" as const,
  };
}
