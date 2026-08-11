"use client";

import { useEffect, useState } from "react";
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
  const [services, setServices] = useState<any[]>([]);
  const [stylists, setStylists] = useState<any[]>([]);
  const [service, setService] = useState("");
  const [stylist, setStylist] = useState("");
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [coupon, setCoupon] = useState("");
  const [message, setMessage] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    supabase
      .from("services")
      .select("id,name,price,duration_minutes,category")
      .eq("active", true)
      .then(({ data }) => {
        setServices(data ?? []);
      });

    supabase
      .from("stylists")
      .select("id,name,category")
      .eq("active", true)
      .then(({ data }) => {
        setStylists(data ?? []);
      });
  }, []);

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
          setMessage("Unable to load available times.");
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
    <main className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-sm uppercase tracking-widest text-neutral-500">
        Appointment
      </p>

      <h1 className="mt-2 text-4xl font-semibold">
        Book your visit
      </h1>

      <form
        action="/api/book"
        method="post"
        className="mt-8 space-y-5 rounded-3xl border bg-white p-7"
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
            <option value="">Choose service</option>

            {services.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name} · ₹{x.price} · {x.duration_minutes} min
              </option>
            ))}
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
            <option value="">Choose stylist</option>

            {stylists.map((x) => (
              <option key={x.id} value={x.id}>
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
                : !service || !stylist || !date
                  ? "Choose service, stylist and date"
                  : slots.length === 0
                    ? "No available times"
                    : "Choose a slot"}
            </option>

            {slots.map((slot) => (
              <option key={slot} value={slot}>
                {formatTime(slot)}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          Coupon code

          <input
            name="coupon"
            value={coupon}
            onChange={(e) => setCoupon(e.target.value)}
            className="mt-2 w-full rounded-xl border p-3"
            placeholder="Optional"
          />
        </label>

        <button
          type="submit"
          className="w-full rounded-xl bg-neutral-900 p-3 text-white"
        >
          Confirm appointment
        </button>

        {message && (
          <p className="text-sm text-red-600">
            {message}
          </p>
        )}

        <p className="text-xs text-neutral-500">
          Payment is handled offline. Availability is checked again on the
          server when you confirm.
	  </p>

    

      </form>
    </main>
  );
}
