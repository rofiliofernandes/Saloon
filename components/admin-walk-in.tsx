"use client";

import { useEffect, useMemo, useState } from "react";

type Customer = {
  id: string;
  name: string;
  email?: string;
};

type ServiceOption = {
  id: string;
  name: string;
  price: number;
  price_type: "fixed" | "from" | "percentage";
  duration_minutes: number;
  active?: boolean;
};

type Service = {
  id: string;
  name: string;
  active: boolean;
  category_id: string | null;
  service_categories?: {
    id: string;
    name: string;
    display_order: number;
  } | null;
  service_options?: ServiceOption[];
};

type Row = {
  id: string;
  name: string;
  price?: number;
  duration_minutes?: number;
};

export default function AdminWalkIn() {
  const [open, setOpen] = useState(false);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [openServiceCategory, setOpenServiceCategory] = useState<string | null>(null);
  const [serviceOptionId, setServiceOptionId] = useState("");
  const [stylists, setStylists] = useState<Row[]>([]);

  const [customerId, setCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerResults, setShowCustomerResults] = useState(false);

  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");

  const [serviceId, setServiceId] = useState("");
  const [serviceSearch, setServiceSearch] = useState("");
  const [stylistId, setStylistId] = useState("");
  const [stylistSearch, setStylistSearch] = useState("");
  const [showStylistResults, setShowStylistResults] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [price, setPrice] = useState("");

  const [status, setStatus] = useState<
    "confirmed" | "completed"
  >("completed");

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState("");

  async function loadData() {
    setLoadingData(true);
    setError("");

    try {
      const [
        customersResponse,
        servicesResponse,
        stylistsResponse,
      ] = await Promise.all([
        fetch("/api/admin/customers"),
        fetch("/api/admin/service-catalogue", { cache: "no-store" }),
        fetch("/api/admin/stylists"),
      ]);

      const customersData =
        await customersResponse.json();
      const servicesData =
        await servicesResponse.json();
      const stylistsData =
        await stylistsResponse.json();

      if (!customersResponse.ok) {
        throw new Error(
          customersData.error ||
            "Unable to load customers."
        );
      }

      if (!servicesResponse.ok) {
        throw new Error(
          servicesData.error ||
            "Unable to load services."
        );
      }

      if (!stylistsResponse.ok) {
        throw new Error(
          stylistsData.error ||
            "Unable to load stylists."
        );
      }

      setCustomers(customersData.rows || []);
      setServices(servicesData.rows || []);
      setStylists(stylistsData.rows || []);
    } catch (e: any) {
      setError(
        e?.message ||
          "Unable to load walk-in data."
      );
    } finally {
      setLoadingData(false);
    }
  }

  useEffect(() => {
    if (open) {
      loadData();

      /*
       * Walk-ins default to the current
       * India-local date and time.
       */
      const now = new Date();

      const dateFormatter =
        new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Kolkata",
        });

      const timeFormatter =
        new Intl.DateTimeFormat("en-GB", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          minute: "2-digit",
          hourCycle: "h23",
        });

      setDate(
        dateFormatter.format(now)
      );

      setTime(
        timeFormatter.format(now)
      );
    }
  }, [open]);

  const filteredCustomers = useMemo(() => {
    const query =
      customerSearch.trim().toLowerCase();

    if (!query) {
      return customers.slice(0, 8);
    }

    return customers
      .filter((customer) => {
        const name =
          customer.name?.toLowerCase() || "";

        const email =
          customer.email?.toLowerCase() || "";

        return (
          name.includes(query) ||
          email.includes(query)
        );
      })
      .slice(0, 8);
  }, [customers, customerSearch]);

  function selectExistingCustomer(
    customer: Customer
  ) {
    setCustomerId(customer.id);

    setCustomerSearch(
      customer.email
        ? `${customer.name} · ${customer.email}`
        : customer.name
    );

    setShowCustomerResults(false);
    setIsNewCustomer(false);

    setNewCustomerName("");
    setNewCustomerEmail("");
  }

  function startNewCustomer() {
    setCustomerId("");
    setCustomerSearch("");
    setShowCustomerResults(false);

    setIsNewCustomer(true);

    setNewCustomerName("");
    setNewCustomerEmail("");
  }

  function resetCustomer() {
    setCustomerId("");
    setCustomerSearch("");
    setShowCustomerResults(false);

    setIsNewCustomer(false);

    setNewCustomerName("");
    setNewCustomerEmail("");
  }

  const filteredServices = useMemo(() => {
    const query = serviceSearch.trim().toLowerCase();
    if (!query) return services;
    return services.filter((service) => {
      const category = service.service_categories?.name?.toLowerCase() || "";
      return service.name.toLowerCase().includes(query) || category.includes(query) || (service.service_options || []).some((option) => option.name.toLowerCase().includes(query));
    });
  }, [services, serviceSearch]);

  const filteredStylists = useMemo(() => {
    const query = stylistSearch.trim().toLowerCase();
    if (!query) return stylists.slice(0, 8);
    return stylists.filter((stylist) => stylist.name.toLowerCase().includes(query)).slice(0, 8);
  }, [stylists, stylistSearch]);

  function handleServiceChange(value: string) {
    setServiceId(value);
    setServiceSearch(services.find((item) => item.id === value)?.name || "");
    setServiceOptionId("");

    const service = services.find((item) => item.id === value);
    const options = (service?.service_options || []).filter((option) => option.active !== false);

    if (options.length === 1) {
      setServiceOptionId(options[0].id);
      setPrice(String(Number(options[0].price || 0)));
    } else {
      setPrice("");
    }
  }

  function resetForm() {
    setCustomerId("");
    setCustomerSearch("");
    setShowCustomerResults(false);

    setIsNewCustomer(false);

    setNewCustomerName("");
    setNewCustomerEmail("");

    setServiceId("");
    setServiceOptionId("");
    setServiceSearch("");
    setOpenServiceCategory(null);
    setStylistId("");
    setStylistSearch("");
    setShowStylistResults(false);
    setDate("");
    setTime("");
    setPrice("");
    setStatus("completed");
    setError("");
  }

  async function createWalkIn() {
    setError("");

    if (!customerId && !isNewCustomer) {
      setError(
        "Please select an existing customer or choose New customer."
      );
      return;
    }

    if (
      isNewCustomer &&
      !newCustomerName.trim()
    ) {
      setError(
        "Please enter the customer's name."
      );
      return;
    }

    if (!serviceId) {
      setError("Please select a service.");
      return;
    }

    if (!serviceOptionId) {
      setError("Please select a service option.");
      return;
    }

    if (!stylistId) {
      setError(
        "Please select a stylist."
      );
      return;
    }

    if (!date || !time) {
      setError(
        "Please select the appointment date and time."
      );
      return;
    }

    const numericPrice = Number(price);

    if (
      !Number.isFinite(numericPrice) ||
      numericPrice < 0
    ) {
      setError(
        "Please enter a valid amount."
      );
      return;
    }

    setLoading(true);

    try {
      /*
       * Salon operates in India.
       */
      const startTime = new Date(
        `${date}T${time}:00+05:30`
      );

      if (
        Number.isNaN(
          startTime.getTime()
        )
      ) {
        setError(
          "Invalid appointment date or time."
        );
        return;
      }

      const response = await fetch(
        "/api/admin/appointments",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            customer_id:
              customerId || null,

            new_customer: isNewCustomer
              ? {
                  name:
                    newCustomerName.trim(),
                  email:
                    newCustomerEmail.trim() ||
                    null,
                }
              : null,

            service_id: serviceId,
            service_option_id: serviceOptionId,
            stylist_id: stylistId,

            start_time:
              startTime.toISOString(),

            price: numericPrice,
            status,
          }),
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        setError(
          result.error ||
            "Unable to create walk-in appointment."
        );
        return;
      }

      setOpen(false);
      resetForm();

      window.location.reload();
    } catch {
      setError(
        "Unable to create walk-in appointment."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
      >
        + Walk-in
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">

            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-neutral-400">
                  Admin
                </p>

                <h2 className="mt-1 text-2xl font-semibold">
                  New walk-in appointment
                </h2>

                <p className="mt-1 text-sm text-neutral-500">
                  Record an appointment made at the salon.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  resetForm();
                }}
                className="rounded-full border px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50"
              >
                Close
              </button>
            </div>

            {loadingData ? (
              <div className="mt-8 rounded-2xl bg-neutral-50 p-6 text-center text-sm text-neutral-500">
                Loading customers, services and stylists...
              </div>
            ) : (
              <div className="mt-6 space-y-5">

                {/* CUSTOMER */}

                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">
                      Customer
                    </label>

                    {customerId &&
                      !isNewCustomer && (
                        <button
                          type="button"
                          onClick={resetCustomer}
                          className="text-xs text-neutral-500 hover:text-neutral-900"
                        >
                          Change
                        </button>
                      )}
                  </div>

                  {!isNewCustomer ? (
                    <>
                      <div className="relative mt-2">
                        <input
                          type="text"
                          value={customerSearch}
                          onChange={(event) => {
                            setCustomerSearch(
                              event.target.value
                            );
                            setCustomerId("");
                            setShowCustomerResults(
                              true
                            );
                          }}
                          onFocus={() =>
                            setShowCustomerResults(
                              true
                            )
                          }
                          placeholder="Search customer by name or email..."
                          className="w-full rounded-xl border px-3 py-3 text-sm outline-none focus:border-neutral-500"
                        />

                        {showCustomerResults && (
                          <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-72 overflow-y-auto rounded-2xl border bg-white p-2 shadow-xl">
                            <button
                              type="button"
                              onClick={startNewCustomer}
                              className="sticky top-0 z-10 mb-1 w-full rounded-xl border border-black/10 bg-neutral-50 px-3 py-3 text-left text-sm font-semibold text-neutral-900 shadow-sm hover:bg-neutral-100"
                            >
                              + New customer
                              <span className="mt-0.5 block text-xs font-normal text-neutral-500">Create a walk-in customer record</span>
                            </button>

                            {filteredCustomers.length >
                            0 ? (
                              filteredCustomers.map(
                                (customer) => (
                                  <button
                                    key={
                                      customer.id
                                    }
                                    type="button"
                                    onClick={() =>
                                      selectExistingCustomer(
                                        customer
                                      )
                                    }
                                    className="w-full rounded-xl px-3 py-3 text-left hover:bg-neutral-50"
                                  >
                                    <p className="text-sm font-medium text-neutral-900">
                                      {
                                        customer.name
                                      }
                                    </p>

                                    {customer.email && (
                                      <p className="mt-0.5 text-xs text-neutral-500">
                                        {
                                          customer.email
                                        }
                                      </p>
                                    )}
                                  </button>
                                )
                              )
                            ) : customerSearch.trim() ? (
                              <div className="px-3 py-4 text-sm text-neutral-500">
                                No customers found.
                              </div>
                            ) : (
                              <div className="px-3 py-4 text-sm text-neutral-500">
                                Start typing to search customers.
                              </div>
                            )}


                          </div>
                        )}
                      </div>

                      {!customerId &&
                        !customerSearch && (
                          <p className="mt-2 text-xs text-neutral-400">
                            Search by name or email, or create a new customer.
                          </p>
                        )}
                    </>
                  ) : (
                    <div className="mt-2 rounded-2xl border bg-neutral-50 p-4">
                      <div className="mb-4 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">
                            New customer
                          </p>

                          <p className="mt-0.5 text-xs text-neutral-500">
                            Name is required. Email is optional.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={resetCustomer}
                          className="text-xs text-neutral-500 hover:text-neutral-900"
                        >
                          Use existing
                        </button>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-medium text-neutral-600">
                            Name
                          </label>

                          <input
                            type="text"
                            value={
                              newCustomerName
                            }
                            onChange={(event) =>
                              setNewCustomerName(
                                event.target.value
                              )
                            }
                            placeholder="Customer name"
                            className="mt-1 w-full rounded-xl border bg-white px-3 py-3 text-sm"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-medium text-neutral-600">
                            Email
                          </label>

                          <input
                            type="email"
                            value={
                              newCustomerEmail
                            }
                            onChange={(event) =>
                              setNewCustomerEmail(
                                event.target.value
                              )
                            }
                            placeholder="Optional"
                            className="mt-1 w-full rounded-xl border bg-white px-3 py-3 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* SERVICE */}

                <div>
                  <label className="text-sm font-medium">Service</label>
                  <div className="relative mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCustomerResults(false);
                        setShowStylistResults(false);
                        setServiceSearch("");
                        setOpenServiceCategory((current) => current === "__root" ? null : "__root");
                      }}
                      className="flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left text-sm outline-none hover:bg-neutral-50"
                    >
                      <span>{serviceId ? services.find((item) => item.id === serviceId)?.name : "Choose a service"}</span>
                      <span className="text-neutral-400">▾</span>
                    </button>

                    {openServiceCategory === "__root" && (
                      <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-96 overflow-y-auto rounded-2xl border bg-white p-2 shadow-xl">
                        <input
                          autoFocus
                          value={serviceSearch}
                          onChange={(event) => setServiceSearch(event.target.value)}
                          placeholder="Search services..."
                          className="mb-2 w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-neutral-500"
                          onClick={(event) => event.stopPropagation()}
                        />
                        {Array.from(new Map(filteredServices.map((service) => {
                          const category = service.service_categories;
                          return [category?.id || "other", { id: category?.id || "other", name: category?.name || "Other services", display_order: category?.display_order || 9999 }];
                        })).values()).sort((a, b) => a.display_order - b.display_order).map((category) => {
                          const items = filteredServices.filter((service) => (service.service_categories?.id || "other") === category.id);
                          return (
                            <div key={category.id} className="mb-1 last:mb-0">
                              <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">{category.name}</p>
                              {items.map((service) => {
                                const options = (service.service_options || []).filter((option) => option.active !== false);
                                const selected = serviceId === service.id;
                                return (
                                  <div key={service.id}>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        handleServiceChange(service.id);
                                        if (options.length <= 1) setOpenServiceCategory(null);
                                      }}
                                      className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm ${selected ? "bg-neutral-900 text-white" : "hover:bg-neutral-50"}`}
                                    >
                                      <span className="min-w-0 truncate">{service.name}</span>
                                      <span className="ml-3 shrink-0 text-xs opacity-70">{options.length > 1 ? `From ₹${Math.min(...options.map((option) => Number(option.price))).toLocaleString("en-IN")}` : options[0] ? `₹${Number(options[0].price).toLocaleString("en-IN")}` : "—"}</span>
                                    </button>
                                    {selected && options.length > 1 && (
                                      <div className="ml-3 mt-1 space-y-1 border-l border-black/10 pl-2">
                                        {options.map((option) => (
                                          <button
                                            key={option.id}
                                            type="button"
                                            onClick={() => {
                                              setServiceId(service.id);
                                              setServiceSearch(service.name);
                                              setServiceOptionId(option.id);
                                              setPrice(String(Number(option.price || 0)));
                                              setOpenServiceCategory(null);
                                            }}
                                            className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs ${serviceOptionId === option.id ? "bg-neutral-900 text-white" : "bg-neutral-50 hover:bg-neutral-100"}`}
                                          >
                                            <span>{option.name}</span>
                                            <span>{option.price_type === "from" ? "From " : ""}₹{Number(option.price).toLocaleString("en-IN")} · {option.duration_minutes} min</span>
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {serviceId && serviceOptionId && (() => {
                    const selectedService = services.find((item) => item.id === serviceId);
                    const selectedOption = selectedService?.service_options?.find((option) => option.id === serviceOptionId);
                    return selectedOption ? (
                      <p className="mt-2 text-xs text-neutral-500">{selectedOption.name} · {selectedOption.duration_minutes} min · ₹{Number(selectedOption.price).toLocaleString("en-IN")}</p>
                    ) : null;
                  })()}
                </div>

                {/* STYLIST */}

                <div>
                  <label className="text-sm font-medium">Stylist</label>
                  <div className="relative mt-2">
                    <input
                      type="text"
                      value={stylistSearch}
                      onChange={(event) => {
                        setStylistSearch(event.target.value);
                        setStylistId("");
                        setShowStylistResults(true);
                        setOpenServiceCategory(null);
                        setShowCustomerResults(false);
                      }}
                      onFocus={() => {
                        setShowStylistResults(true);
                        setOpenServiceCategory(null);
                        setShowCustomerResults(false);
                      }}
                      placeholder="Search stylist..."
                      className="w-full rounded-xl border px-3 py-3 text-sm outline-none focus:border-neutral-500"
                    />
                    {showStylistResults && (
                      <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-64 overflow-y-auto rounded-2xl border bg-white p-2 shadow-xl">
                        {filteredStylists.length ? filteredStylists.map((stylist) => (
                          <button
                            key={stylist.id}
                            type="button"
                            onClick={() => {
                              setStylistId(stylist.id);
                              setStylistSearch(stylist.name);
                              setShowStylistResults(false);
                            }}
                            className="w-full rounded-xl px-3 py-3 text-left text-sm hover:bg-neutral-50"
                          >
                            {stylist.name}
                          </button>
                        )) : (
                          <div className="px-3 py-4 text-sm text-neutral-500">No matching stylists found.</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* DATE / TIME */}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium">
                      Date
                    </label>

                    <input
                      type="date"
                      value={date}
                      onChange={(event) =>
                        setDate(
                          event.target.value
                        )
                      }
                      className="mt-2 w-full rounded-xl border px-3 py-3 text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">
                      Time
                    </label>

                    <input
                      type="time"
                      value={time}
                      onChange={(event) =>
                        setTime(
                          event.target.value
                        )
                      }
                      className="mt-2 w-full rounded-xl border px-3 py-3 text-sm"
                    />
                  </div>
                </div>

                {/* PRICE / STATUS */}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium">
                      Amount
                    </label>

                    <div className="mt-2 flex items-center rounded-xl border px-3">
                      <span className="text-neutral-500">
                        ₹
                      </span>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={price}
                        onChange={(event) =>
                          setPrice(
                            event.target.value
                          )
                        }
                        className="w-full border-0 px-2 py-3 text-sm outline-none"
                      />
                    </div>

                    <p className="mt-1 text-xs text-neutral-400">
                      Defaults to the service price, but can be changed for a walk-in.
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium">
                      Status
                    </label>

                    <select
                      value={status}
                      onChange={(event) =>
                        setStatus(
                          event.target.value as
                            | "confirmed"
                            | "completed"
                        )
                      }
                      className="mt-2 w-full rounded-xl border px-3 py-3 text-sm"
                    >
                      <option value="completed">
                        Completed
                      </option>

                      <option value="confirmed">
                        Confirmed
                      </option>
                    </select>
                  </div>
                </div>

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setOpen(false);
                      resetForm();
                    }}
                    className="rounded-full border px-5 py-2.5 text-sm hover:bg-neutral-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    disabled={loading}
                    onClick={createWalkIn}
                    className="rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
                  >
                    {loading
                      ? "Saving..."
                      : "Save walk-in"}
                  </button>
                </div>

              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}