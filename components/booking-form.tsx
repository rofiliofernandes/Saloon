"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Search,
  UserRound,
} from "lucide-react";
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
  description?: string | null;
  service_categories?: {
    id: string;
    name: string;
    display_order: number;
  } | null;
  service_options: ServiceOption[];
  service_audiences?: { audience: string }[];
};

type Category = {
  id: string;
  name: string;
  display_order: number;
};

type Stylist = {
  id: string;
  name: string;
  category: string;
  bio?: string | null;
  image_url?: string | null;
};

const SALON_TIME_ZONE = "Asia/Kolkata";

function getToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SALON_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function formatTime(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function formatPrice(option: ServiceOption) {
  const price = Number(option.price).toLocaleString("en-IN");
  if (option.price_type === "from") return `₹${price} onwards`;
  if (option.price_type === "percentage") return `${price}%`;
  return `₹${price}`;
}

function stylistImage(stylist: Stylist) {
  if (stylist.image_url) return stylist.image_url;
  const slug = stylist.name.trim().toLowerCase().replace(/\s+/g, "-");
  const known = new Set(["arjun", "maya", "alex"]);
  return known.has(slug) ? `/stylists/${slug}.svg` : "/stylists/placeholder.svg";
}

function dateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function buildCalendar(month: Date) {
  const first = startOfMonth(month);
  const start = new Date(first);
  start.setDate(1 - first.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const value = new Date(start);
    value.setDate(start.getDate() + index);
    return value;
  });
}

function displayMonth(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: SALON_TIME_ZONE,
  }).format(date);
}

function formatSelectedDate(value: string) {
  if (!value) return "";
  const date = new Date(`${value}T12:00:00+05:30`);
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: SALON_TIME_ZONE,
  }).format(date);
}

