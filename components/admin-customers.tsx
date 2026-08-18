"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";

type Customer = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  referral_code?: string | null;
  referral_points?: number | null;
  created_at?: string | null;
};

type CustomerDetail = {
  customer: Customer & { marketing_unsubscribed_at?: string | null };
  summary: {
    total_spent: number;
    lifetime_visits: number;
    visits_this_year: number;
    total_bookings: number;
    cancelled_bookings: number;
    average_spend: number;
    coupons_used: number;
    people_referred: number;
    referral_points: number;
  };
  appointments: Array<{
    id: string;
    start_time: string;
    status: string;
    price: number;
    discount_amount?: number;
    coupon_code?: string | null;
    booking_source?: string;
    service?: { id: string; name: string } | null;
    stylist?: { id: string; name: string } | null;
  }>;
  coupon_usage: Array<{
    id: string;
    created_at: string;
    appointment_id?: string | null;
    coupon?: { code: string; discount_type: string; discount_value: number } | null;
  }>;
  issued_coupons: Array<{
    id: string;
    code: string;
    discount_type: string;
    discount_value: number;
    source?: string | null;
    reason?: string | null;
    issued_at?: string | null;
    redeemed_at?: string | null;
    expires_at?: string | null;
    active?: boolean;
  }>;
  referrals: Array<{
    id: string;
    purchase_amount: number;
    reward_points: number;
    created_at: string;
    referred_customer?: { id: string; name: string; email: string } | null;
  }>;
  referral_redemptions: Array<{
    id: string;
    points_redeemed: number;
    credit_amount: number;
    created_at: string;
  }>;
};

function formatPhone(phone: string | null) {
  if (!phone) return "No phone number";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  if (digits.length === 12 && digits.startsWith("91")) {
    const local = digits.slice(2);
    return `+91 ${local.slice(0, 5)} ${local.slice(5)}`;
  }
  return phone;
}

