import { CouponEmail } from "./coupon-template";
import { resend, resendFrom } from "./resend";

type SendCouponEmailInput = {
  email: string;
  couponCode: string;
  discount: number;
  expiryDate: string;
  bookingUrl: string;
  unsubscribeUrl: string;
};

export async function sendCouponEmail({
  email,
  couponCode,
  discount,
  expiryDate,
  bookingUrl,
  unsubscribeUrl,
}: SendCouponEmailInput) {
  const { data, error } =
    await resend.emails.send({
      from: resendFrom,
      to: [email],
      subject: `${discount}% off at AK Hair & Beauty Salon — ${couponCode}`,
      react: CouponEmail({
        couponCode,
        discount,
        expiryDate,
        bookingUrl,
        unsubscribeUrl,
      }),
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
      },
    });

  if (error) {
    throw new Error(
      error.message ||
        "Unable to send coupon email."
    );
  }

  return data;
}