export default function BookingForm() {
  const searchParams = useSearchParams();
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stylists, setStylists] = useState<Stylist[]>([]);

  const [step, setStep] = useState(1);
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [service, setService] = useState("");
  const [serviceOption, setServiceOption] = useState("");
  const [stylist, setStylist] = useState("");
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState("");
  const [coupon, setCoupon] = useState("");
  const [showCoupon, setShowCoupon] = useState(false);
  const [message, setMessage] = useState("");

  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingStylists, setLoadingStylists] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const today = getToday();
  const todayDate = useMemo(() => new Date(`${today}T12:00:00`), [today]);
  const [calendarMonth, setCalendarMonth] = useState(todayDate);

  useEffect(() => {
    async function loadServices() {
      setLoadingServices(true);
      const supabase = createClient();

      const { data, error } = await supabase
        .from("services")
        .select(`
          id,
          name,
          description,
          active,
          deleted_at,
          service_categories ( id, name, display_order ),
          service_options ( id, name, price, price_type, duration_minutes, display_order, active ),
          service_audiences ( audience )
        `)
        .eq("active", true)
        .is("deleted_at", null)
        .order("name");

      if (error) {
        console.error(error);
        setMessage("Unable to load the service catalogue. Please make sure the service catalogue migration has been applied in Supabase.");
        setServices([]);
        setCategories([]);
      } else {
        const cleaned = (data ?? []).map((item: any) => ({
          ...item,
          service_options: (item.service_options ?? [])
            .filter((option: ServiceOption) => option.active)
            .sort((a: ServiceOption, b: ServiceOption) => (a.display_order ?? 0) - (b.display_order ?? 0)),
        }));

        const categoryMap = new Map<string, Category>();
        cleaned.forEach((item: Service) => {
          if (item.service_categories?.id) {
            categoryMap.set(item.service_categories.id, {
              id: item.service_categories.id,
              name: item.service_categories.name,
              display_order: item.service_categories.display_order ?? 0,
            });
          }
        });

        setServices(cleaned);
        setCategories(Array.from(categoryMap.values()).sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0) || a.name.localeCompare(b.name)));
      }

      setLoadingServices(false);
    }

    loadServices();
  }, []);

  useEffect(() => {
    const serviceId = searchParams.get("service_id");
    const couponCode = searchParams.get("coupon");
    const bookingError = searchParams.get("error");

    if (bookingError === "slot-taken") {
      setMessage("That time was just booked by someone else. Please choose another available time.");
    }

    if (couponCode) {
      setCoupon(couponCode.toUpperCase());
      setShowCoupon(true);
    }

    if (!serviceId || !services.length) return;
    const selected = services.find((item) => item.id === serviceId);
    if (!selected) return;

    setService(selected.id);
    if (selected.service_options.length === 1) {
      setServiceOption(selected.service_options[0].id);
    }
    const categoryId = selected.service_categories?.id;
    if (categoryId) setOpenCategory(categoryId);
  }, [searchParams, services]);

  useEffect(() => {
    setStylists([]);
    setStylist("");
    setSlots([]);
    setSelectedTime("");

    if (!service) return;

    async function loadStylists() {
      setLoadingStylists(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("stylist_services")
        .select("stylist_id, stylists!inner(id,name,category,bio,image_url,active,deleted_at)")
        .eq("service_id", service)
        .eq("stylists.active", true)
        .is("stylists.deleted_at", null);

      if (error) {
        console.error(error);
        setStylists([]);
        setMessage("Unable to load stylists for this service.");
      } else {
        const uniqueStylists = new Map<string, Stylist>();
        for (const row of data ?? []) {
          // Supabase can infer a to-many relationship here as an array even
          // though each stylist_services row should resolve to one stylist.
          // Normalize both shapes before de-duplicating.
          const related = row.stylists;
          const items = (Array.isArray(related)
            ? related
            : related
              ? [related]
              : []) as Stylist[];

          for (const item of items) {
            if (item?.id && !uniqueStylists.has(item.id)) {
              uniqueStylists.set(item.id, item);
            }
          }
        }
        setStylists(Array.from(uniqueStylists.values()));
      }
      setLoadingStylists(false);
    }

    loadStylists();
  }, [service]);

  useEffect(() => {
    setSlots([]);
    setSelectedTime("");

    if (!service || !serviceOption || !stylist || !date) return;

    let cancelled = false;

    async function loadAvailability() {
      setLoadingSlots(true);
      setMessage("");
      try {
        const params = new URLSearchParams({ service_id: service, service_option_id: serviceOption, stylist_id: stylist, date });
        const response = await fetch(`/api/availability?${params.toString()}`);
        const result = await response.json();
        if (!cancelled) {
          setSlots(result.slots ?? []);
          if (result.error) setMessage(result.error);
        }
      } catch {
        if (!cancelled) {
          setSlots([]);
          setMessage("Unable to load available times.");
        }
      } finally {
        if (!cancelled) setLoadingSlots(false);
      }
    }

    loadAvailability();
    return () => {
      cancelled = true;
    };
  }, [service, serviceOption, stylist, date]);

  const selectedService = services.find((item) => item.id === service);
  const selectedOption = selectedService?.service_options.find((option) => option.id === serviceOption);
  const selectedStylist = stylists.find((item) => item.id === stylist);

  const filteredServices = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return services;
    return services.filter((item) => `${item.name} ${item.description ?? ""} ${item.service_categories?.name ?? ""}`.toLowerCase().includes(term));
  }, [search, services]);

  const visibleCategories = useMemo(() => {
    const map = new Map<string, Service[]>();
    filteredServices.forEach((item) => {
      const id = item.service_categories?.id || "other";
      if (!map.has(id)) map.set(id, []);
      map.get(id)!.push(item);
    });

    return categories
      .filter((category) => map.has(category.id))
      .map((category) => ({ ...category, services: map.get(category.id) || [] }))
      .concat(map.has("other") ? [{ id: "other", name: "Other services", display_order: 9999, services: map.get("other") || [] }] : []);
  }, [categories, filteredServices]);

  function selectService(id: string) {
    const next = services.find((item) => item.id === id);
    if (!next) return;
    setService(id);
    setStylist("");
    setDate("");
    setSlots([]);
    setSelectedTime("");
    setMessage("");
    if (next.service_options.length === 1) setServiceOption(next.service_options[0].id);
    else setServiceOption("");
  }

  function selectDate(value: string) {
    if (value < today) return;
    setDate(value);
    setSelectedTime("");
    setMessage("");
  }

  function nextStep() {
    setMessage("");
    if (step === 1 && (!service || !serviceOption)) {
      setMessage(selectedService && selectedService.service_options.length > 1 ? "Choose a service option before continuing." : "Choose a service before continuing.");
      return;
    }
    if (step === 2 && !stylist) {
      setMessage("Choose a stylist before continuing.");
      return;
    }
    if (step === 3 && (!date || !selectedTime)) {
      setMessage("Choose a date and available time before continuing.");
      return;
    }
    setStep((current) => Math.min(4, current + 1));
  }

  function previousStep() {
    setMessage("");
    setStep((current) => Math.max(1, current - 1));
  }

  function submitBooking(event: FormEvent<HTMLFormElement>) {
    if (submitting) {
      event.preventDefault();
      return;
    }
    setSubmitting(true);
    setMessage("");
  }

  const calendarDays = buildCalendar(calendarMonth);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <form action="/api/book" method="post" onSubmit={submitBooking} className="overflow-hidden rounded-[2rem] border border-black/10 bg-[#fbf7f3] shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
        <input type="hidden" name="service_id" value={service} />
        <input type="hidden" name="service_option_id" value={serviceOption} />
        <input type="hidden" name="stylist_id" value={stylist} />
        <input type="hidden" name="date" value={date} />
        <input type="hidden" name="time" value={selectedTime} />
        <input type="hidden" name="coupon" value={showCoupon ? coupon : ""} />

        <header className="border-b border-black/10 px-5 py-6 sm:px-8">
          <div className="flex items-start justify-between gap-5">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Book an appointment</h1>
              <p className="mt-1 text-sm text-neutral-500">
                {step === 1 && "Select the services you need"}
                {step === 2 && "Select your stylist"}
                {step === 3 && "Choose when you want to come"}
                {step === 4 && "Review your appointment"}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-black/15 bg-white">
              <UserRound size={20} />
            </div>
          </div>

          <div className="mt-6 flex items-center gap-4">
            <span className="shrink-0 text-sm font-medium">Step {step}/4</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/15">
              <div className="h-full rounded-full bg-neutral-900 transition-all duration-300" style={{ width: `${(step / 4) * 100}%` }} />
            </div>
          </div>
        </header>

        <div className="px-5 py-6 sm:px-8 sm:py-8">
          {step === 1 && (
            <section>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search services..." className="w-full rounded-xl border border-black/10 bg-white py-3.5 pl-11 pr-4 text-sm outline-none focus:border-black/30" />
              </div>

              <div className="mt-5 max-h-[520px] space-y-3 overflow-y-auto rounded-2xl bg-[#f1ece7] p-3 sm:p-4">
                {loadingServices ? (
                  <div className="p-8 text-center text-sm text-neutral-500">Loading services...</div>
                ) : !visibleCategories.length ? (
                  <div className="p-8 text-center text-sm text-neutral-500">No services match your search.</div>
                ) : (
                  visibleCategories.map((category) => {
                    const isOpen = openCategory === category.id;
                    return (
                      <div key={category.id} className="overflow-hidden rounded-xl border border-black/15 bg-white">
                        <button type="button" onClick={() => setOpenCategory(isOpen ? null : category.id)} className="flex w-full items-center justify-between px-5 py-4 text-left">
                          <div>
                            <div className="font-medium uppercase tracking-wide">{category.name}</div>
                            <div className="mt-0.5 text-xs text-neutral-500">{category.services.length} {category.services.length === 1 ? "service" : "services"}</div>
                          </div>
                          <ChevronDown size={20} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
                        </button>

                        {isOpen && (
                          <div className="border-t border-black/10 bg-[#fbf9f7] p-3 sm:p-4">
                            <div className="grid gap-3 lg:grid-cols-2">
                              {category.services.map((item) => {
                                const selected = service === item.id;
                                return (
                                  <div key={item.id} className={`rounded-xl border p-4 transition ${selected ? "border-neutral-900 bg-white shadow-sm" : "border-black/10 bg-white hover:border-black/25"}`}>
                                    <button type="button" onClick={() => selectService(item.id)} className="w-full text-left">
                                      <div className="flex items-start justify-between gap-4">
                                        <div className="min-w-0">
                                          <h2 className="font-semibold">{item.name}</h2>
                                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-neutral-600">
                                            <span>{item.service_options.length === 1 ? formatPrice(item.service_options[0]) : `From ₹${Math.min(...item.service_options.map((option) => Number(option.price))).toLocaleString("en-IN")}`}</span>
                                            <span className="text-neutral-300">•</span>
                                            <span>{item.service_options.length === 1 ? `${item.service_options[0].duration_minutes} min` : `${Math.min(...item.service_options.map((option) => option.duration_minutes))}–${Math.max(...item.service_options.map((option) => option.duration_minutes))} min`}</span>
                                          </div>
                                          {item.description && <p className="mt-1 line-clamp-2 text-sm leading-5 text-neutral-500">{item.description}</p>}
                                        </div>
                                        {selected && <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white"><Check size={14} /></span>}
                                      </div>
                                    </button>

                                    {item.service_options.length > 1 && selected && (
                                      <div className="mt-4 space-y-2 border-t border-black/10 pt-3">
                                        <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">Choose an option</p>
                                        {item.service_options.map((option) => (
                                          <button key={option.id} type="button" onClick={() => setServiceOption(option.id)} className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm ${serviceOption === option.id ? "border-neutral-900 bg-neutral-900 text-white" : "border-black/10 bg-neutral-50"}`}>
                                            <span className="min-w-0 truncate">{option.name}</span>
                                            <span className="shrink-0 text-xs">{formatPrice(option)} · {option.duration_minutes} min</span>
                                          </button>
                                        ))}
                                      </div>
                                    )}

                                    {item.service_options.length === 1 && selected && (
                                      <div className="mt-3 flex items-center gap-2 text-xs text-neutral-500"><Clock3 size={14} /> {item.service_options[0].duration_minutes} min · {formatPrice(item.service_options[0])}</div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          )}

          {step === 2 && (
            <section>
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Your selection</p>
                  <h2 className="mt-1 text-xl font-semibold">Choose your stylist</h2>
                  <p className="mt-1 text-sm text-neutral-500">Only stylists who provide this service are shown.</p>
                </div>
                <button type="button" onClick={() => setStep(1)} className="text-sm underline underline-offset-4">Change service</button>
              </div>

              {loadingStylists ? (
                <div className="rounded-2xl bg-[#f1ece7] p-10 text-center text-sm text-neutral-500">Finding stylists...</div>
              ) : !stylists.length ? (
                <div className="rounded-2xl border border-black/10 bg-white p-8 text-center text-sm text-neutral-500">No stylist is currently assigned to this service.</div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {stylists.map((item) => {
                    const selected = stylist === item.id;
                    return (
                      <button key={item.id} type="button" onClick={() => setStylist(item.id)} className={`group overflow-hidden rounded-2xl border bg-white text-left transition duration-300 ${selected ? "border-neutral-900 shadow-lg sm:scale-[1.015]" : "border-black/10 hover:-translate-y-1 hover:scale-[1.01] hover:border-black/25 hover:shadow-md"}`}>
                        <div className="aspect-square overflow-hidden bg-neutral-100">
                          <img src={stylistImage(item)} alt={item.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                        </div>
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="font-semibold">{item.name}</h3>
                              <p className="mt-0.5 text-xs text-neutral-500">{item.category === "unisex" ? "Hair & beauty stylist" : "Hair & beauty specialist"}</p>
                            </div>
                            <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${selected ? "border-neutral-900 bg-neutral-900 text-white" : "border-black/20"}`}>
                              {selected && <Check size={14} />}
                            </span>
                          </div>
                          <p className="mt-3 line-clamp-3 text-sm leading-5 text-neutral-500">{item.bio || "Experienced in creating a comfortable, tailored salon experience."}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {step === 3 && (
            <section>
              <div className="mb-5">
                <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{selectedStylist?.name || "Stylist"}</p>
                <h2 className="mt-1 text-xl font-semibold">When do you want to come?</h2>
              </div>

              <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="rounded-2xl bg-[#f1ece7] p-4 sm:p-5">
                  <div className="flex items-center justify-between">
                    <button type="button" onClick={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))} disabled={calendarMonth.getFullYear() === todayDate.getFullYear() && calendarMonth.getMonth() === todayDate.getMonth()} className="rounded-full p-2 hover:bg-white disabled:opacity-30"><ChevronLeft size={18} /></button>
                    <h3 className="font-semibold">{displayMonth(calendarMonth)}</h3>
                    <button type="button" onClick={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))} className="rounded-full p-2 hover:bg-white"><ChevronRight size={18} /></button>
                  </div>

                  <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs font-medium text-neutral-500">
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => <span key={day} className="py-2">{day}</span>)}
                    {calendarDays.map((day) => {
                      const key = dateKey(day);
                      const currentMonth = day.getMonth() === calendarMonth.getMonth();
                      const disabled = key < today;
                      const selected = key === date;
                      return (
                        <button key={key} type="button" disabled={disabled} onClick={() => selectDate(key)} className={`aspect-square rounded-full text-sm transition ${!currentMonth ? "text-neutral-300" : "text-neutral-700"} ${disabled ? "cursor-not-allowed opacity-35" : "hover:bg-white"} ${selected ? "bg-neutral-900 font-semibold text-white hover:bg-neutral-900" : ""}`}>
                          {day.getDate()}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-2xl bg-[#f1ece7] p-4 sm:p-5">
                  <div className="text-sm font-medium">{date ? formatSelectedDate(date) : "Choose a date"}</div>
                  <div className="mt-1 text-xs text-neutral-500">Available times for {selectedStylist?.name || "your stylist"}</div>

                  {loadingSlots ? (
                    <div className="mt-6 rounded-xl bg-white p-6 text-center text-sm text-neutral-500">Checking availability...</div>
                  ) : date && !slots.length ? (
                    <div className="mt-6 rounded-xl bg-white p-6 text-center text-sm text-neutral-500">No available times on this date. Try another day.</div>
                  ) : (
                    <div className="mt-5 grid max-h-[330px] grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">
                      {slots.map((slot) => (
                        <button key={slot} type="button" onClick={() => setSelectedTime(slot)} className={`rounded-lg border px-2 py-2.5 text-sm transition ${selectedTime === slot ? "border-neutral-900 bg-neutral-900 text-white" : "border-black/15 bg-white hover:border-black/40"}`}>
                          {formatTime(slot)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {step === 4 && (
            <section>
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Almost done</p>
              <h2 className="mt-1 text-xl font-semibold">Review your appointment</h2>

              <div className="mt-5 divide-y divide-black/10 overflow-hidden rounded-2xl border border-black/10 bg-white">
                <div className="p-5">
                  <p className="text-xs uppercase tracking-wider text-neutral-500">Service</p>
                  <div className="mt-1 flex items-center justify-between gap-4"><span className="font-semibold">{selectedService?.name}</span><button type="button" onClick={() => setStep(1)} className="text-xs underline underline-offset-4">Change</button></div>
                  <p className="mt-1 text-sm text-neutral-500">{selectedOption?.name} · {selectedOption?.duration_minutes} min · {selectedOption && formatPrice(selectedOption)}</p>
                </div>
                <div className="p-5">
                  <p className="text-xs uppercase tracking-wider text-neutral-500">Stylist</p>
                  <div className="mt-1 flex items-center justify-between gap-4"><span className="font-semibold">{selectedStylist?.name}</span><button type="button" onClick={() => setStep(2)} className="text-xs underline underline-offset-4">Change</button></div>
                </div>
                <div className="p-5">
                  <p className="text-xs uppercase tracking-wider text-neutral-500">Date & time</p>
                  <div className="mt-1 flex items-center justify-between gap-4"><span className="font-semibold">{formatSelectedDate(date)} · {formatTime(selectedTime)}</span><button type="button" onClick={() => setStep(3)} className="text-xs underline underline-offset-4">Change</button></div>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-black/10 bg-white p-5">
                <div className="flex items-center justify-between gap-4">
                  <div><p className="font-medium">Have a coupon?</p><p className="mt-0.5 text-xs text-neutral-500">Apply it before confirming your booking.</p></div>
                  <button type="button" onClick={() => setShowCoupon((value) => !value)} className="text-sm font-semibold underline underline-offset-4">{showCoupon ? "Hide" : "Add coupon"}</button>
                </div>
                {showCoupon && <input name="coupon_display" value={coupon} onChange={(event) => setCoupon(event.target.value.toUpperCase())} placeholder="Enter coupon code" maxLength={50} autoComplete="off" className="mt-4 w-full rounded-xl border border-black/15 px-4 py-3 text-sm outline-none focus:border-black" />}
              </div>

              <div className="mt-5 rounded-xl bg-[#f1ece7] px-4 py-3 text-sm text-neutral-600">You will be asked to sign in if you are not already signed in. Your appointment is only created after the salon availability check succeeds.</div>
            </section>
          )}

          {message && <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{message}</div>}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-black/10 px-5 py-5 sm:px-8">
          <button type="button" onClick={previousStep} disabled={step === 1} className="inline-flex items-center gap-2 rounded-full border border-black/20 bg-white px-5 py-2.5 text-sm font-medium transition hover:border-black disabled:cursor-not-allowed disabled:opacity-35"><ArrowLeft size={16} /> Back</button>

          {step < 4 ? (
            <button type="button" onClick={nextStep} className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800"><span>Next step</span><ArrowRight size={16} /></button>
          ) : (
            <button type="submit" disabled={submitting} className="inline-flex min-w-40 items-center justify-center gap-2 rounded-full bg-neutral-900 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50">{submitting ? "Booking..." : "Confirm booking"}</button>
          )}
        </footer>
      </form>
    </main>
  );
}