function money(value: number) {
  return `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/customers", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to load customers.");
      setCustomers(result.rows || []);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Unable to load customers.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function openCustomer(customer: Customer) {
    setSelectedCustomer(customer);
    setDetail(null);
    setDetailError("");
    setDetailLoading(true);

    try {
      const response = await fetch(`/api/admin/customers/${encodeURIComponent(customer.id)}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to load customer details.");
      setDetail(result);
    } catch (error: unknown) {
      setDetailError(error instanceof Error ? error.message : "Unable to load customer details.");
    } finally {
      setDetailLoading(false);
    }
  }

  function closeCustomer() {
    setSelectedCustomer(null);
    setDetail(null);
    setDetailError("");
  }

  const shown = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return customers;
    return customers.filter((customer) =>
      [customer.name, customer.email, customer.phone, customer.referral_code]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [customers, search]);

  return (
    <div className="mt-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-neutral-500">{customers.length} customers</p>
          <p className="mt-1 text-sm text-neutral-400">Click a customer to view their complete salon history.</p>
        </div>

        <div className="flex items-center rounded-xl border bg-white px-3 shadow-sm">
          <Search size={16} className="text-neutral-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-48 bg-transparent p-2.5 text-sm outline-none"
            placeholder="Search customers"
          />
        </div>
      </div>

      {error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="mt-5 overflow-x-auto rounded-3xl border border-black/5 bg-white shadow-sm">
        <div className="min-w-[980px]">
          <div className="hidden grid-cols-[1.2fr_1.45fr_1.1fr_1.15fr_130px] border-b bg-neutral-50 px-5 py-3 text-xs uppercase tracking-wider text-neutral-400 md:grid">
            <span>Customer</span>
            <span>Contact</span>
            <span>Referral</span>
            <span>Referral points earned</span>
            <span>Joined</span>
          </div>

          {loading ? (
            <div className="p-8 text-sm text-neutral-500">Loading customers...</div>
          ) : shown.length ? (
            shown.map((customer) => (
              <button
                key={customer.id}
                type="button"
                onClick={() => openCustomer(customer)}
                className="grid w-full gap-4 border-b px-5 py-5 text-left transition hover:bg-neutral-50 last:border-0 md:grid-cols-[1.2fr_1.45fr_1.1fr_1.15fr_130px] md:items-center"
              >
                <div>
                  <p className="font-medium text-neutral-900">{customer.name || "Unnamed customer"}</p>
                  <p className="mt-1 text-xs text-neutral-400">{customer.role}</p>
                </div>

                <div className="text-sm">
                  <p className="break-all text-neutral-800">{customer.email || "No email"}</p>
                  <p className="mt-1 text-neutral-500">{formatPhone(customer.phone)}</p>
                </div>

                <div>
                  {customer.referral_code ? (
                    <>
                      <p className="font-medium tracking-wide">{customer.referral_code}</p>
                      <p className="mt-1 text-xs text-neutral-500">{Number(customer.referral_points || 0)} points</p>
                    </>
                  ) : (
                    <span className="text-sm text-neutral-400">Not available</span>
                  )}
                </div>

                <div className="text-sm text-neutral-600">{Number(customer.referral_points || 0)} points</div>

                <div className="text-sm text-neutral-500">{formatDate(customer.created_at)}</div>
              </button>
            ))
          ) : (
            <div className="p-10 text-center text-sm text-neutral-500">No customers found.</div>
          )}
        </div>
      </div>

      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Customer details">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-[#fbf7f3] shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-5 border-b border-black/10 bg-[#fbf7f3]/95 px-6 py-5 backdrop-blur sm:px-8">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Customer record</p>
                <h2 className="mt-1 text-2xl font-semibold">{selectedCustomer.name || "Unnamed customer"}</h2>
                <p className="mt-1 text-sm text-neutral-500">{selectedCustomer.email || "No email"} · {formatPhone(selectedCustomer.phone)}</p>
              </div>
              <button type="button" onClick={closeCustomer} className="rounded-full border border-black/10 bg-white p-2 hover:bg-neutral-50" aria-label="Close customer record">
                <X size={18} />
              </button>
            </div>

            {detailLoading ? (
              <div className="p-10 text-center text-sm text-neutral-500">Loading customer history...</div>
            ) : detailError ? (
              <div className="p-8"><div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{detailError}</div></div>
            ) : detail ? (
              <div className="space-y-6 px-6 py-6 sm:px-8 sm:py-8">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Metric label="Total spent" value={money(detail.summary.total_spent)} />
                  <Metric label="Visits this year" value={String(detail.summary.visits_this_year)} helper={`${detail.summary.lifetime_visits} lifetime completed visits`} />
                  <Metric label="Bookings" value={String(detail.summary.total_bookings)} helper={`${detail.summary.cancelled_bookings} cancelled`} />
                  <Metric label="Average visit" value={money(detail.summary.average_spend)} />
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <SmallMetric label="Coupons used" value={detail.summary.coupons_used} />
                  <SmallMetric label="People referred" value={detail.summary.people_referred} />
                  <SmallMetric label="Referral points" value={detail.summary.referral_points} />
                </div>

                <div className="rounded-2xl border border-black/10 bg-white px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-neutral-400">Customer since</p>
                      <p className="mt-1 text-sm font-medium">{formatDate(detail.customer.created_at)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-neutral-400">Referral code</p>
                      <p className="mt-1 text-sm font-medium">{detail.customer.referral_code || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-neutral-400">Marketing</p>
                      <p className="mt-1 text-sm font-medium">{detail.customer.marketing_unsubscribed_at ? "Unsubscribed" : "Subscribed"}</p>
                    </div>
                  </div>
                </div>

                <HistorySection title="Visit & booking history" count={detail.appointments.length} defaultOpen>
                  {detail.appointments.length ? (
                    <div className="divide-y divide-black/10">
                      {detail.appointments.map((appointment) => (
                        <div key={appointment.id} className="grid gap-3 px-1 py-4 sm:grid-cols-[1.2fr_1.2fr_1fr_auto] sm:items-center">
                          <div>
                            <p className="font-medium">{appointment.service?.name || "Service"}</p>
                            <p className="mt-1 text-xs text-neutral-500">{formatDateTime(appointment.start_time)}</p>
                          </div>
                          <div className="text-sm text-neutral-600">{appointment.stylist?.name || "Stylist not recorded"}</div>
                          <div>
                            <StatusBadge status={appointment.status} />
                            <p className="mt-1 text-xs text-neutral-400">{appointment.booking_source || "online"}{appointment.coupon_code ? ` · ${appointment.coupon_code}` : ""}</p>
                          </div>
                          <div className="text-right font-medium">{money(Number(appointment.price))}</div>
                        </div>
                      ))}
                    </div>
                  ) : <Empty text="No bookings recorded for this customer." />}
                </HistorySection>

                <HistorySection title="Coupons & discounts" count={detail.coupon_usage.length + detail.issued_coupons.length}>
                  {detail.coupon_usage.length || detail.issued_coupons.length ? (
                    <div className="space-y-4">
                      {detail.coupon_usage.length > 0 && (
                        <div>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">Used</p>
                          <div className="divide-y divide-black/10 rounded-xl border border-black/5">
                            {detail.coupon_usage.map((usage) => (
                              <div key={usage.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                                <div><p className="font-medium">{usage.coupon?.code || "Coupon"}</p><p className="text-xs text-neutral-500">{formatDate(usage.created_at)}</p></div>
                                <span className="text-neutral-600">{usage.coupon ? `${usage.coupon.discount_type === "percentage" ? `${usage.coupon.discount_value}%` : money(Number(usage.coupon.discount_value))} off` : "Used"}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {detail.issued_coupons.length > 0 && (
                        <div>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">Issued to customer</p>
                          <div className="divide-y divide-black/10 rounded-xl border border-black/5">
                            {detail.issued_coupons.map((coupon) => (
                              <div key={coupon.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                                <div><p className="font-medium">{coupon.code}</p><p className="text-xs text-neutral-500">{coupon.source || "manual"}{coupon.reason ? ` · ${coupon.reason}` : ""}</p></div>
                                <div className="text-right"><p>{coupon.discount_type === "percentage" ? `${coupon.discount_value}%` : money(Number(coupon.discount_value))} off</p><p className="text-xs text-neutral-500">{coupon.redeemed_at ? `Redeemed ${formatDate(coupon.redeemed_at)}` : `Issued ${formatDate(coupon.issued_at)}`}</p></div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : <Empty text="No coupon activity recorded." />}
                </HistorySection>

                <HistorySection title="Referral history" count={detail.referrals.length}>
                  {detail.referrals.length ? (
                    <div className="divide-y divide-black/10">
                      {detail.referrals.map((referral) => (
                        <div key={referral.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                          <div><p className="font-medium">{referral.referred_customer?.name || "Referred customer"}</p><p className="text-xs text-neutral-500">{referral.referred_customer?.email || ""} · {formatDate(referral.created_at)}</p></div>
                          <div className="text-right"><p className="font-medium">+{referral.reward_points} points</p><p className="text-xs text-neutral-500">Purchase {money(Number(referral.purchase_amount))}</p></div>
                        </div>
                      ))}
                    </div>
                  ) : <Empty text="This customer has not referred anyone yet." />}
                </HistorySection>

                <HistorySection title="Referral rewards redeemed" count={detail.referral_redemptions.length}>
                  {detail.referral_redemptions.length ? (
                    <div className="divide-y divide-black/10">
                      {detail.referral_redemptions.map((redemption) => (
                        <div key={redemption.id} className="flex items-center justify-between py-4 text-sm"><span>{formatDateTime(redemption.created_at)}</span><span className="font-medium">{redemption.points_redeemed} points redeemed · {money(Number(redemption.credit_amount))} credit</span></div>
                      ))}
                    </div>
                  ) : <Empty text="No referral points have been redeemed." />}
                </HistorySection>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return <div className="rounded-2xl border border-black/10 bg-white p-5"><p className="text-xs uppercase tracking-wider text-neutral-400">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p>{helper && <p className="mt-1 text-xs text-neutral-500">{helper}</p>}</div>;
}

function SmallMetric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl border border-black/10 bg-white px-5 py-4"><p className="text-xs uppercase tracking-wider text-neutral-400">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p></div>;
}

function HistorySection({ title, count, children, defaultOpen = false }: { title: string; count: number; children: React.ReactNode; defaultOpen?: boolean }) {
  return <details className="group rounded-2xl border border-black/10 bg-white" open={defaultOpen}><summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4"><span><span className="font-semibold">{title}</span><span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">{count}</span></span><ChevronDown size={18} className="transition group-open:rotate-180" /></summary><div className="border-t border-black/10 px-5">{children}</div></details>;
}

function StatusBadge({ status }: { status: string }) {
  return <span className="inline-flex rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium capitalize text-neutral-700">{status.replace("_", " ")}</span>;
}

function Empty({ text }: { text: string }) {
  return <div className="py-6 text-sm text-neutral-500">{text}</div>;
}
