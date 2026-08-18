"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Plus } from "lucide-react";

type Coupon = {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  expires_at: string | null;
  created_at: string;
  active: boolean;
  used_count?: number;
  usage_limit?: number | null;
  source?: string | null;
  event_name?: string | null;
  reason?: string | null;
};

function getTodayDate() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

function formatDate(value: string | null) {
  if (!value) return "No expiry";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

function monthLabel(value: string | null) {
  if (!value) return "No expiry";
  return new Date(value).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

function sourceLabel(coupon: Coupon) {
  if (coupon.source === "stylist_cancellation") return "Stylist cancellation";
  if (coupon.source === "festival_event") return coupon.event_name || "Festival / event";
  return "Manual coupon";
}

function sourceTone(coupon: Coupon) {
  return coupon.source === "stylist_cancellation"
    ? "bg-amber-50 text-amber-800 border-amber-100"
    : coupon.source === "festival_event"
      ? "bg-[#f7f1e6] text-[#8d6827] border-[#ead9bb]"
      : "bg-neutral-50 text-neutral-600 border-neutral-100";
}

function calendarMonthDays(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    return date;
  });
}

function localDayKey(value: string | Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [code, setCode] = useState("");
  const [discount, setDiscount] = useState("20");
  const [today, setToday] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [usageMode, setUsageMode] = useState<"one" | "unlimited">("one");
  const [source, setSource] = useState<"manual" | "festival_event">("manual");
  const [eventName, setEventName] = useState("");
  const [historyOpen, setHistoryOpen] = useState(true);
  const [historyMonth, setHistoryMonth] = useState<Date | null>(null);
  const [now, setNow] = useState<number | null>(null);

  async function loadCoupons() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/coupons", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load coupons.");
      setCoupons(data.coupons || []);
    } catch (err: any) {
      setError(err?.message || "Unable to load coupons.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCoupons();
  }, []);

  useEffect(() => {
    const currentDate = new Date();
    const currentToday = getTodayDate();
    setToday(currentToday);
    setExpiresAt(currentToday);
    setHistoryMonth(currentDate);

    const updateNow = () => setNow(Date.now());
    updateNow();
    const interval = window.setInterval(updateNow, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  async function createCoupon(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setCreating(true);

    try {
      const response = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          discount_value: Number(discount),
          expires_at: expiresAt,
          usage_limit: usageMode === "one" ? 1 : null,
          source,
          event_name: source === "festival_event" ? eventName : null,
          reason: source === "festival_event" ? eventName : "Manual coupon",
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to create coupon.");

      setSuccess("Coupon created successfully. No coupon email was sent.");
      setCode("");
      setDiscount("20");
      setExpiresAt(getTodayDate());
      setUsageMode("one");
      setSource("manual");
      setEventName("");
      await loadCoupons();
    } catch (err: any) {
      setError(err?.message || "Unable to create coupon.");
    } finally {
      setCreating(false);
    }
  }

  const active = useMemo(
    () => now === null ? [] : coupons.filter((coupon) => coupon.active !== false && (!coupon.expires_at || new Date(coupon.expires_at).getTime() > now)),
    [coupons, now]
  );
  const historyCoupons = useMemo(() => coupons.filter((coupon) => Boolean(coupon.created_at)), [coupons]);

  function grouped(list: Coupon[]) {
    const groups = new Map<string, Coupon[]>();
    [...list]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .forEach((coupon) => {
        const key = monthLabel(coupon.created_at);
        groups.set(key, [...(groups.get(key) || []), coupon]);
      });
    return [...groups.entries()];
  }

  const monthDays = historyMonth ? calendarMonthDays(historyMonth) : [];
  const historyByDay = useMemo(() => {
    const map = new Map<string, Coupon[]>();
    historyCoupons.forEach((coupon) => {
      const key = localDayKey(coupon.created_at);
      map.set(key, [...(map.get(key) || []), coupon]);
    });
    return map;
  }, [historyCoupons]);

  function CouponCard({ coupon, compact = false }: { coupon: Coupon; compact?: boolean }) {
    const used = Number(coupon.used_count || 0);
    const usageText = coupon.usage_limit === null || coupon.usage_limit === undefined
      ? "Unlimited uses"
      : `${used}/${coupon.usage_limit} use${coupon.usage_limit === 1 ? "" : "s"}`;

    return (
      <div className={`overflow-hidden rounded-2xl border border-black/10 bg-white ${compact ? "shadow-none" : "shadow-sm"}`}>
        <div className={compact ? "p-3" : "p-5"}>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="max-w-full break-all font-mono text-base font-semibold tracking-wide">{coupon.code}</h3>
              <span className="shrink-0 rounded-full bg-[#f7f1e6] px-2.5 py-1 text-[11px] font-medium text-[#8d6827]">
                {coupon.discount_value}% OFF
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-neutral-500">
              <span>{usageText}</span><span>·</span><span>Valid until {formatDate(coupon.expires_at)}</span>
            </div>
            <span className={`mt-2 inline-flex max-w-full break-words rounded-full border px-2.5 py-1 text-[11px] font-medium ${sourceTone(coupon)}`}>
              {sourceLabel(coupon)}
            </span>
            {coupon.reason && <p className="mt-2 break-words text-xs text-neutral-500">{coupon.reason}</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-8">
      <section className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f7f1e6] text-[#a87820]"><Plus size={20} /></div>
          <div className="min-w-0">
            <h2 className="text-xl font-semibold">Create coupon</h2>
            <p className="mt-1 text-sm text-neutral-500">Create a one-time or reusable coupon. Coupon emails are not sent automatically.</p>
          </div>
        </div>

        {error && <div className="mt-6 break-words rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {success && <div className="mt-6 break-words rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}

        <form onSubmit={createCoupon} className="mt-7 grid gap-5 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            <span className="font-medium">Coupon code</span>
            <input value={code} onChange={(event) => setCode(event.target.value.toUpperCase().replace(/\s/g, ""))} placeholder="CHRISTMAS20" className="mt-2 w-full min-w-0 rounded-2xl border border-black/10 px-4 py-3 outline-none focus:border-[#bd9144]" required />
          </label>

          <label className="block min-w-0 text-sm">
            <span className="font-medium">Discount</span>
            <div className="mt-2 flex min-w-0">
              <input type="number" min="1" max="100" value={discount} onChange={(event) => setDiscount(event.target.value)} className="min-w-0 w-full rounded-l-2xl border border-r-0 border-black/10 px-4 py-3 outline-none" required />
              <span className="flex shrink-0 items-center rounded-r-2xl border border-black/10 bg-neutral-50 px-4 text-sm text-neutral-500">%</span>
            </div>
          </label>

          <label className="block min-w-0 text-sm">
            <span className="font-medium">Valid until</span>
            <input type="date" value={expiresAt} min={today} onChange={(event) => setExpiresAt(event.target.value)} className="mt-2 w-full min-w-0 rounded-2xl border border-black/10 px-4 py-3 outline-none" required />
          </label>

          <div className="block min-w-0 text-sm">
            <span className="font-medium">Usage</span>
            <select value={usageMode} onChange={(e) => setUsageMode(e.target.value as "one" | "unlimited")} className="mt-2 w-full min-w-0 rounded-2xl border border-black/10 px-4 py-3 outline-none">
              <option value="one">One-time use</option>
              <option value="unlimited">Reusable until expiry</option>
            </select>
          </div>

          <div className="block min-w-0 text-sm">
            <span className="font-medium">Created because</span>
            <select value={source} onChange={(e) => setSource(e.target.value as "manual" | "festival_event")} className="mt-2 w-full min-w-0 rounded-2xl border border-black/10 px-4 py-3 outline-none">
              <option value="manual">Manual / other</option>
              <option value="festival_event">Festival / event</option>
            </select>
          </div>

          {source === "festival_event" && (
            <label className="block min-w-0 text-sm sm:col-span-2">
              <span className="font-medium">Event / festival name</span>
              <input value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="Christmas, Independence Day, Diwali..." className="mt-2 w-full min-w-0 rounded-2xl border border-black/10 px-4 py-3 outline-none focus:border-[#bd9144]" required />
            </label>
          )}

          <div className="sm:col-span-2">
            <button type="submit" disabled={creating} className="inline-flex items-center gap-2 rounded-2xl bg-[#211d1a] px-6 py-3 text-sm font-medium text-white disabled:opacity-50">
              {creating ? "Creating..." : "Create coupon"}
            </button>
          </div>
        </form>
      </section>

      <section>
        <div className="mb-5">
          <h2 className="text-xl font-semibold">Active coupons</h2>
          <p className="mt-1 text-sm text-neutral-500">These are ready to use until their validity date or usage limit is reached.</p>
        </div>
        {loading ? (
          <div className="rounded-3xl border bg-white p-8 text-center text-sm text-neutral-500">Loading coupons...</div>
        ) : !active.length ? (
          <div className="rounded-3xl border bg-white p-8 text-center text-sm text-neutral-500">No active coupons.</div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">{active.map((coupon) => <CouponCard key={coupon.id} coupon={coupon} />)}</div>
        )}
      </section>

      <section className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-sm">
        <button type="button" onClick={() => setHistoryOpen((v) => !v)} className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left sm:px-7">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold">Coupon history</h2>
            <p className="mt-1 text-sm text-neutral-500">A permanent record of coupons created, including stylist cancellation and festival/event coupons.</p>
          </div>
          {historyOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>

        {historyOpen && (
          <div className="border-t border-black/5 p-5 sm:p-7">
            <div className="flex items-center justify-between rounded-2xl bg-[#f8f4ef] px-4 py-3">
              <button type="button" aria-label="Previous month" disabled={!historyMonth} onClick={() => setHistoryMonth((m) => m ? new Date(m.getFullYear(), m.getMonth() - 1, 1) : m)} className="rounded-full p-2 hover:bg-white"><ChevronLeft size={18} /></button>
              <h3 className="font-semibold">{historyMonth ? historyMonth.toLocaleDateString("en-IN", { month: "long", year: "numeric" }) : "History"}</h3>
              <button type="button" aria-label="Next month" disabled={!historyMonth} onClick={() => setHistoryMonth((m) => m ? new Date(m.getFullYear(), m.getMonth() + 1, 1) : m)} className="rounded-full p-2 hover:bg-white"><ChevronRight size={18} /></button>
            </div>

            <div className="mt-4 grid grid-cols-7 overflow-hidden rounded-xl border-l border-t border-black/10">
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((day) => <div key={day} className="border-b border-r border-black/10 bg-neutral-50 px-1 py-2 text-center text-[10px] font-semibold text-neutral-500 sm:px-2 sm:text-[11px]">{day}</div>)}
              {monthDays.map((day) => {
                const key = dateKey(day);
                const items = historyByDay.get(key) || [];
                const inMonth = historyMonth ? day.getMonth() === historyMonth.getMonth() : false;
                return (
                  <div key={key} className={`min-h-24 overflow-hidden border-b border-r border-black/10 p-1.5 sm:min-h-28 sm:p-2 ${inMonth ? "bg-white" : "bg-neutral-50/60"}`}>
                    <div className={`text-xs font-medium ${inMonth ? "text-neutral-700" : "text-neutral-300"}`}>{day.getDate()}</div>
                    <div className="mt-2 space-y-1.5">
                      {items.slice(0, 3).map((coupon) => (
                        <div key={coupon.id} className={`overflow-hidden rounded-lg border px-2 py-1 text-[10px] font-medium ${sourceTone(coupon)}`}>
                          <span className="block truncate">{sourceLabel(coupon)}</span>
                          <span className="mt-0.5 block truncate font-mono text-neutral-600">{coupon.code}</span>
                        </div>
                      ))}
                      {items.length > 3 && <span className="block px-1 text-[10px] text-neutral-400">+{items.length - 3} more</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 flex flex-wrap gap-3 text-xs text-neutral-600">
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-100 bg-amber-50 px-3 py-1.5"><span className="h-2 w-2 rounded-full bg-amber-600" />Stylist cancellation</span>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#ead9bb] bg-[#f7f1e6] px-3 py-1.5"><span className="h-2 w-2 rounded-full bg-[#a87820]" />Festival / event</span>
            </div>

            <div className="mt-7">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-neutral-500">History details</h3>
              <div className="space-y-3">
                {grouped(historyCoupons).map(([month, items]) => (
                  <details key={month} className="rounded-2xl border border-black/10 bg-neutral-50/50">
                    <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">{month} · {items.length} coupon{items.length === 1 ? "" : "s"}</summary>
                    <div className="grid gap-3 border-t border-black/5 p-3 lg:grid-cols-2">{items.map((coupon) => <CouponCard key={coupon.id} coupon={coupon} compact />)}</div>
                  </details>
                ))}
                {!historyCoupons.length && <p className="rounded-2xl bg-neutral-50 p-5 text-sm text-neutral-500">No coupon history yet.</p>}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
