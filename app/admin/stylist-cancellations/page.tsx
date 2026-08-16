"use client";

import { useEffect, useMemo, useState } from "react";

type Appointment = {
  id: string;
  customer_id: string | null;
  service_id: string;
  stylist_id: string;
  start_time: string;
  end_time: string;
  price: number;
};

type Stylist = {
  id: string;
  name: string;
};

type Customer = {
  id: string;
  name: string;
  phone?: string | null;
};

type Coupon = {
  id: string;
  code: string;
  discount: number;
  expiresAt: string;
  customerId?: string;
  customerName?: string;
  phone?: string | null;
  whatsappMessage?: string;
};

function indiaToday() {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ).format(new Date());
}

function formatPhone(
  phone?: string | null
) {
  if (!phone) {
    return "No phone number";
  }

  const digits =
    phone.replace(/\D/g, "");

  if (
    digits.length === 12 &&
    digits.startsWith("91")
  ) {
    const local =
      digits.slice(2);

    return `+91 ${local.slice(
      0,
      5
    )} ${local.slice(5)}`;
  }

  if (
    digits.length === 10
  ) {
    return `+91 ${digits.slice(
      0,
      5
    )} ${digits.slice(5)}`;
  }

  return phone;
}

function defaultMessage(
  name: string,
  coupon: Coupon
) {
  const first =
    name.trim().split(/\s+/)[0] ||
    "there";

  const expiry =
    new Date(
      coupon.expiresAt
    ).toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }
    );

  return `Hi ${first}, we&apos;re very sorry for the inconvenience caused by the cancellation of your appointment at AK Hair & Beauty Salon.

As an apology, we&apos;ve created a ${coupon.discount}% off coupon for your next appointment.

Your coupon code is: ${coupon.code}

This coupon can be used once and is valid until ${expiry}.

We apologise again and hope to see you soon.`;
}

