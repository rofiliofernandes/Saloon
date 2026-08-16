"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type ServiceOption = {
  id: string;
  name: string;
  price: number;
  price_type: "fixed" | "from" | "percentage";
  duration_minutes: number;
  display_order: number;
  active: boolean;
};

type Service = {
  id: string;
  name: string;
  service_options: ServiceOption[];
};

type Stylist = {
  id: string;
  name: string;
  category: string;
};

function formatTime(time: string) {
  const [hour, minute] = time.split(":").map(Number);

  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;

  return `${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function getToday() {
  return new Date().toLocaleDateString("en-CA");
}

function formatPrice(option: ServiceOption) {
  const price = Number(option.price).toLocaleString("en-IN");

  if (option.price_type === "from") {
    return `₹${price} onwards`;
  }

  if (option.price_type === "percentage") {
    return `${price}%`;
  }

  return `₹${price}`;
}

export default function Book() {
  const searchParams = useSearchParams();

  const [services, setServices] = useState<Service[]>([]);
  const [stylists, setStylists] = useState<Stylist[]>([]);

  const [service, setService] = useState("");
  const [serviceOption, setServiceOption] = useState("");
  const [stylist, setStylist] = useState("");
  const [date, setDate] = useState("");

  const [slots, setSlots] = useState<string[]>([]);

  const [coupon, setCoupon] = useState("");
  const [message, setMessage] = useState("");

  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingStylists, setLoadingStylists] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);

  /*
   * Load services + active service options.
   */
  useEffect(() => {
    async function loadServices() {
      setLoadingServices(true);

      const supabase = createClient();

      const { data, error } = await supabase
        .from("services")
        .select(`
          id,
          name,
          active,
          deleted_at,
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
        .order("name");

      if (error) {
        console.error(error);
        setServices([]);
        setMessage("Unable to load services.");
      } else {
        const cleaned = (data ?? []).map((item: any) => ({
          ...item,
          service_options: (item.service_options ?? [])
            .filter((option: ServiceOption) => option.active)
            .sort(
              (a: ServiceOption, b: ServiceOption) =>
                (a.display_order ?? 0) -
                (b.display_order ?? 0)
            ),
        }));

        setServices(cleaned);
      }

      setLoadingServices(false);
    }

    loadServices();
  }, []);

  /*
   * If arriving from:
   *
   * /book?service_id=...
   *
   * select that service automatically.
   */
  useEffect(() => {
    const serviceId = searchParams.get("service_id");

    if (!serviceId || !services.length) {
      return;
    }

    const selected = services.find(
      (item) => item.id === serviceId
    );

    if (!selected) {
      return;
    }

    setService(selected.id);

    /*
     * If the service has only one option,
     * select it automatically.
     */
    if (selected.service_options.length === 1) {
      setServiceOption(
        selected.service_options[0].id
      );
    }
  }, [searchParams, services]);

  /*
   * Load stylists for selected service.
   */
  useEffect(() => {
    setStylists([]);
    setStylist("");
    setSlots([]);

    if (!service) {
      return;
    }

    async function loadStylists() {
      setLoadingStylists(true);

      const supabase = createClient();

      const { data, error } = await supabase
        .from("stylist_services")
        .select(
          "stylist_id, stylists(id,name,category)"
        )
        .eq("service_id", service);

      if (error) {
        console.error(error);
        setStylists([]);
        setMessage("Unable to load stylists.");
      } else {
        const availableStylists = (data ?? [])
          .map((row: any) => row.stylists)
          .filter(Boolean);

        setStylists(availableStylists);
      }

      setLoadingStylists(false);
    }

    loadStylists();
  }, [service]);

  /*
   * Load available appointment times.
   *
   * IMPORTANT:
   * Availability now depends on the selected
   * service option because different options can
   * have different durations.
   */
  useEffect(() => {
    setSlots([]);

    if (
      !service ||
      !serviceOption ||
      !stylist ||
      !date
    ) {
      return;
    }

    let cancelled = false;

    async function loadAvailability() {
      setLoadingSlots(true);
      setMessage("");

      try {
        const params = new URLSearchParams({
          service_id: service,
          service_option_id: serviceOption,
          stylist_id: stylist,
          date,
        });

        const response = await fetch(
          `/api/availability?${params.toString()}`
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
  }, [
    service,
    serviceOption,
    stylist,
    date,
  ]);

  const selectedService = services.find(
    (item) => item.id === service
  );

  const selectedOption =
    selectedService?.service_options.find(
      (option) => option.id === serviceOption
    );

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
        {/* SERVICE */}

        <label className="block text-sm">
          Service

          <select
            name="service_id"
            value={service}
            onChange={(e) => {
              const nextService = e.target.value;

              setService(nextService);
              setServiceOption("");
              setStylist("");
              setSlots([]);
              setMessage("");
            }}
            className="mt-2 w-full rounded-xl border p-3"
            required
            disabled={loadingServices}
          >
            <option value="">
              {loadingServices
                ? "Loading services..."
                : "Choose service"}
            </option>

            {services.map((item) => {
              const options =
                item.service_options;

              let priceText = "";

              if (options.length === 1) {
                priceText =
                  formatPrice(options[0]);
              } else if (options.length > 1) {
                const lowest = Math.min(
                  ...options.map((option) =>
                    Number(option.price)
                  )
                );

                priceText = `₹${lowest.toLocaleString(
                  "en-IN"
                )} onwards`;
              }

              return (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {item.name}
                  {priceText
                    ? ` · ${priceText}`
                    : ""}
                </option>
              );
            })}
          </select>
        </label>

        {/* SERVICE OPTION */}

        {selectedService &&
          selectedService.service_options
            .length > 0 && (
            <label className="block text-sm">
              Service option

              <select
                name="service_option_id"
                value={serviceOption}
                onChange={(e) => {
                  setServiceOption(
                    e.target.value
                  );
                  setStylist("");
                  setSlots([]);
                  setMessage("");
                }}
                className="mt-2 w-full rounded-xl border p-3"
                required
              >
                <option value="">
                  Choose an option
                </option>

                {selectedService.service_options.map(
                  (option) => (
                    <option
                      key={option.id}
                      value={option.id}
                    >
                      {option.name} ·{" "}
                      {formatPrice(option)} ·{" "}
                      {option.duration_minutes} min
                    </option>
                  )
                )}
              </select>
            </label>
          )}

        {/* SELECTED OPTION SUMMARY */}

        {selectedOption && (
          <div className="rounded-2xl bg-neutral-50 p-4 text-sm">
            <div className="font-medium">
              {selectedService?.name}
            </div>

            <div className="mt-1 text-neutral-600">
              {selectedOption.name}
              {" · "}
              {formatPrice(selectedOption)}
              {" · "}
              {selectedOption.duration_minutes}{" "}
              minutes
            </div>
          </div>
        )}

        {/* STYLIST */}

        <label className="block text-sm">
          Stylist

          <select
            name="stylist_id"
            value={stylist}
            onChange={(e) => {
              setStylist(e.target.value);
              setSlots([]);
              setMessage("");
            }}
            className="mt-2 w-full rounded-xl border p-3"
            required
            disabled={
              !service ||
              !serviceOption ||
              loadingStylists
            }
          >
            <option value="">
              {loadingStylists
                ? "Loading stylists..."
                : !serviceOption
                  ? "Choose a service option first"
                  : stylists.length === 0
                    ? "No stylists available"
                    : "Choose stylist"}
            </option>

            {stylists.map((item) => (
              <option
                key={item.id}
                value={item.id}
              >
                {item.name}
              </option>
            ))}
          </select>
        </label>

        {/* DATE */}

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

        {/* TIME */}

        <label className="block text-sm">
          Available time

          <select
            name="time"
            className="mt-2 w-full rounded-xl border p-3"
            required
            disabled={
              !service ||
              !serviceOption ||
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
                    !serviceOption ||
                    !stylist ||
                    !date
                  ? "Choose your service, option, stylist and date"
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

        {/* COUPON */}

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
            maxLength={50}
          />
        </label>

        {/* SUBMIT */}

        <button
          type="submit"
          disabled={
            !service ||
            !serviceOption ||
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
