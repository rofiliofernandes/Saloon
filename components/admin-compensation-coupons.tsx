"use client";

import { useEffect, useMemo, useState } from "react";

type CompensationCoupon = {
  id: string;
  code: string;
  discount: number;
  discountType: string;
  usageLimit: number | null;
  usedCount: number;
  expiresAt: string | null;
  createdAt: string | null;
  active: boolean;
  status: "unused" | "used" | "expired";
  reason: string;

  customer: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    whatsappPhone: string | null;
  } | null;

  appointment: {
    id: string;
    startTime: string;
    status: string;
    stylist: {
      id: string;
      name: string;
    } | null;
  } | null;

  whatsappMessage: string;
};

function formatDate(value: string | null) {
  if (!value) return "—";

  return new Date(value).toLocaleDateString(
    "en-IN",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    }
  );
}

function formatDateTime(value: string | null) {
  if (!value) return "—";

  return new Date(value).toLocaleString(
    "en-IN",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Kolkata",
    }
  );
}

function StatusBadge({
  status,
}: {
  status: CompensationCoupon["status"];
}) {
  const label =
    status === "unused"
      ? "UNUSED"
      : status === "used"
        ? "USED"
        : "EXPIRED";

  const classes =
    status === "unused"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : status === "used"
        ? "bg-blue-50 text-blue-700 border-blue-200"
        : "bg-neutral-100 text-neutral-500 border-neutral-200";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide ${classes}`}
    >
      {label}
    </span>
  );
}

function CopyButton({
  text,
  children,
}: {
  text: string;
  children: React.ReactNode;
}) {
  const [copied, setCopied] =
    useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);

      window.setTimeout(
        () => setCopied(false),
        1600
      );
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="rounded-lg border border-black/10 bg-white px-3 py-2 text-xs font-medium text-neutral-800 transition hover:bg-neutral-50"
    >
      {copied ? "Copied!" : children}
    </button>
  );
}

export default function AdminCompensationCoupons() {
  const [coupons, setCoupons] =
    useState<CompensationCoupon[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  async function load() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "/api/admin/coupons/compensation",
        {
          cache: "no-store",
        }
      );

      const json = await response.json();

      if (!response.ok) {
        throw new Error(
          json.error ||
            "Unable to load compensation coupons."
        );
      }

      setCoupons(
        json.compensationCoupons ?? []
      );
    } catch (error: any) {
      setError(
        error?.message ||
          "Unable to load compensation coupons."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filteredCoupons = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    if (!query) return coupons;

    return coupons.filter((coupon) => {
      return [
        coupon.code,
        coupon.customer?.name,
        coupon.customer?.phone,
        coupon.appointment?.stylist?.name,
        coupon.status,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value)
            .toLowerCase()
            .includes(query)
        );
    });
  }, [coupons, search]);

  const unused = coupons.filter(
    (coupon) => coupon.status === "unused"
  ).length;

  const used = coupons.filter(
    (coupon) => coupon.status === "used"
  ).length;

  const expired = coupons.filter(
    (coupon) => coupon.status === "expired"
  ).length;

  return (
    <section className="mt-8">
      <div className="rounded-3xl border border-black/10 bg-white shadow-sm">
        <div className="border-b border-black/10 p-6 sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-neutral-400">
                Customer recovery
              </p>

              <h2 className="mt-2 text-2xl font-semibold">
                Stylist Cancellation Coupons
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
                One-time compensation coupons generated
                automatically when a stylist cancellation
                affects a customer.
              </p>
            </div>

            <button
              type="button"
              onClick={load}
              className="rounded-xl border border-black/10 px-4 py-2.5 text-sm font-medium hover:bg-neutral-50"
            >
              Refresh
            </button>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-neutral-50 p-4">
              <p className="text-xs text-neutral-500">
                Unused
              </p>
              <p className="mt-1 text-2xl font-semibold">
                {unused}
              </p>
            </div>

            <div className="rounded-2xl bg-neutral-50 p-4">
              <p className="text-xs text-neutral-500">
                Used
              </p>
              <p className="mt-1 text-2xl font-semibold">
                {used}
              </p>
            </div>

            <div className="rounded-2xl bg-neutral-50 p-4">
              <p className="text-xs text-neutral-500">
                Expired
              </p>
              <p className="mt-1 text-2xl font-semibold">
                {expired}
              </p>
            </div>
          </div>

          <div className="mt-5">
            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search customer, phone, coupon or stylist..."
              className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-black"
            />
          </div>
        </div>

        {error && (
          <div className="m-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="p-8 text-sm text-neutral-500">
            Loading compensation coupons...
          </div>
        ) : filteredCoupons.length === 0 ? (
          <div className="p-8 text-center text-sm text-neutral-500">
            No compensation coupons found.
          </div>
        ) : (
          <div className="divide-y divide-black/10">
            {filteredCoupons.map((coupon) => (
              <div
                key={coupon.id}
                className="p-6 sm:p-8"
              >
                <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-lg font-semibold">
                        {coupon.customer?.name ||
                          "Unknown customer"}
                      </h3>

                      <StatusBadge
                        status={coupon.status}
                      />
                    </div>

                    <div className="mt-3 space-y-1 text-sm text-neutral-500">
                      <p>
                        Phone:{" "}
                        <span className="font-medium text-neutral-800">
                          {coupon.customer?.phone ||
                            "No phone number"}
                        </span>
                      </p>

                      <p>
                        Stylist:{" "}
                        <span className="font-medium text-neutral-800">
                          {coupon.appointment
                            ?.stylist?.name ||
                            "Unknown"}
                        </span>
                      </p>

                      <p>
                        Original appointment:{" "}
                        {formatDateTime(
                          coupon.appointment
                            ?.startTime || null
                        )}
                      </p>

                      <p>
                        Created:{" "}
                        {formatDate(
                          coupon.createdAt
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="xl:text-right">
                    <p className="text-xs uppercase tracking-wider text-neutral-400">
                      Coupon
                    </p>

                    <p className="mt-1 text-2xl font-semibold tracking-wide">
                      {coupon.code}
                    </p>

                    <p className="mt-1 text-sm text-neutral-500">
                      {coupon.discount}% off · one use
                    </p>

                    <p className="mt-1 text-xs text-neutral-400">
                      Valid until{" "}
                      {formatDate(
                        coupon.expiresAt
                      )}
                    </p>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl bg-neutral-50 p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">
                    WhatsApp
                  </p>

                  <p className="mt-3 whitespace-pre-line text-sm leading-6 text-neutral-700">
                    {coupon.whatsappMessage}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {coupon.customer
                      ?.phone && (
                      <CopyButton
                        text={
                          coupon.customer
                            .phone
                        }
                      >
                        Copy Phone
                      </CopyButton>
                    )}

                    <CopyButton
                      text={coupon.code}
                    >
                      Copy Coupon
                    </CopyButton>

                    <CopyButton
                      text={
                        coupon.whatsappMessage
                      }
                    >
                      Copy WhatsApp Message
                    </CopyButton>

                    {coupon.customer
                      ?.whatsappPhone && (
                      <a
                        href={`https://wa.me/${coupon.customer.whatsappPhone}?text=${encodeURIComponent(
                          coupon.whatsappMessage
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg bg-neutral-900 px-3 py-2 text-xs font-medium text-white hover:bg-neutral-800"
                      >
                        Open WhatsApp
                      </a>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-4 text-xs text-neutral-400">
                  <span>
                    Uses:{" "}
                    {coupon.usedCount} /{" "}
                    {coupon.usageLimit ?? 1}
                  </span>

                  <span>
                    Reason: {coupon.reason}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
