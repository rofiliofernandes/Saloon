type CouponEmailProps = {
  couponCode: string;
  discount: number;
  expiryDate: string;
  bookingUrl: string;
  unsubscribeUrl: string;
};

export function CouponEmail({
  couponCode,
  discount,
  expiryDate,
  bookingUrl,
  unsubscribeUrl,
}: CouponEmailProps) {
  return (
    <div
      style={{
        margin: 0,
        padding: "40px 20px",
        backgroundColor: "#f7f4ef",
        fontFamily:
          "Arial, Helvetica, sans-serif",
        color: "#211d1a",
      }}
    >
      <div
        style={{
          maxWidth: "600px",
          margin: "0 auto",
          backgroundColor: "#ffffff",
          borderRadius: "24px",
          overflow: "hidden",
          border: "1px solid #e7dfd4",
        }}
      >
        {/* BRAND */}
        <div
          style={{
            padding: "30px 30px 24px",
            textAlign: "center",
            borderBottom:
              "1px solid #eee8df",
          }}
        >
          <div
            style={{
              fontSize: "30px",
              fontFamily: "Georgia, serif",
              letterSpacing: "2px",
              color: "#a87820",
              fontWeight: "600",
            }}
          >
            AK
          </div>

          <div
            style={{
              marginTop: "7px",
              fontSize: "10px",
              letterSpacing: "3px",
              textTransform: "uppercase",
              color: "#8d6827",
            }}
          >
            Hair &amp; Beauty Salon
          </div>
        </div>

        {/* HERO */}
        <div
          style={{
            padding: "48px 32px 42px",
            textAlign: "center",
            backgroundColor: "#211d1a",
            color: "#ffffff",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              letterSpacing: "3px",
              textTransform: "uppercase",
              color: "#d8c1aa",
              marginBottom: "18px",
            }}
          >
            A little something for you
          </div>

          <h1
            style={{
              margin: 0,
              fontFamily: "Georgia, serif",
              fontSize: "38px",
              lineHeight: "1.1",
              fontWeight: "500",
            }}
          >
            Enjoy {discount}% off
          </h1>

          <p
            style={{
              margin: "18px auto 0",
              maxWidth: "420px",
              fontSize: "15px",
              lineHeight: "1.7",
              color: "#ffffff",
              opacity: 0.72,
            }}
          >
            Treat yourself to your next
            salon experience at AK Hair &amp;
            Beauty Salon.
          </p>
        </div>

        {/* COUPON */}
        <div
          style={{
            padding: "38px 32px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              letterSpacing: "2px",
              textTransform: "uppercase",
              color: "#99918a",
              marginBottom: "12px",
            }}
          >
            Your exclusive coupon
          </div>

          <div
            style={{
              display: "inline-block",
              padding: "16px 28px",
              borderRadius: "14px",
              border: "1px dashed #bd9144",
              backgroundColor: "#faf8f4",
              color: "#8d6827",
              fontFamily:
                "Georgia, serif",
              fontSize: "26px",
              fontWeight: "600",
              letterSpacing: "3px",
            }}
          >
            {couponCode}
          </div>

          <p
            style={{
              margin: "18px 0 0",
              fontSize: "13px",
              color: "#77716b",
            }}
          >
            Valid until {expiryDate}
          </p>

          <div style={{ marginTop: "28px" }}>
            <a
              href={bookingUrl}
              style={{
                display: "inline-block",
                padding: "14px 28px",
                borderRadius: "999px",
                backgroundColor: "#211d1a",
                color: "#ffffff",
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: "600",
              }}
            >
              Book now
            </a>
          </div>
        </div>

        {/* FOOTER */}
        <div
          style={{
            padding: "24px 30px 30px",
            borderTop:
              "1px solid #eee8df",
            textAlign: "center",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: "11px",
              lineHeight: "1.6",
              color: "#99918a",
            }}
          >
            AK Hair &amp; Beauty Salon
          </p>

          <p
            style={{
              margin: "8px 0 0",
              fontSize: "11px",
              lineHeight: "1.6",
              color: "#aaa39d",
            }}
          >
            You are receiving this email because
            you are a customer of AK Hair &amp;
            Beauty Salon.
          </p>

          <p
            style={{
              margin: "12px 0 0",
              fontSize: "11px",
            }}
          >
            <a
              href={unsubscribeUrl}
              style={{
                color: "#8d6827",
                textDecoration: "underline",
              }}
            >
              Unsubscribe from promotional emails
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
