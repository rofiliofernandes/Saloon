"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Mail,
  Plus,
  XCircle,
} from "lucide-react";

function getTodayDate() {
  const now = new Date();

  const year = now.getFullYear();

  const month = String(
    now.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    now.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

type CampaignStats = {
  total: number;
  sent: number;
  failed: number;
  unsubscribed: number;
  pending: number;
};

type Coupon = {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  expires_at: string | null;
  created_at: string;
  campaign?: CampaignStats | null;
};

type Recipient = {
  id: string;
  email: string;
  status: string;
  resend_id: string | null;
  error: string | null;
  sent_at: string | null;
};

function formatDate(value: string | null) {
  if (!value) {
    return "No expiry";
  }

  return new Date(value).toLocaleDateString(
    "en-IN",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  );
}

function emptyStats(): CampaignStats {
  return {
    total: 0,
    sent: 0,
    failed: 0,
    unsubscribed: 0,
    pending: 0,
  };
}

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>(
    []
  );

  const [loading, setLoading] =
    useState(true);

  const [creating, setCreating] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [code, setCode] = useState("");

  const [discount, setDiscount] =
    useState("20");

  const [expiresAt, setExpiresAt] =
    useState("2026-09-30");

  const [emailCustomers, setEmailCustomers] =
    useState(true);

  const [expandedCoupon, setExpandedCoupon] =
    useState<string | null>(null);

  const [recipients, setRecipients] =
    useState<Record<string, Recipient[]>>(
      {}
    );

  const [loadingRecipients, setLoadingRecipients] =
    useState<string | null>(null);

  async function loadCoupons() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/admin/coupons",
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to load coupons."
        );
      }

      setCoupons(data.coupons || []);
    } catch (err: any) {
      setError(
        err?.message ||
          "Unable to load coupons."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCoupons();
  }, []);

  async function createCoupon(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");
    setCreating(true);

    try {
      const response = await fetch(
        "/api/admin/coupons",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            code,
            discount_type: "percentage",
            discount_value:
              Number(discount),
            expires_at: expiresAt,
            email_customers:
              emailCustomers,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to create coupon."
        );
      }

      setSuccess(
        emailCustomers
          ? `Coupon created. ${data.sent ?? 0} emails sent, ${data.failed ?? 0} failed, ${data.unsubscribed ?? 0} unsubscribed.`
          : "Coupon created successfully."
      );

      setCode("");
      setDiscount("20");
      setExpiresAt("2026-09-30");

      await loadCoupons();
    } catch (err: any) {
      setError(
        err?.message ||
          "Unable to create coupon."
      );
    } finally {
      setCreating(false);
    }
  }

  async function toggleRecipients(
    couponId: string
  ) {
    if (expandedCoupon === couponId) {
      setExpandedCoupon(null);
      return;
    }

    setExpandedCoupon(couponId);

    if (recipients[couponId]) {
      return;
    }

    setLoadingRecipients(couponId);

    try {
      const response = await fetch(
        `/api/admin/coupons/${couponId}/recipients`,
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to load recipients."
        );
      }

      setRecipients((current) => ({
        ...current,
        [couponId]:
          data.recipients || [],
      }));
    } catch (err: any) {
      setError(
        err?.message ||
          "Unable to load recipients."
      );
    } finally {
      setLoadingRecipients(null);
    }
  }

  return (
    <div className="mt-8 space-y-8">
      {/* CREATE COUPON */}

      <section className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f7f1e6] text-[#a87820]">
            <Plus size={20} />
          </div>

          <div>
            <h2 className="text-xl font-semibold">
              Create coupon
            </h2>

            <p className="mt-1 text-sm text-neutral-500">
              Create a discount and optionally
              send it to your customers.
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        )}

        <form
          onSubmit={createCoupon}
          className="mt-7 grid gap-5 sm:grid-cols-2"
        >
          <label className="block text-sm">
            <span className="font-medium">
              Coupon code
            </span>

            <input
              value={code}
              onChange={(event) =>
                setCode(
                  event.target.value
                    .toUpperCase()
                    .replace(/\s/g, "")
                )
              }
              placeholder="BRIDAL20"
              className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-3 outline-none transition focus:border-[#bd9144] focus:ring-2 focus:ring-[#bd9144]/10"
              required
            />
          </label>

          <label className="block text-sm">
            <span className="font-medium">
              Discount
            </span>

            <div className="mt-2 flex">
              <input
                type="number"
                min="1"
                max="100"
                value={discount}
                onChange={(event) =>
                  setDiscount(
                    event.target.value
                  )
                }
                className="w-full rounded-l-2xl border border-r-0 border-black/10 px-4 py-3 outline-none focus:border-[#bd9144] focus:ring-2 focus:ring-[#bd9144]/10"
                required
              />

              <span className="flex items-center rounded-r-2xl border border-black/10 bg-neutral-50 px-4 text-sm text-neutral-500">
                %
              </span>
            </div>
          </label>

          <label className="block text-sm">
            <span className="font-medium">
              Valid until
            </span>

            <input
              type="date"
              value={expiresAt}
               min={getTodayDate()}
              onChange={(event) =>
                setExpiresAt(
                  event.target.value
                )
              }
              className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-3 outline-none focus:border-[#bd9144] focus:ring-2 focus:ring-[#bd9144]/10"
              required
            />
          </label>

          <div className="flex items-end">
            <label className="flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-black/10 bg-neutral-50 px-4 py-3">
              <input
                type="checkbox"
                checked={emailCustomers}
                onChange={(event) =>
                  setEmailCustomers(
                    event.target.checked
                  )
                }
                className="h-4 w-4 accent-[#bd9144]"
              />

              <span className="text-sm">
                Email this coupon to all customers
              </span>
            </label>
          </div>

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={creating}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#211d1a] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#302a26] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Mail size={16} />

              {creating
                ? "Creating & sending..."
                : "Create coupon"}
            </button>
          </div>
        </form>
      </section>

      {/* COUPONS */}

      <section>
        <div className="mb-4">
          <h2 className="text-xl font-semibold">
            Coupons & campaigns
          </h2>

          <p className="mt-1 text-sm text-neutral-500">
            See coupon usage and email delivery
            results without leaving the Admin panel.
          </p>
        </div>

        {loading ? (
          <div className="rounded-3xl border bg-white p-8 text-center text-sm text-neutral-500">
            Loading coupons...
          </div>
        ) : !coupons.length ? (
          <div className="rounded-3xl border bg-white p-8 text-center text-sm text-neutral-500">
            No coupons created yet.
          </div>
        ) : (
          <div className="space-y-4">
            {coupons.map((coupon) => {
              const stats =
                coupon.campaign ||
                emptyStats();

              const expanded =
                expandedCoupon === coupon.id;

              const progress =
                stats.total > 0
                  ? Math.round(
                      (stats.sent /
                        stats.total) *
                        100
                    )
                  : 0;

              return (
                <div
                  key={coupon.id}
                  className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-sm"
                >
                  <div className="p-6">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="font-mono text-xl font-semibold tracking-wide">
                            {coupon.code}
                          </h3>

                          <span className="rounded-full bg-[#f7f1e6] px-3 py-1 text-xs font-medium text-[#8d6827]">
                            {coupon.discount_value}%
                            OFF
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-neutral-500">
                          Valid until{" "}
                          {formatDate(
                            coupon.expires_at
                          )}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          toggleRecipients(
                            coupon.id
                          )
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-black/10 px-4 py-2 text-sm font-medium transition hover:bg-neutral-50"
                      >
                        {expanded
                          ? "Hide recipients"
                          : "View recipients"}

                        {expanded ? (
                          <ChevronUp size={16} />
                        ) : (
                          <ChevronDown
                            size={16}
                          />
                        )}
                      </button>
                    </div>

                    {/* CAMPAIGN STATS */}

                    <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                      <div className="rounded-2xl bg-neutral-50 p-4">
                        <p className="text-xs text-neutral-500">
                          Recipients
                        </p>

                        <p className="mt-1 text-xl font-semibold">
                          {stats.total}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-emerald-50 p-4">
                        <p className="text-xs text-emerald-700">
                          Sent
                        </p>

                        <p className="mt-1 text-xl font-semibold text-emerald-800">
                          {stats.sent}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-red-50 p-4">
                        <p className="text-xs text-red-700">
                          Failed
                        </p>

                        <p className="mt-1 text-xl font-semibold text-red-800">
                          {stats.failed}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-amber-50 p-4">
                        <p className="text-xs text-amber-700">
                          Unsubscribed
                        </p>

                        <p className="mt-1 text-xl font-semibold text-amber-800">
                          {stats.unsubscribed}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-blue-50 p-4">
                        <p className="text-xs text-blue-700">
                          Pending
                        </p>

                        <p className="mt-1 text-xl font-semibold text-blue-800">
                          {stats.pending}
                        </p>
                      </div>
                    </div>

                    {stats.total > 0 && (
                      <div className="mt-5">
                        <div className="mb-2 flex justify-between text-xs text-neutral-500">
                          <span>
                            Email delivery
                          </span>

                          <span>
                            {progress}% sent
                          </span>
                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
                          <div
                            className="h-full rounded-full bg-[#bd9144] transition-all"
                            style={{
                              width: `${progress}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* RECIPIENTS */}

                  {expanded && (
                    <div className="border-t border-black/5 bg-neutral-50/70">
                      {loadingRecipients ===
                      coupon.id ? (
                        <div className="p-6 text-center text-sm text-neutral-500">
                          Loading recipients...
                        </div>
                      ) : !recipients[
                          coupon.id
                        ]?.length ? (
                        <div className="p-6 text-center text-sm text-neutral-500">
                          No email recipients recorded.
                        </div>
                      ) : (
                        <div className="divide-y divide-black/5">
                          {recipients[
                            coupon.id
                          ].map(
                            (recipient) => (
                              <div
                                key={
                                  recipient.id
                                }
                                className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium">
                                    {
                                      recipient.email
                                    }
                                  </p>

                                  {recipient.error && (
                                    <p className="mt-1 text-xs text-red-600">
                                      {
                                        recipient.error
                                      }
                                    </p>
                                  )}
                                </div>

                                {recipient.status ===
                                "sent" ? (
                                  <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-emerald-700">
                                    <CheckCircle2
                                      size={15}
                                    />
                                    Sent
                                  </span>
                                ) : recipient.status ===
                                  "failed" ? (
                                  <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-red-700">
                                    <XCircle
                                      size={15}
                                    />
                                    Failed
                                  </span>
                                ) : (
                                  <span className="text-xs font-medium text-neutral-500">
                                    {recipient.status}
                                  </span>
                                )}
                              </div>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
