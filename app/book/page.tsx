"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function formatTime(time: string) {
  const [hour, minute] = time.split(":").map(Number);

  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;

  return `${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function getToday() {
  return new Date().toLocaleDateString("en-CA");
}

export default function Book() {
  const searchParams = useSearchParams();

  const [services, setServices] = useState<any[]>([]);
  const [stylists, setStylists] = useState<any[]>([]);
  const [service, setService] = useState("");
  const [stylist, setStylist] = useState("");
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [coupon, setCoupon] = useState("");
  const [message, setMessage] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);

  /*
   * Load services from the new service catalogue.
   */
  useEffect(() => {
    const supabase = createClient();

    supabase
      .from("services")
      .select(`
        id,
        name,
        active,
        deleted_at,
        service_categories (
          id,
          name,
          display_order
        ),
        service_options (
          id,
          name,
          price,
          price_type,
          duration_minutes,
          display_order,
          active
        )
      `)
      .eq("active", true)
      .is("deleted_at", null)
      .then(({ data }) => {
        setServices(data ?? []);
      });
  }, []);

  /*
   * If the customer arrived from the Services page
   * with ?service_id=..., automatically select it.
   */
  useEffect(() => {
    const serviceId =
      searchParams.get("service_id");

    if (!serviceId || !services.length) {
      return;
    }

    const exists = services.some(
      (item) => item.id === serviceId
    );

    if (exists) {
      setService(serviceId);
    }
  }, [searchParams, services]);

  /*
   * Load stylists who provide the selected service.
   */
  useEffect(() => {
    setStylists([]);
    setStylist("");
    setSlots([]);

    if (!service) {
      return;
    }

    const supabase = createClient();

    supabase
      .from("stylist_services")
      .select(
        "stylist_id, stylists(id,name,category)"
      )
      .eq("service_id", service)
      .then(({ data }) => {
        const availableStylists = (data ?? [])
          .map((row: any) => row.stylists)
          .filter(Boolean);

        setStylists(availableStylists);
      });
  }, [service]);

  /*
   * Load available appointment times.
   */
  useEffect(() => {
    setSlots([]);

    if (!service || !stylist || !date) {
      return;
    }

    let cancelled = false;

    async function loadAvailability() {
      setLoadingSlots(true);
      setMessage("");

      try {
        const response = await fetch(
          `/api/availability?service_id=${service}&stylist_id=${stylist}&date=${date}`
        );

        const result = await response.json();

        if (!cancelled) {
          setSlots(result.slots ?? []);

          if (result.error) {
            setMessage(result.error);
          }
        }
      } catch {
        if (!cancelled) {
          setSlots([]);
          setMessage(
            "Unable to load available times."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingSlots(false);
        }
      }
    }

    loadAvailability();

    return () => {
      cancelled = true;
    };
  }, [service, stylist, date]);

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:px-6 sm:py-16">
      <p className="text-sm uppercase tracking-widest text-neutral-500">
        Appointment
      </p>

      <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">
        Book your visit
      </h1>

      <form
        action="/api/book"
        method="post"
        className="mt-8 space-y-5 rounded-3xl border bg-white p-5 sm:p-7"
      >
        <label className="block text-sm">
          Service

          <select
            name="service_id"
            value={service}
            onChange={(e) => {
              setService(e.target.value);
              setSlots([]);
            }}
            className="mt-2 w-full rounded-xl border p-3"
            required
          >
            <option value="">
              Choose service
            </option>

            {services.map((x) => {
              const options = (
                x.service_options ?? []
              )
                .filter(
                  (option: any) =>
                    option.active !== false
                )
                .sort(
                  (a: any, b: any) =>
                    (a.display_order ?? 0) -
                    (b.display_order ?? 0)
                );

              let priceText = "";

              if (options.length === 1) {
                const option = options[0];

                if (
                  option.price_type ===
                  "percentage"
                ) {
                  priceText = `${Number(
                    option.price
                  )}%`;
                } else if (
                  option.price_type === "from"
                ) {
                  priceText = `₹${Number(
                    option.price
                  ).toLocaleString(
                    "en-IN"
                  )} onwards`;
                } else {
                  priceText = `₹${Number(
                    option.price
                  ).toLocaleString(
                    "en-IN"
                  )}`;
                }
              } else if (options.length > 1) {
                const lowest = Math.min(
                  ...options.map((option: any) =>
                    Number(option.price)
                  )
                );

                priceText = `₹${lowest.toLocaleString(
                  "en-IN"
                )} onwards`;
              }

              return (
                <option
                  key={x.id}
                  value={x.id}
                >
                  {x.name}
                  {priceText
                    ? ` · ${priceText}`
                    : ""}
                </option>
              );
            })}
          </select>
        </label>

        <label className="block text-sm">
          Stylist

          <select
            name="stylist_id"
            value={stylist}
            onChange={(e) => {
              setStylist(e.target.value);
              setSlots([]);
            }}
            className="mt-2 w-full rounded-xl border p-3"
            required
          >
            <option value="">
              Choose stylist
            </option>

            {stylists.map((x) => (
              <option
                key={x.id}
                value={x.id}
              >
                {x.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          Date

          <input
            name="date"
            type="date"
            min={getToday()}
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setSlots([]);
              setMessage("");
            }}
            className="mt-2 w-full rounded-xl border p-3"
            required
          />
        </label>

        <label className="block text-sm">
          Available time

          <select
            name="time"
            className="mt-2 w-full rounded-xl border p-3"
            required
            disabled={
              !service ||
              !stylist ||
              !date ||
              loadingSlots ||
              slots.length === 0
            }
          >
            <option value="">
              {loadingSlots
                ? "Checking availability..."
                : !service ||
                    !stylist ||
                    !date
                  ? "Choose service, stylist and date"
                  : slots.length === 0
                    ? "No available times"
                    : "Choose a slot"}
            </option>

            {slots.map((slot) => (
              <option
                key={slot}
                value={slot}
              >
                {formatTime(slot)}
              </option>
            ))}
          </select>
        </label>

        {message && (
          <div className="rounded-xl bg-neutral-50 p-3 text-sm text-neutral-600">
            {message}
          </div>
        )}

        <label className="block text-sm">
          Coupon code

          <input
            name="coupon"
            value={coupon}
            onChange={(e) =>
              setCoupon(e.target.value)
            }
            className="mt-2 w-full rounded-xl border p-3"
            placeholder="Optional"
          />
        </label>

        <button
          type="submit"
          disabled={
            !service ||
            !stylist ||
            !date ||
            slots.length === 0
          }
          className="w-full rounded-xl bg-neutral-900 p-3 text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Continue booking
        </button>
      </form>
    </main>
  );
}