export default function StylistCancellations() {
  const [stylists, setStylists] =
    useState<Stylist[]>([]);

  const [customers, setCustomers] =
    useState<Customer[]>([]);

  const [stylistId, setStylistId] =
    useState("");

  const [date, setDate] =
    useState(indiaToday());

  const [startTime, setStartTime] =
    useState("09:00");

  const [endTime, setEndTime] =
    useState("18:00");

  const [reason, setReason] =
    useState(
      "Stylist is unavailable."
    );

  const [
    affectedAppointments,
    setAffectedAppointments,
  ] = useState<Appointment[]>([]);

  const [
    pendingTimeOff,
    setPendingTimeOff,
  ] = useState<any>(null);

  const [
    coupons,
    setCoupons,
  ] = useState<Coupon[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [
    resolvingId,
    setResolvingId,
  ] = useState<string | null>(
    null
  );

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  useEffect(() => {
    async function load() {
      try {
        const [
          stylistsResponse,
          customersResponse,
        ] = await Promise.all([
          fetch(
            "/api/admin/stylists",
            {
              cache: "no-store",
            }
          ),
          fetch(
            "/api/admin/customers",
            {
              cache: "no-store",
            }
          ),
        ]);

        const stylistsData =
          await stylistsResponse.json();

        const customersData =
          await customersResponse.json();

        if (!stylistsResponse.ok) {
          throw new Error(
            stylistsData.error ||
              "Unable to load stylists."
          );
        }

        if (!customersResponse.ok) {
          throw new Error(
            customersData.error ||
              "Unable to load customers."
          );
        }

        setStylists(
          stylistsData.rows || []
        );

        setCustomers(
          customersData.rows || []
        );
      } catch (e: any) {
        setError(
          e?.message ||
            "Unable to load data."
        );
      }
    }

    load();
  }, []);

  const customerMap =
    useMemo(() => {
      const map = new Map<
        string,
        Customer
      >();

      for (const customer of customers) {
        map.set(
          customer.id,
          customer
        );
      }

      return map;
    }, [customers]);

  function customerFor(
    appointment: Appointment
  ) {
    return appointment.customer_id
      ? customerMap.get(
          appointment.customer_id
        )
      : undefined;
  }

  async function startCancellation() {
    setError("");
    setSuccess("");
    setCoupons([]);

    if (!stylistId) {
      setError(
        "Please select a stylist."
      );
      return;
    }

    if (
      !date ||
      !startTime ||
      !endTime
    ) {
      setError(
        "Please choose the date and times."
      );
      return;
    }

    if (endTime <= startTime) {
      setError(
        "End time must be after start time."
      );
      return;
    }

    setLoading(true);

    try {
      const start =
        new Date(
          `${date}T${startTime}:00+05:30`
        );

      const end =
        new Date(
          `${date}T${endTime}:00+05:30`
        );

      const payload = {
        stylist_id: stylistId,
        start_time:
          start.toISOString(),
        end_time:
          end.toISOString(),
        reason:
          reason.trim() ||
          "Stylist is unavailable.",
      };

      const response =
        await fetch(
          "/api/admin/blocked-periods",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify(
                payload
              ),
          }
        );

      const result =
        await response.json();

      if (response.status === 409) {
        setPendingTimeOff(
          payload
        );

        setAffectedAppointments(
          result.appointments ||
            []
        );

        if (
          !result.appointments?.length
        ) {
          setSuccess(
            "No affected appointments were found."
          );
        }

        return;
      }

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to create stylist cancellation."
        );
      }

      setSuccess(
        "Time off created. No appointments were affected."
      );
    } catch (e: any) {
      setError(
        e?.message ||
          "Unable to start cancellation."
      );
    } finally {
      setLoading(false);
    }
  }

  async function resolveAppointment(
    appointmentId: string,
    action:
      | "cancel"
      | "reassign",
    replacementStylist?: string
  ) {
    setError("");
    setResolvingId(
      appointmentId
    );

    try {
      const response =
        await fetch(
          `/api/admin/appointments/${appointmentId}`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                action,
                reason:
                  pendingTimeOff?.reason ||
                  "Stylist is unavailable.",
                stylist_id:
                  replacementStylist ||
                  undefined,
              }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to resolve appointment."
        );
      }

      /*
       * Cancellation generated a coupon.
       */
      if (
        action === "cancel" &&
        result.compensationCoupon
      ) {
        const raw =
          result.compensationCoupon;

        const customer =
          customerFor(
            affectedAppointments.find(
              (item) =>
                item.id ===
                appointmentId
            ) as Appointment
          );

        const coupon: Coupon = {
          id: raw.id,
          code: raw.code,
          discount:
            Number(
              raw.discount
            ),
          expiresAt:
            raw.expiresAt,
          customerId:
            raw.customerId,
          customerName:
            raw.customerName ||
            customer?.name ||
            "Customer",
          phone:
            raw.phone ||
            customer?.phone ||
            null,
          whatsappMessage:
            raw.whatsappMessage,
        };

        setCoupons(
          (current) => [
            ...current,
            coupon,
          ]
        );
      }

      const remaining =
        affectedAppointments.filter(
          (item) =>
            item.id !==
            appointmentId
        );

      setAffectedAppointments(
        remaining
      );

      /*
       * All appointments resolved:
       * create the actual blocked period.
       */
      if (
        remaining.length === 0 &&
        pendingTimeOff
      ) {
        const retry =
          await fetch(
            "/api/admin/blocked-periods",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body:
                JSON.stringify(
                  pendingTimeOff
                ),
            }
          );

        const retryResult =
          await retry.json();

        if (!retry.ok) {
          throw new Error(
            retryResult.error ||
              "Appointments were resolved, but the time off could not be created."
          );
        }

        setPendingTimeOff(
          null
        );

        setSuccess(
          "Stylist cancellation completed and time off was created."
        );
      }
    } catch (e: any) {
      setError(
        e?.message ||
          "Unable to resolve appointment."
      );
    } finally {
      setResolvingId(null);
    }
  }

  async function cancelAll() {
    const remaining = [
      ...affectedAppointments,
    ];

    for (const appointment of remaining) {
      await resolveAppointment(
        appointment.id,
        "cancel"
      );
    }
  }

  async function copy(
    text: string
  ) {
    await navigator.clipboard.writeText(
      text
    );
  }

  async function copyAllMessages() {
    const text =
      coupons
        .map(
          (coupon) => {
            const message =
              coupon.whatsappMessage ||
              defaultMessage(
                coupon.customerName ||
                  "Customer",
                coupon
              );

            return `${coupon.customerName}
${formatPhone(coupon.phone)}

${message}`;
          }
        )
        .join(
          "\n\n--------------------\n\n"
        );

    await copy(text);

    setSuccess(
      "All WhatsApp messages copied."
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <p className="text-sm uppercase tracking-widest text-neutral-500">
        Admin
      </p>

      <h1 className="mt-2 text-4xl font-semibold">
        Stylist Cancellation
      </h1>

      <p className="mt-2 max-w-2xl text-sm text-neutral-500">
        Cancel a stylist&apos;s affected appointments,
        generate exactly one compensation coupon per
        cancelled customer, and copy the WhatsApp
        messages directly from the Admin panel.
      </p>

      <section className="mt-8 rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">
          Start cancellation
        </h2>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium">
              Stylist
            </label>

            <select
              value={stylistId}
              onChange={(e) =>
                setStylistId(
                  e.target.value
                )
              }
              className="mt-2 w-full rounded-xl border px-4 py-3"
            >
              <option value="">
                Select stylist
              </option>

              {stylists.map(
                (stylist) => (
                  <option
                    key={stylist.id}
                    value={stylist.id}
                  >
                    {stylist.name}
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">
              Date
            </label>

            <input
              type="date"
              value={date}
              min={indiaToday()}
              onChange={(e) =>
                setDate(
                  e.target.value
                )
              }
              className="mt-2 w-full rounded-xl border px-4 py-3"
            />
          </div>

          <div>
            <label className="text-sm font-medium">
              Start time
            </label>

            <input
              type="time"
              value={startTime}
              onChange={(e) =>
                setStartTime(
                  e.target.value
                )
              }
              className="mt-2 w-full rounded-xl border px-4 py-3"
            />
          </div>

          <div>
            <label className="text-sm font-medium">
              End time
            </label>

            <input
              type="time"
              value={endTime}
              onChange={(e) =>
                setEndTime(
                  e.target.value
                )
              }
              className="mt-2 w-full rounded-xl border px-4 py-3"
            />
          </div>
        </div>

        <div className="mt-5">
          <label className="text-sm font-medium">
            Reason
          </label>

          <input
            value={reason}
            onChange={(e) =>
              setReason(
                e.target.value
              )
            }
            className="mt-2 w-full rounded-xl border px-4 py-3"
          />
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={
            startCancellation
          }
          className="mt-6 rounded-xl bg-neutral-900 px-5 py-3 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading
            ? "Checking appointments..."
            : "Check affected appointments"}
        </button>
      </section>

      {error && (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
          {success}
        </div>
      )}

      {affectedAppointments.length >
        0 && (
        <section className="mt-8 rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">
                {affectedAppointments.length} affected appointment
                {affectedAppointments.length ===
                1
                  ? ""
                  : "s"}
              </h2>

              <p className="mt-1 text-sm text-neutral-500">
                Reassign customers who can be saved,
                or cancel them to generate compensation
                coupons.
              </p>
            </div>

            <button
              type="button"
              disabled={
                !!resolvingId
              }
              onClick={
                cancelAll
              }
              className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white"
            >
              Cancel all
            </button>
          </div>

          <div className="mt-6 space-y-4">
            {affectedAppointments.map(
              (appointment) => {
                const customer =
                  customerFor(
                    appointment
                  );

                const busy =
                  resolvingId ===
                  appointment.id;

                return (
                  <div
                    key={
                      appointment.id
                    }
                    className="rounded-2xl border p-5"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="font-semibold">
                          {customer?.name ||
                            "Customer"}
                        </p>

                        <p className="mt-1 text-sm text-neutral-500">
                          {formatPhone(
                            customer?.phone
                          )}
                        </p>

                        <p className="mt-2 text-sm">
                          {new Date(
                            appointment.start_time
                          ).toLocaleString(
                            "en-IN",
                            {
                              weekday:
                                "short",
                              day: "2-digit",
                              month:
                                "short",
                              hour:
                                "2-digit",
                              minute:
                                "2-digit",
                            }
                          )}
                        </p>

                        <p className="mt-1 font-semibold">
                          ₹
                          {Number(
                            appointment.price ||
                              0
                          ).toFixed(2)}
                        </p>
                      </div>

                      <div className="flex flex-col gap-2 lg:w-64">
                        <select
                          disabled={
                            busy
                          }
                          defaultValue=""
                          onChange={(
                            e
                          ) => {
                            if (
                              e.target
                                .value
                            ) {
                              resolveAppointment(
                                appointment.id,
                                "reassign",
                                e.target.value
                              );

                              e.target.value =
                                "";
                            }
                          }}
                          className="rounded-xl border px-4 py-3 text-sm"
                        >
                          <option value="">
                            Reassign to stylist
                          </option>

                          {stylists
                            .filter(
                              (s) =>
                                s.id !==
                                appointment.stylist_id
                            )
                            .map(
                              (
                                stylist
                              ) => (
                                <option
                                  key={
                                    stylist.id
                                  }
                                  value={
                                    stylist.id
                                  }
                                >
                                  {
                                    stylist.name
                                  }
                                </option>
                              )
                            )}
                        </select>

                        <button
                          type="button"
                          disabled={
                            busy
                          }
                          onClick={() =>
                            resolveAppointment(
                              appointment.id,
                              "cancel"
                            )
                          }
                          className="rounded-xl border border-red-200 px-4 py-3 text-sm font-medium text-red-700"
                        >
                          {busy
                            ? "Resolving..."
                            : "Cancel + generate coupon"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </section>
      )}

      {coupons.length > 0 && (
        <section className="mt-8 rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-emerald-900">
                Compensation coupons
              </h2>

              <p className="mt-1 text-sm text-emerald-700">
                {coupons.length} coupon
                {coupons.length === 1
                  ? ""
                  : "s"} generated.
              </p>
            </div>

            <button
              type="button"
              onClick={
                copyAllMessages
              }
              className="rounded-xl bg-neutral-900 px-4 py-2.5 text-sm text-white"
            >
              Copy all WhatsApp messages
            </button>
          </div>

          <div className="mt-6 space-y-4">
            {coupons.map(
              (coupon) => {
                const message =
                  coupon.whatsappMessage ||
                  defaultMessage(
                    coupon.customerName ||
                      "Customer",
                    coupon
                  );

                return (
                  <div
                    key={
                      coupon.id
                    }
                    className="rounded-2xl border border-emerald-200 bg-white p-5"
                  >
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <p className="text-xs uppercase tracking-wider text-neutral-400">
                          Customer
                        </p>

                        <p className="mt-1 font-semibold">
                          {
                            coupon.customerName
                          }
                        </p>

                        <div className="mt-3 flex gap-2">
                          <code className="flex-1 rounded-lg bg-neutral-50 px-3 py-2 text-sm">
                            {formatPhone(
                              coupon.phone
                            )}
                          </code>

                          <button
                            type="button"
                            onClick={() =>
                              copy(
                                coupon.phone ||
                                  "",
                              )
                            }
                            className="rounded-lg border px-3 py-2 text-xs"
                          >
                            Copy phone
                          </button>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-wider text-neutral-400">
                          Coupon
                        </p>

                        <div className="mt-1 flex gap-2">
                          <code className="flex-1 rounded-lg bg-neutral-50 px-3 py-2 font-semibold">
                            {
                              coupon.code
                            }
                          </code>

                          <button
                            type="button"
                            onClick={() =>
                              copy(
                                coupon.code
                              )
                            }
                            className="rounded-lg border px-3 py-2 text-xs"
                          >
                            Copy
                          </button>
                        </div>

                        <p className="mt-2 text-xs text-neutral-500">
                          {coupon.discount}% off ·
                          one use · valid until{" "}
                          {new Date(
                            coupon.expiresAt
                          ).toLocaleDateString(
                            "en-IN"
                          )}
                        </p>
                      </div>
                    </div>

                    <textarea
                      readOnly
                      value={message}
                      rows={7}
                      className="mt-4 w-full rounded-xl border bg-neutral-50 p-3 text-sm leading-6"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        copy(message)
                      }
                      className="mt-2 rounded-xl bg-neutral-900 px-4 py-3 text-sm text-white"
                    >
                      Copy WhatsApp message
                    </button>
                  </div>
                );
              }
            )}
          </div>
        </section>
      )}
    </main>
  );
}
