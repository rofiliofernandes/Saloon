"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, ExternalLink, RefreshCw } from "lucide-react";

type Outreach = {
  coupon_id: string;
  phone_copied_at: string | null;
  message_copied_at: string | null;
  whatsapp_opened_at: string | null;
  last_action: string | null;
  updated_at: string;
};

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
    stylist: { id: string; name: string } | null;
  } | null;
  whatsappMessage: string;
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

function StatusBadge({ status }: { status: CompensationCoupon["status"] }) {
  const label = status === "unused" ? "UNUSED" : status === "used" ? "USED" : "EXPIRED";
  const classes = status === "unused"
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : status === "used"
      ? "bg-blue-50 text-blue-700 border-blue-200"
      : "bg-neutral-100 text-neutral-500 border-neutral-200";

  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide ${classes}`}>{label}</span>;
}

export default function AdminCompensationCoupons() {
  const [coupons, setCoupons] = useState<CompensationCoupon[]>([]);
  const [outreach, setOutreach] = useState<Record<string, Outreach>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "needs_action" | "completed">("all");
  const [copying, setCopying] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      setError("");

      const [couponResponse, outreachResponse] = await Promise.all([
        fetch("/api/admin/coupons/compensation", { cache: "no-store" }),
        fetch("/api/admin/coupons/compensation/outreach", { cache: "no-store" }),
      ]);

      const couponJson = await couponResponse.json();
      const outreachJson = await outreachResponse.json();

      if (!couponResponse.ok) throw new Error(couponJson.error || "Unable to load compensation coupons.");
      if (!outreachResponse.ok) throw new Error(outreachJson.error || "Unable to load outreach history.");

      setCoupons(couponJson.compensationCoupons ?? []);
      setOutreach(
        Object.fromEntries(
          (outreachJson.history ?? []).map((row: Outreach) => [row.coupon_id, row])
        )
      );
    } catch (error: any) {
      setError(error?.message || "Unable to load compensation history.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function recordAction(couponId: string, action: "phone_copied" | "message_copied" | "whatsapp_opened") {
    try {
      const response = await fetch("/api/admin/coupons/compensation/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coupon_id: couponId, action }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Unable to save progress.");
      setOutreach((current) => ({ ...current, [couponId]: json.history }));
    } catch (error: any) {
      setError(error?.message || "Unable to save outreach progress.");
    }
  }

  async function copyText(couponId: string, text: string, action: "phone_copied" | "message_copied") {
    setCopying(`${couponId}:${action}`);
    try {
      await navigator.clipboard.writeText(text);
      await recordAction(couponId, action);
    } catch {
      setError("The text could not be copied. Please check browser clipboard permissions.");
    } finally {
      setCopying(null);
    }
  }

  const filteredCoupons = useMemo(() => {
    const query = search.trim().toLowerCase();
    return coupons.filter((coupon) => {
      const history = outreach[coupon.id];
      const completed = Boolean(history?.message_copied_at);
      const matchesFilter = filter === "all" || (filter === "completed" ? completed : !completed);
      if (!matchesFilter) return false;
      if (!query) return true;
      return [coupon.code, coupon.customer?.name, coupon.customer?.phone, coupon.appointment?.stylist?.name, coupon.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [coupons, outreach, search, filter]);

  const messageCopied = coupons.filter((coupon) => Boolean(outreach[coupon.id]?.message_copied_at)).length;
  const phoneCopied = coupons.filter((coupon) => Boolean(outreach[coupon.id]?.phone_copied_at)).length;
  const unused = coupons.filter((coupon) => coupon.status === "unused").length;
  const used = coupons.filter((coupon) => coupon.status === "used").length;
  const expired = coupons.filter((coupon) => coupon.status === "expired").length;
  const progress = coupons.length ? Math.round((messageCopied / coupons.length) * 100) : 0;

  return (
    <section className="mt-8">
      <div className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-sm">
        <div className="border-b border-black/10 p-6 sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.25em] text-neutral-400">Customer recovery</p>
              <h2 className="mt-2 text-2xl font-semibold">Stylist Cancellation Coupons</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
                One-time compensation coupons are created automatically when a stylist cancellation affects a customer. Coupon emails are disabled; use the saved copy history to continue customer outreach later.
              </p>
            </div>
            <button type="button" onClick={load} className="inline-flex items-center justify-center gap-2 rounded-xl border border-black/10 px-4 py-2.5 text-sm font-medium hover:bg-neutral-50">
              <RefreshCw size={15} /> Refresh
            </button>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-neutral-50 p-4"><p className="text-xs text-neutral-500">Messages copied</p><p className="mt-1 text-2xl font-semibold">{messageCopied} / {coupons.length}</p></div>
            <div className="rounded-2xl bg-neutral-50 p-4"><p className="text-xs text-neutral-500">Phones copied</p><p className="mt-1 text-2xl font-semibold">{phoneCopied} / {coupons.length}</p></div>
            <div className="rounded-2xl bg-neutral-50 p-4"><p className="text-xs text-neutral-500">Recovery progress</p><p className="mt-1 text-2xl font-semibold">{progress}%</p></div>
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-neutral-100">
            <div className="h-full rounded-full bg-neutral-900 transition-all" style={{ width: `${progress}%` }} />
          </div>

          <div className="mt-5 flex flex-col gap-3 lg:flex-row">
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search customer, phone, coupon or stylist..." className="min-w-0 flex-1 rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-black" />
            <div className="flex shrink-0 rounded-xl border border-black/10 p-1">
              {([['all', 'All'], ['needs_action', 'Needs message'], ['completed', 'Completed']] as const).map(([value, label]) => (
                <button key={value} type="button" onClick={() => setFilter(value)} className={`rounded-lg px-3 py-2 text-xs font-medium ${filter === value ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-50"}`}>{label}</button>
              ))}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-3 text-xs text-neutral-500">
            <span>{unused} unused</span><span>·</span><span>{used} used</span><span>·</span><span>{expired} expired</span>
          </div>
        </div>

        {error && <div className="m-6 break-words rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {loading ? (
          <div className="p-8 text-sm text-neutral-500">Loading compensation history...</div>
        ) : filteredCoupons.length === 0 ? (
          <div className="p-8 text-center text-sm text-neutral-500">No compensation coupons match this view.</div>
        ) : (
          <div className="divide-y divide-black/10">
            {filteredCoupons.map((coupon) => {
              const history = outreach[coupon.id];
              const phoneCopied = Boolean(history?.phone_copied_at);
              const messageCopied = Boolean(history?.message_copied_at);
              const whatsappOpened = Boolean(history?.whatsapp_opened_at);

              return (
                <div key={coupon.id} className="min-w-0 p-6 sm:p-8">
                  <div className="flex min-w-0 flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="max-w-full break-words text-lg font-semibold">{coupon.customer?.name || "Unknown customer"}</h3>
                        <StatusBadge status={coupon.status} />
                        {messageCopied && <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700"><Check size={12} /> Message copied</span>}
                      </div>

                      <div className="mt-3 space-y-1 break-words text-sm text-neutral-500">
                        <p>Phone: <span className="font-medium text-neutral-800">{coupon.customer?.phone || "No phone number"}</span></p>
                        <p>Stylist: <span className="font-medium text-neutral-800">{coupon.appointment?.stylist?.name || "Unknown"}</span></p>
                        <p>Original appointment: {formatDateTime(coupon.appointment?.startTime || null)}</p>
                        <p>Created: {formatDate(coupon.createdAt)}</p>
                      </div>
                    </div>

                    <div className="min-w-0 xl:text-right">
                      <p className="text-xs uppercase tracking-wider text-neutral-400">Coupon</p>
                      <p className="mt-1 max-w-full break-all text-2xl font-semibold tracking-wide">{coupon.code}</p>
                      <p className="mt-1 text-sm text-neutral-500">{coupon.discount}% off · one use</p>
                      <p className="mt-1 text-xs text-neutral-400">Valid until {formatDate(coupon.expiresAt)}</p>
                    </div>
                  </div>

                  <div className="mt-6 min-w-0 rounded-2xl bg-neutral-50 p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">Customer message</p>
                        <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-neutral-700">{coupon.whatsappMessage}</p>
                      </div>
                      <span className="shrink-0 text-xs text-neutral-400">{messageCopied ? "Saved as copied" : "Not copied yet"}</span>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      {coupon.customer?.phone && (
                        <button type="button" disabled={copying === `${coupon.id}:phone_copied`} onClick={() => copyText(coupon.id, coupon.customer!.phone!, "phone_copied")} className="inline-flex items-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-2 text-xs font-medium text-neutral-800 hover:bg-neutral-100 disabled:opacity-50">
                          {phoneCopied ? <Check size={14} /> : <Copy size={14} />}{phoneCopied ? "Phone copied" : "Copy Phone"}
                        </button>
                      )}

                      <button type="button" disabled={copying === `${coupon.id}:message_copied`} onClick={() => copyText(coupon.id, coupon.whatsappMessage, "message_copied")} className="inline-flex items-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-2 text-xs font-medium text-neutral-800 hover:bg-neutral-100 disabled:opacity-50">
                        {messageCopied ? <Check size={14} /> : <Copy size={14} />}{messageCopied ? "Message copied" : "Copy WhatsApp Message"}
                      </button>

                      {coupon.customer?.whatsappPhone && (
                        <a href={`https://wa.me/${coupon.customer.whatsappPhone}?text=${encodeURIComponent(coupon.whatsappMessage)}`} target="_blank" rel="noreferrer" onClick={() => void recordAction(coupon.id, "whatsapp_opened")} className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-3 py-2 text-xs font-medium text-white hover:bg-neutral-800">
                          <ExternalLink size={14} /> {whatsappOpened ? "WhatsApp opened" : "Open WhatsApp"}
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-4 break-words text-xs text-neutral-400">
                    <span>Uses: {coupon.usedCount} / {coupon.usageLimit ?? 1}</span>
                    <span>Reason: {coupon.reason}</span>
                    {history?.updated_at && <span>Last outreach action: {formatDateTime(history.updated_at)}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
