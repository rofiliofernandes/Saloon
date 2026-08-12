"use client";

import { useRef, useState } from "react";

type Customer = {
  id: string;
  name: string;
  email?: string | null;
};

type Service = {
  id: string;
  name: string;
  price?: number;
  duration_minutes?: number;
};

type Stylist = {
  id: string;
  name: string;
};

type CustomerMode = "existing" | "new";

export default function AdminWalkIn() {
  const [open, setOpen] = useState(false);

  const [customerMode, setCustomerMode] =
    useState<CustomerMode>("existing");

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [stylists, setStylists] = useState<Stylist[]>([]);

  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerSearchOpen, setCustomerSearchOpen] =
    useState(false);

  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [stylistId, setStylistId] = useState("");
  const [price, setPrice] = useState("");

  const [status, setStatus] =
    useState<"confirmed" | "completed">("completed");

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState("");

  const searchRef = useRef<HTMLDivElement | null>(null);

  /*
   * --------------------------------------------------
   * CURRENT INDIA DATE / TIME
   * --------------------------------------------------
   */

  function getIndiaNow() {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date());

    const get = (type: string) =>
      parts.find((part) => part.type === type)?.value || "";

    return {
      date: `${get("year")}-${get("month")}-${get("day")}`,
      time: `${get("hour")}:${get("minute")}`,
    };
  }

  /*
   * --------------------------------------------------
   * LOAD BASIC DATA
   * --------------------------------------------------
   */

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
        fetch("/api/admin/services"),
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

  /*
   * --------------------------------------------------
   * CUSTOMER SEARCH
   * --------------------------------------------------
   */

  async function searchCustomers(value: string) {
    setCustomerSearch(value);
    setCustomerSearchOpen(true);

    try {
      const response = await fetch(
        `/api/admin/customers?q=${encodeURIComponent(value)}`
      );

      const result = await response.json();

      if (response.ok) {
        setCustomers(result.rows || []);
      }
    } catch {
      // Ignore search errors.
    }
  }

  /*
   * --------------------------------------------------
   * SERVICE
   * --------------------------------------------------
   */

  function handleServiceChange(value: string) {
    setServiceId(value);
    setStylistId("");

    const service = services.find(
      (item) => item.id === value
    );

    if (service) {
      setPrice(
        String(Number(service.price || 0))
      );
    } else {
      setPrice("");
    }
  }

  /*
   * --------------------------------------------------
   * CUSTOMER
   * --------------------------------------------------
   */

  function selectCustomer(customer: Customer) {
    setCustomerId(customer.id);
    setCustomerSearch(customer.name);
    setCustomerSearchOpen(false);
  }

  function switchCustomerMode(mode: CustomerMode) {
    setCustomerMode(mode);

    setCustomerId("");
    setCustomerSearch("");
    setCustomerName("");
    setCustomerEmail("");
    setCustomerSearchOpen(false);
  }

  /*
   * --------------------------------------------------
   * RESET
   * --------------------------------------------------
   */

  function resetForm() {
    setCustomerMode("existing");

    setCustomerId("");
    setCustomerName("");
    setCustomerEmail("");
    setCustomerSearch("");
    setCustomerSearchOpen(false);

    setServiceId("");
    setDate("");
    setTime("");
    setStylistId("");

    setPrice("");
    setStatus("completed");
    setError("");
  }

  /*
   * --------------------------------------------------
   * OPEN WALK-IN
   * --------------------------------------------------
   */

  function openWalkIn() {
    const now = getIndiaNow();

    resetForm();

    setDate(now.date);
    setTime(now.time);

    setOpen(true);
    loadData();
  }

  /*
   * --------------------------------------------------
   * CREATE WALK-IN
   * --------------------------------------------------
   */

  async function createWalkIn() {
    setError("");

    if (customerMode === "existing") {
      if (!customerId) {
        setError(
          "Please select an existing customer."
        );
        return;
      }
    }

    if (customerMode === "new") {
      if (!customerName.trim()) {
        setError(
          "Please enter the customer's name."
        );
        return;
      }
    }

    if (!serviceId) {
      setError("Please select a service.");
      return;
    }

    if (!date || !time) {
      setError(
        "Please select the appointment date and time."
      );
      return;
    }

    if (!stylistId) {
      setError("Please select a stylist.");
      return;
    }

    const numericPrice = Number(price);

    if (
      !Number.isFinite(numericPrice) ||
      numericPrice < 0
    ) {
      setError("Please enter a valid amount.");
      return;
    }

    setLoading(true);

    try {
      const startTime = new Date(
        `${date}T${time}:00+05:30`
      );

      if (Number.isNaN(startTime.getTime())) {
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
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            customer_id:
              customerMode === "existing"
                ? customerId
                : null,

            new_customer:
              customerMode === "new"
                ? {
                    name: customerName.trim(),
                    email:
                      customerEmail.trim() || null,
                  }
                : null,

            service_id: serviceId,
            stylist_id: stylistId,
            start_time: startTime.toISOString(),
            price: numericPrice,
            status,
          }),
        }
      );

      const result = await response.json();

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

  /*
   * --------------------------------------------------
   * UI
   * --------------------------------------------------
   */

  return (
    <>
      <button
        type="button"
        onClick={openWalkIn}
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

                    <button
                      type="button"
                      onClick={() =>
                        switchCustomerMode(
                          customerMode === "existing"
                            ? "new"
                            : "existing"
                        )
                      }
                      className="text-sm text-neutral-500 underline underline-offset-2 hover:text-neutral-900"
                    >
                      {customerMode === "existing"
                        ? "＋ New customer"
                        : "← Existing customer"}
                    </button>
                  </div>

                  {customerMode === "existing" ? (
                    <div
                      ref={searchRef}
                      className="relative mt-2"
                    >
                      <input
                        type="text"
                        value={customerSearch}
                        onChange={(event) =>
                          searchCustomers(
                            event.target.value
                          )
                        }
                        onFocus={() => {
                          setCustomerSearchOpen(true);
                          searchCustomers(
                            customerSearch
                          );
                        }}
                        placeholder="Search name or email..."
                        className="w-full rounded-xl border px-3 py-3 text-sm outline-none focus:border-neutral-900"
                      />

                      {customerId && (
                        <button
                          type="button"
                          onClick={() => {
                            setCustomerId("");
                            setCustomerSearch("");
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 hover:text-neutral-900"
                        >
                          Clear
                        </button>
                      )}

                      {customerSearchOpen && (
                        <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-56 overflow-y-auto rounded-2xl border bg-white p-1 shadow-xl">
                          {!customers.length ? (
                            <div className="px-3 py-4 text-sm text-neutral-500">
                              No customers found.
                            </div>
                          ) : (
                            customers.map(
                              (customer) => (
                                <button
                                  key={customer.id}
                                  type="button"
                                  onClick={() =>
                                    selectCustomer(
                                      customer
                                    )
                                  }
                                  className="block w-full rounded-xl px-3 py-3 text-left hover:bg-neutral-50"
                                >
                                  <p className="text-sm font-medium">
                                    {customer.name}
                                  </p>

                                  {customer.email && (
                                    <p className="mt-0.5 text-xs text-neutral-500">
                                      {customer.email}
                                    </p>
                                  )}
                                </button>
                              )
                            )
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-2 rounded-2xl border p-4">
                      <label className="text-xs text-neutral-500">
                        Name
                      </label>

                      <input
                        type="text"
                        value={customerName}
                        onChange={(event) =>
                          setCustomerName(
                            event.target.value
                          )
                        }
                        placeholder="Customer name"
                        className="mt-1 w-full rounded-xl border px-3 py-3 text-sm"
                      />

                      <label className="mt-4 block text-xs text-neutral-500">
                        Email{" "}
                        <span className="text-neutral-400">
                          optional
                        </span>
                      </label>

                      <input
                        type="email"
                        value={customerEmail}
                        onChange={(event) =>
                          setCustomerEmail(
                            event.target.value
                          )
                        }
                        placeholder="customer@example.com"
                        className="mt-1 w-full rounded-xl border px-3 py-3 text-sm"
                      />
                    </div>
                  )}
                </div>

                {/* SERVICE */}

                <div>
                  <label className="text-sm font-medium">
                    Service
                  </label>

                  <select
                    value={serviceId}
                    onChange={(event) =>
                      handleServiceChange(
                        event.target.value
                      )
                    }
                    className="mt-2 w-full rounded-xl border px-3 py-3 text-sm"
                  >
                    <option value="">
                      Select service
                    </option>

                    {services.map((service) => (
                      <option
                        key={service.id}
                        value={service.id}
                      >
                        {service.name} · ₹
                        {Number(
                          service.price || 0
                        ).toFixed(2)}
                      </option>
                    ))}
                  </select>
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

                {/* STYLIST */}

                <div>
                  <label className="text-sm font-medium">
                    Stylist
                  </label>

                  <select
                    value={stylistId}
                    disabled={!serviceId}
                    onChange={(event) =>
                      setStylistId(
                        event.target.value
                      )
                    }
                    className="mt-2 w-full rounded-xl border px-3 py-3 text-sm disabled:bg-neutral-50 disabled:text-neutral-400"
                  >
                    <option value="">
                      {!serviceId
                        ? "Select a service first"
                        : "Select stylist"}
                    </option>

                    {stylists.map((stylist) => (
                      <option
                        key={stylist.id}
                        value={stylist.id}
                      >
                        {stylist.name}
                      </option>
                    ))}
                  </select>

                  <p className="mt-1 text-xs text-neutral-400">
                    Choose the stylist handling this walk-in.
                  </p>
                </div>

                {/* AMOUNT / STATUS */}

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

                {/* ERROR */}

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                {/* ACTIONS */}

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