"use client";

import { useState } from "react";

type Props = {
  appointmentId: string;
  status: string;
};

type CompensationCoupon = {
  id: string;
  code: string;
  discount: number;
  expiresAt: string;
  customerName?: string | null;
  phone?: string | null;
  whatsappMessage?: string;
};

function formatPhone(
  phone?: string | null
) {
  if (!phone) {
    return "No phone number";
  }

  const digits =
    phone.replace(/\D/g, "");

  if (
    digits.length === 12 &&
    digits.startsWith("91")
  ) {
    const local =
      digits.slice(2);

    return `+91 ${local.slice(
      0,
      5
    )} ${local.slice(5)}`;
  }

  if (
    digits.length === 10
  ) {
    return `+91 ${digits.slice(
      0,
      5
    )} ${digits.slice(5)}`;
  }

  return phone;
}

function buildMessage(
  name: string,
  coupon: CompensationCoupon
) {
  const firstName =
    name
      .trim()
      .split(/\s+/)[0] ||
    "there";

  const expiry =
    new Date(
      coupon.expiresAt
    ).toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }
    );

  return `Hi ${firstName}, we're very sorry for the inconvenience caused by the cancellation of your appointment at AK Hair & Beauty Salon.

As an apology, we've created a ${coupon.discount}% off coupon for your next appointment.

Your coupon code is: ${coupon.code}

This coupon can be used once and is valid until ${expiry}.

We apologise again and hope to see you soon.`;
}

export default function AdminAppointmentActions({
  appointmentId,
  status,
}: Props) {
  const [open, setOpen] =
    useState(false);

  const [reason, setReason] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [coupon, setCoupon] =
    useState<CompensationCoupon | null>(
      null
    );

  const [copied, setCopied] =
    useState("");

  async function copy(
    text: string,
    label: string
  ) {
    try {
      await navigator.clipboard.writeText(
        text
      );

      setCopied(label);

      setTimeout(
        () => setCopied(""),
        1500
      );
    } catch {
      setError(
        `Unable to copy ${label}.`
      );
    }
  }

  async function updateStatus(
    nextStatus:
      | "completed"
      | "no_show"
  ) {
    setSaving(true);
    setError("");

    try {
      const response =
        await fetch(
          `/api/admin/appointments/${appointmentId}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              status: nextStatus,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        setError(
          data.error ||
            "Unable to update appointment."
        );
        return;
      }

      window.location.reload();
    } catch {
      setError(
        "Unable to update appointment."
      );
    } finally {
      setSaving(false);
    }
  }

  async function cancelAppointment() {
    setSaving(true);
    setError("");

    try {
      const response =
        await fetch(
          `/api/admin/appointments/${appointmentId}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              status:
                "cancelled",
              cancellation_reason:
                reason.trim() ||
                "Stylist cancellation",
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        setError(
          data.error ||
            "Unable to cancel appointment."
        );
        return;
      }

      const generated =
        data.compensationCoupon;

      if (!generated) {
        window.location.reload();
        return;
      }

      setCoupon(
        generated
      );
    } catch {
      setError(
        "Unable to cancel appointment."
      );
    } finally {
      setSaving(false);
    }
  }

  if (
    status === "cancelled"
  ) {
    return null;
  }

  const phone =
    formatPhone(
      coupon?.phone
    );

  const message =
    coupon
      ? coupon.whatsappMessage ||
        buildMessage(
          coupon.customerName ||
            "Customer",
          coupon
        )
      : "";

  return (
    <div className="w-full lg:w-auto lg:min-w-[220px]">
      {!coupon && (
        <div className="flex flex-wrap gap-2 lg:justify-end">
          {status === "confirmed" && (
            <>
              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  updateStatus(
                    "completed"
                  )
                }
                className="rounded-full border px-4 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50"
              >
                Mark completed
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  updateStatus(
                    "no_show"
                  )
                }
                className="rounded-full border px-4 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50"
              >
                No-show
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  setOpen(
                    (value) =>
                      !value
                  )
                }
                className="rounded-full border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      )}

      {error && (
        <p className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}

      {open && !coupon && (
        <div className="mt-3 rounded-2xl border border-red-100 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-700">
            Cancel appointment?
          </p>

          <p className="mt-1 text-xs text-red-600">
            A one-time 15% compensation coupon
            will be generated automatically.
          </p>

          <textarea
            value={reason}
            onChange={(event) =>
              setReason(
                event.target.value
              )
            }
            placeholder="Reason"
            rows={3}
            className="mt-3 w-full rounded-xl border border-red-200 bg-white px-3 py-2 text-sm"
          />

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() =>
                setOpen(false)
              }
              className="rounded-full border bg-white px-4 py-2 text-sm"
            >
              Keep appointment
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={
                cancelAppointment
              }
              className="rounded-full bg-red-600 px-4 py-2 text-sm text-white"
            >
              {saving
                ? "Cancelling..."
                : "Confirm cancellation"}
            </button>
          </div>
        </div>
      )}

      {coupon && (
        <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="font-semibold text-emerald-800">
            Compensation coupon generated
          </p>

          <div className="mt-4 space-y-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-neutral-500">
                Customer
              </p>

              <p className="font-medium">
                {coupon.customerName ||
                  "Customer"}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider text-neutral-500">
                Phone
              </p>

              <div className="mt-1 flex gap-2">
                <code className="flex-1 rounded-lg bg-white px-3 py-2 text-sm">
                  {phone}
                </code>

                <button
                  type="button"
                  onClick={() =>
                    copy(
                      coupon.phone ||
                        "",
                      "Phone"
                    )
                  }
                  className="rounded-lg border bg-white px-3 py-2 text-xs"
                >
                  {copied === "Phone"
                    ? "Copied!"
                    : "Copy"}
                </button>
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider text-neutral-500">
                Coupon
              </p>

              <div className="mt-1 flex gap-2">
                <code className="flex-1 rounded-lg bg-white px-3 py-2 font-semibold">
                  {coupon.code}
                </code>

                <button
                  type="button"
                  onClick={() =>
                    copy(
                      coupon.code,
                      "Coupon"
                    )
                  }
                  className="rounded-lg border bg-white px-3 py-2 text-xs"
                >
                  {copied === "Coupon"
                    ? "Copied!"
                    : "Copy"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-neutral-500">
                  Discount
                </p>
                <p className="font-semibold">
                  {coupon.discount}%
                </p>
              </div>

              <div>
                <p className="text-xs text-neutral-500">
                  Valid until
                </p>
                <p className="font-semibold">
                  {new Date(
                    coupon.expiresAt
                  ).toLocaleDateString(
                    "en-IN"
                  )}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider text-neutral-500">
                WhatsApp message
              </p>

              <textarea
                readOnly
                value={message}
                rows={8}
                className="mt-1 w-full rounded-xl border bg-white p-3 text-sm leading-6"
              />

              <button
                type="button"
                onClick={() =>
                  copy(
                    message,
                    "Message"
                  )
                }
                className="mt-2 w-full rounded-xl bg-neutral-900 px-4 py-3 text-sm text-white"
              >
                {copied === "Message"
                  ? "Message copied!"
                  : "Copy WhatsApp Message"}
              </button>
            </div>

            <button
              type="button"
              onClick={() =>
                window.location.reload()
              }
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
