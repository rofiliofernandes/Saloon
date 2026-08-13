"use client";

import { useEffect, useMemo, useState } from "react";

type Customer = {
  id: string;
  name: string;
  email?: string;
};

type Row = {
  id: string;
  name: string;
  price?: number;
  duration_minutes?: number;
  category?: string;
};

export default function AdminWalkIn() {
  const [open, setOpen] = useState(false);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Row[]>([]);
  const [stylists, setStylists] = useState<Row[]>([]);
  const [availableStylists, setAvailableStylists] = useState<Row[]>([]);

  const [customerId, setCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerResults, setShowCustomerResults] = useState(false);

  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");

  const [serviceId, setServiceId] = useState("");
  const [stylistId, setStylistId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [price, setPrice] = useState("");

  const [status, setStatus] = useState<
    "confirmed" | "completed"
  >("completed");

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [checkingAvailability, setCheckingAvailability] =
    useState(false);

  const [availabilityMessage, setAvailabilityMessage] =
    useState("");

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

  function getIndiaDateTime() {
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

    return {
      date: dateFormatter.format(now),
      time: timeFormatter.format(now),
    };
  }

  useEffect(() => {
    if (!open) return;

    loadData();

    const current = getIndiaDateTime();

    setDate(current.date);
    setTime(current.time);
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

  function handleServiceChange(
    value: string
  ) {
    setServiceId(value);
    setStylistId("");

    const service = services.find(
      (item) => item.id === value
    );

    if (service) {
      setPrice(
        String(
          Number(service.price || 0)
        )
      );
    } else {
      setPrice("");
    }

    setAvailableStylists([]);
    setAvailabilityMessage("");
  }

  async function checkAvailability() {
    setAvailableStylists([]);
    setStylistId("");
    setAvailabilityMessage("");
    setError("");

    if (!serviceId || !date || !time) {
      return;
    }

    setCheckingAvailability(true);

    try {
      const params = new URLSearchParams({
        service_id: serviceId,
        date,
        time,
      });

      const response = await fetch(
        `/api/admin/available-stylists?${params.toString()}`
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to check stylist availability."
        );
      }

      const rows = result.rows || [];

      setAvailableStylists(rows);

      if (!rows.length) {
        setAvailabilityMessage(
          "No stylist is available for this service at this time."
        );
      }
    } catch (e: any) {
      setAvailabilityMessage("");
      setError(
        e?.message ||
          "Unable to check stylist availability."
      );
    } finally {
      setCheckingAvailability(false);
    }
  }

  useEffect(() => {
    if (!open) return;

    if (!serviceId || !date || !time) {
      setAvailableStylists([]);
      setStylistId("");
      setAvailabilityMessage("");
      return;
    }

    const timer = setTimeout(() => {
      checkAvailability();
    }, 250);

    return () => clearTimeout(timer);
  }, [serviceId, date, time, open]);

  function resetForm() {
    setCustomerId("");
    setCustomerSearch("");
    setShowCustomerResults(false);

    setIsNewCustomer(false);

    setNewCustomerName("");
    setNewCustomerEmail("");

    setServiceId("");
    setStylistId("");
    setAvailableStylists([]);

    setDate("");
    setTime("");
    setPrice("");

    setStatus("completed");

    setCheckingAvailability(false);
    setAvailabilityMessage("");
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
      setError(
        "Please select a service."
      );
      return;
    }

    if (!stylistId) {
      setError(
        "Please select an available stylist."
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
                          <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-64 overflow-y-auto rounded-2xl border bg-white p-2 shadow-xl">

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

                            <button
                              type="button"
                              onClick={
                                startNewCustomer
                              }
                              className="mt-1 w-full border-t px-3 py-3 pt-3 text-left text-sm font-medium text-neutral-900 hover:bg-neutral-50"
                            >
                              + New customer
                            </button>
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
                          onClick={
                            resetCustomer
                          }
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
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">
                      Available stylist
                    </label>

                    {checkingAvailability && (
                      <span className="text-xs text-neutral-400">
                        Checking availability...
                      </span>
                    )}
                  </div>

                  <select
                    value={stylistId}
                    disabled={
                      checkingAvailability ||
                      !serviceId ||
                      !date ||
                      !time ||
                      availableStylists.length === 0
                    }
                    onChange={(event) =>
                      setStylistId(
                        event.target.value
                      )
                    }
                    className="mt-2 w-full rounded-xl border px-3 py-3 text-sm disabled:bg-neutral-50 disabled:text-neutral-400"
                  >
                    <option value="">
                      {checkingAvailability
                        ? "Checking availability..."
                        : !serviceId
                        ? "Select a service first"
                        : "Select available stylist"}
                    </option>

                    {availableStylists.map(
                      (stylist) => (
                        <option
                          key={stylist.id}
                          value={stylist.id}
                        >
                          {stylist.name}
                          {stylist.category
                            ? ` · ${stylist.category}`
                            : ""}
                        </option>
                      )
                    )}
                  </select>

                  {!checkingAvailability &&
                    serviceId &&
                    date &&
                    time &&
                    availabilityMessage && (
                      <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
                        {availabilityMessage}
                      </p>
                    )}

                  {!checkingAvailability &&
                    availableStylists.length > 0 && (
                      <p className="mt-2 text-xs text-neutral-400">
                        Showing only stylists who can perform this service and are free for the selected time.
                      </p>
                    )}
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
                    disabled={
                      loading ||
                      checkingAvailability ||
                      !stylistId
                    }
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
