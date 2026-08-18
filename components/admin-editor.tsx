"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Search, Pencil, Camera } from "lucide-react";

const config: any = {
  services: {
    title: "Services",
    fields: [
      ["name", "Name"],
      ["category", "Category"],
      ["description", "Description"],
      ["price", "Price"],
      ["duration_minutes", "Duration (minutes)"],
    ],
  },

  stylists: {
    title: "Stylists",
    fields: [
      ["name", "Name"],
      ["category", "Category"],
      ["bio", "Bio"],
    ],
  },

  coupons: {
    title: "Coupons",
  },

  availability: {
    title: "Working hours",
  },

  "blocked-periods": {
    title: "Blocked periods",
  },
};

const days = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function AdminEditor({ section }: { section: string }) {
  const c = config[section] || config.services;

  const [rows, setRows] = useState<any[]>([]);
  const [stylists, setStylists] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<any>({});
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [serviceSearch, setServiceSearch] = useState("");
  const [stylistPhotoFile, setStylistPhotoFile] = useState<File | null>(null);
  const [stylistPhotoPreview, setStylistPhotoPreview] = useState<string>("");
  const [photoUploading, setPhotoUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [affectedAppointments, setAffectedAppointments] = useState<any[]>([]);
  const [resolvingAppointmentId, setResolvingAppointmentId] = useState<string | null>(null);
  const [resolutionOpen, setResolutionOpen] = useState(false);
  const [resolutionError, setResolutionError] = useState("");
  const [pendingTimeOff, setPendingTimeOff] = useState<any | null>(null);

  async function load() {
    const r = await fetch("/api/admin/" + section);
    const x = await r.json();
    setRows(x.rows || []);
  }

  async function loadStylists() {
    const r = await fetch("/api/admin/stylists");
    const x = await r.json();
    setStylists(x.rows || []);
  }

  async function loadServices() {
    const r = await fetch("/api/admin/service-catalogue", { cache: "no-store" });
    const x = await r.json();
    setServices(x.rows || []);
  }

  useEffect(() => {
    load();

if (
  section === "availability" ||
  section === "blocked-periods"
) {
  loadStylists();
}

if (section === "stylists") {
  loadServices();
}


  }, [section]);

  function resetForm() {
    setForm({});
    setSelectedServices([]);
    setServiceSearch("");
    setStylistPhotoFile(null);
    setStylistPhotoPreview("");
    setEditingId(null);
  }

  function closeResolution() {
    setResolutionOpen(false);
    setAffectedAppointments([]);
    setResolvingAppointmentId(null);
    setResolutionError("");
    setPendingTimeOff(null);
  }

  async function resolveAffectedAppointment(
    appointmentId: string,
    action: "cancel" | "reassign",
    stylistId?: string
  ) {
    setResolvingAppointmentId(appointmentId);
    setResolutionError("");

    try {
      const response = await fetch(
        `/api/admin/appointments/${appointmentId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action,
            reason:
              pendingTimeOff?.reason ||
              "Stylist is unavailable.",
            stylist_id: stylistId,
          }),
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setResolutionError(
          result.error ||
            "Unable to resolve this appointment."
        );
        return;
      }

      const remaining = affectedAppointments.filter(
        (appointment) => appointment.id !== appointmentId
      );

      setAffectedAppointments(remaining);

      if (remaining.length === 0 && pendingTimeOff) {
        setResolutionOpen(false);
        setResolvingAppointmentId(null);

        // Retry creating the time-off now that all affected
        // appointments have been resolved.
        const retryResponse = await fetch(
          "/api/admin/blocked-periods",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(pendingTimeOff),
          }
        );

        const retryResult = await retryResponse
          .json()
          .catch(() => ({}));

        if (!retryResponse.ok) {
          setResolutionError(
            retryResult.error ||
              "Appointments were resolved, but the time off could not be created."
          );
          setResolutionOpen(true);
          return;
        }

        setOpen(false);
        resetForm();
        setPendingTimeOff(null);
        await load();
        return;
      }
    } finally {
      setResolvingAppointmentId(null);
    }
  }

  async function openEdit(row: any) {
    setEditingId(row.id);
    setForm({ ...row });
    setSelectedServices([]);
    setServiceSearch("");
    setStylistPhotoFile(null);
    setStylistPhotoPreview(row.image_url || "");

    if (section === "stylists") {
      try {
        const r = await fetch(
          `/api/admin/stylist-services?stylist_id=${row.id}`
        );

        const x = await r.json();

        setSelectedServices(
          (x.service_ids || []).map((id: string) => String(id))
        );
      } catch {
        setSelectedServices([]);
      }
    }

    setOpen(true);
  }

  function openAdd() {
    resetForm();
    setOpen(true);
  }

  async function save(e: any) {
    e.preventDefault();
    setSaving(true);

    try {
      let payload = { ...form };

      /*
       * STYLIST CREATION
       *
       * New stylists with a photo are created through one multipart
       * request. This guarantees the stylist ID exists before the
       * image is uploaded and prevents a half-created stylist if the
       * photo or service relationships fail.
       */
      if (section === "stylists" && !editingId) {
        const formData = new FormData();
        formData.append("name", String(form.name || ""));
        formData.append("category", String(form.category || ""));
        formData.append("bio", String(form.bio || ""));
        formData.append("service_ids", JSON.stringify(selectedServices));
        if (stylistPhotoFile) formData.append("file", stylistPhotoFile);

        const response = await fetch("/api/admin/stylists/create", {
          method: "POST",
          body: formData,
        });
        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
          setFormError(result.error || "Unable to create stylist.");
          return;
        }

        setOpen(false);
        resetForm();
        await load();
        return;
      }

      /*
       * AVAILABILITY
       *
       * Working hours are recurring weekly rules.
       * "Day off" means there should be no working-hours row
       * for that stylist/day.
       */
      if (section === "availability") {
        const stylistId = String(form.stylist_id || "");
        const dayOfWeek =
          form.day_of_week === "" ||
          form.day_of_week === undefined
            ? null
            : Number(form.day_of_week);

        if (!stylistId) {
          alert("Please select a stylist.");
          return;
        }

        if (dayOfWeek === null || !Number.isInteger(dayOfWeek)) {
          alert("Please select a day.");
          return;
        }

        if (form.day_off) {
          if (editingId) {
            const response = await fetch(
             `/api/admin/${section}/${editingId}`,
              { method: "DELETE" }
            );

            if (!response.ok) {
              const result = await response.json().catch(() => ({}));
setFormError(
  result.error ||
    "Unable to set this day off. Please resolve any affected appointments first."
);              return;
            }
          }

          setOpen(false);
          resetForm();
          await load();
          return;
        }

        if (!form.start_time || !form.end_time) {
          alert("Please enter opening and closing times.");
          return;
        }

        if (form.end_time <= form.start_time) {
          alert("Closing time must be after opening time.");
          return;
        }

        payload = {
          stylist_id: stylistId,
          day_of_week: dayOfWeek,
          start_time: form.start_time,
          end_time: form.end_time,
        };
      }

if (section === "blocked-periods") {
  const stylistId = String(form.stylist_id || "");
  const date = String(form.date || "");
  const reason = String(form.reason || "").trim();

  if (!stylistId) {
    alert("Please select a stylist.");
    return;
  }

  if (!date) {
    alert("Please select a date.");
    return;
  }

  let startTime: string;
  let endTime: string;

  if (form.all_day) {
    const start = new Date(`${date}T00:00:00`);
    const end = new Date(`${date}T23:59:59`);

    startTime = start.toISOString();
    endTime = end.toISOString();
  } else {
    if (!form.start_time || !form.end_time) {
      alert("Please select a start and end time.");
      return;
    }

    const start = new Date(
      `${date}T${form.start_time}:00`
    );

    const end = new Date(
      `${date}T${form.end_time}:00`
    );

    if (end <= start) {
      alert("The end time must be after the start time.");
      return;
    }

    startTime = start.toISOString();
    endTime = end.toISOString();
  }

  const response = await fetch(
    "/api/admin/blocked-periods",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        stylist_id: stylistId,
        start_time: startTime,
        end_time: endTime,
        reason,
      }),
    }
  );

  const result = await response.json();

  if (response.status === 409) {
    const affected = result.appointments || [];

    setPendingTimeOff({
      stylist_id: stylistId,
      start_time: startTime,
      end_time: endTime,
      reason,
    });
    setAffectedAppointments(affected);
    setResolutionError("");
    setResolutionOpen(true);
    return;
  }

 if (!response.ok) {
  setFormError(
    result.error ||
      "Unable to create time off."
  );

  return;
}

  setOpen(false);
  resetForm();
  await load();

  return;
}

      /*
       * COUPONS
       */
      if (section === "coupons") {
        payload = {
          code: String(form.code || "")
            .trim()
            .toUpperCase(),

          discount_type: form.discount_type,

          discount_value: Number(form.discount_value),

          minimum_amount:
            form.minimum_amount === "" ||
            form.minimum_amount === undefined
              ? 0
              : Number(form.minimum_amount),

          max_discount_amount:
            form.max_discount_amount === "" ||
            form.max_discount_amount === undefined
              ? null
              : Number(form.max_discount_amount),

          usage_limit:
            form.usage_limit === "" ||
            form.usage_limit === undefined
              ? null
              : Number(form.usage_limit),

          expires_at:
            form.expires_at && form.expires_at !== ""
              ? new Date(form.expires_at).toISOString()
              : null,

          active: true,
        };

        if (!payload.code) {
          alert("Please enter a coupon code.");
          return;
        }

        if (!payload.discount_type) {
          alert("Please choose a discount type.");
          return;
        }

        if (!Number.isFinite(payload.discount_value) || payload.discount_value <= 0) {
          alert("Discount value must be greater than 0.");
          return;
        }

        if (
          payload.discount_type === "percentage" &&
          payload.discount_value > 100
        ) {
          alert("Percentage discount cannot be greater than 100%.");
          return;
        }

        if (
          payload.minimum_amount !== null &&
          (!Number.isFinite(payload.minimum_amount) ||
            payload.minimum_amount < 0)
        ) {
          alert("Minimum booking amount must be 0 or greater.");
          return;
        }

        if (
          payload.max_discount_amount !== null &&
          (!Number.isFinite(payload.max_discount_amount) ||
            payload.max_discount_amount <= 0)
        ) {
          alert("Maximum discount must be greater than 0.");
          return;
        }

        if (
          payload.usage_limit !== null &&
          (!Number.isInteger(payload.usage_limit) ||
            payload.usage_limit <= 0)
        ) {
          alert("Usage limit must be a positive whole number.");
          return;
        }
      }
setFormError("");
      const url = editingId
        ? `/api/admin/${section}/${editingId}`
        : `/api/admin/${section}`;

      const method = editingId ? "PATCH" : "POST";

      const r = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const x = await r.json();

     if (!r.ok) {
  setFormError(x.error || "Unable to save.");
  return;
}

      /*
       * Save stylist/service relationships separately.
       */
      if (section === "stylists") {
        const stylistId = editingId || x.rows?.[0]?.id;

        if (stylistId) {
          const relationResponse = await fetch(
            "/api/admin/stylist-services",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                stylist_id: stylistId,
                service_ids: selectedServices,
              }),
            }
          );

        
	if (!relationResponse.ok) {
  let relationMessage =
    "Stylist saved, but services could not be updated.";

  try {
    const relationError = await relationResponse.json();

    if (relationError?.error) {
      relationMessage = relationError.error;
    }
  } catch {
    // Server returned a non-JSON response.
  }

  alert(relationMessage);
  return;
}
	
	}
      }

      if (section === "stylists" && stylistPhotoFile) {
        const stylistId = editingId || x.rows?.[0]?.id;
        if (stylistId) {
          setPhotoUploading(true);
          try {
            const formData = new FormData();
            formData.append("file", stylistPhotoFile);
            formData.append("stylist_id", stylistId);
            const photoResponse = await fetch("/api/admin/stylist-image", {
              method: "POST",
              body: formData,
            });
            const photoResult = await photoResponse.json().catch(() => ({}));
            if (!photoResponse.ok) {
              setFormError(photoResult.error || "Stylist saved, but the photo could not be uploaded.");
              return;
            }
          } finally {
            setPhotoUploading(false);
          }
        }
      }

      setOpen(false);
      resetForm();
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function del(id: string) {
    if (!confirm("Remove this item?")) return;

    const r = await fetch(`/api/admin/${section}/${id}`, {
      method: "DELETE",
    });

    if (r.ok) {
      await load();
    } else {
      const x = await r.json();
      alert(x.error || "Unable to remove.");
    }
  }

  const shown = rows.filter((x) =>
    JSON.stringify(x).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="mt-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm text-neutral-500">
            {rows.length} records
          </p>
        </div>

        <div className="flex gap-2">
          <div className="flex items-center rounded-xl border bg-white px-3">
            <Search size={16} className="text-neutral-400" />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-32 bg-transparent p-2 text-sm outline-none sm:w-48"
              placeholder="Search"
            />
          </div>

          <button
            onClick={openAdd}
            className="rounded-xl bg-neutral-900 px-4 py-2.5 text-sm text-white"
          >
            <Plus className="mr-1 inline" size={16} />
            Add
          </button>
        </div>
      </div>

      {resolutionOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-5 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-7 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-amber-700">
                  Time off needs attention
                </p>
                <h2 className="mt-1 text-2xl font-semibold">
                  {affectedAppointments.length} confirmed appointment
                  {affectedAppointments.length === 1 ? "" : "s"} affected
                </h2>
                <p className="mt-2 text-sm text-neutral-500">
                  Resolve each appointment before this time off is created.
                </p>
              </div>

              <button
                type="button"
                onClick={closeResolution}
                className="text-xl"
              >
                ×
              </button>
            </div>

            {resolutionError && (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {resolutionError}
              </div>
            )}

            <div className="mt-6 space-y-4">
              {affectedAppointments.map((appointment: any) => {
                const busy = resolvingAppointmentId === appointment.id;
                const currentStylist = stylists.find(
                  (stylist) => stylist.id === appointment.stylist_id
                );

                return (
                  <div
                    key={appointment.id}
                    className="rounded-2xl border p-5"
                  >
                    <div className="grid gap-4 md:grid-cols-[1fr_280px] md:items-center">
                      <div>
                        <p className="font-semibold">
                          Appointment
                        </p>
                        <p className="mt-1 text-sm text-neutral-600">
                          {new Date(appointment.start_time).toLocaleString(
                            "en-IN",
                            {
                              weekday: "short",
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </p>
                        <p className="mt-1 text-sm text-neutral-600">
                          Customer ID: {appointment.customer_id}
                        </p>
                        <p className="mt-1 text-sm text-neutral-600">
                          Service ID: {appointment.service_id}
                        </p>
                        <p className="mt-2 font-semibold">
                          ₹{appointment.price}
                        </p>
                        <p className="mt-1 text-xs text-neutral-400">
                          Current stylist: {
                            currentStylist?.name ||
                            appointment.stylist_id
                          }
                        </p>
                      </div>

                      <div className="space-y-3">
                        <select
                          defaultValue=""
                          disabled={busy}
                          className="w-full rounded-xl border p-3 text-sm"
                          onChange={(e) => {
                            const stylistId = e.target.value;
                            if (stylistId) {
                              resolveAffectedAppointment(
                                appointment.id,
                                "reassign",
                                stylistId
                              );
                              e.target.value = "";
                            }
                          }}
                        >
                          <option value="">
                            {busy ? "Resolving..." : "Reassign to stylist"}
                          </option>
                          {stylists
                            .filter(
                              (stylist) =>
                                stylist.id !== appointment.stylist_id &&
                                stylist.active !== false &&
                                stylist.deleted_at == null
                            )
                            .map((stylist) => (
                              <option
                                key={stylist.id}
                                value={stylist.id}
                              >
                                {stylist.name}
                              </option>
                            ))}
                        </select>

                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            resolveAffectedAppointment(
                              appointment.id,
                              "cancel"
                            )
                          }
                          className="w-full rounded-xl border border-red-200 px-4 py-3 text-sm font-medium text-red-700 disabled:opacity-50"
                        >
                          {busy ? "Resolving..." : "Cancel appointment"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {!affectedAppointments.length && !resolutionError && (
              <div className="mt-6 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-700">
                All affected appointments have been resolved. Creating the time off...
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={closeResolution}
                className="rounded-xl border px-4 py-2.5 text-sm"
              >
                Back
              </button>
            </div>
          </div>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-5 backdrop-blur-sm">
          <form
            onSubmit={save}
            className="max-h-[90vh] min-w-0 w-full max-w-3xl overflow-x-hidden overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-7"
          >
            <div className="flex justify-between">
              <h2 className="text-2xl font-semibold">
                {editingId ? "Edit" : "Add"}{" "}
                {c.title.slice(0, -1)}
              </h2>

              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  resetForm();
                }}
                className="text-xl"
              >
                ×
              </button>
            </div>

            {/* -------------------------------------------------- */}
            {/* COUPONS */}
            {/* -------------------------------------------------- */}

            {section === "coupons" ? (
              <div className="mt-6 space-y-4">
                <div>
                  <label className="text-sm font-medium">
                    Coupon code
                  </label>

                  <input
                    value={form.code ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        code: e.target.value.toUpperCase(),
                      })
                    }
                    className="mt-2 w-full rounded-xl border p-3 uppercase"
                    placeholder="CHRISTMAS15"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">
                    Discount type
                  </label>

                  <select
                    value={form.discount_type ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        discount_type: e.target.value,
                      })
                    }
                    className="mt-2 w-full rounded-xl border p-3"
                    required
                  >
                    <option value="">Choose discount type</option>
                    <option value="percentage">
                      Percentage (%)
                    </option>
                    <option value="fixed">
                      Fixed amount (₹)
                    </option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">
                    Discount value
                  </label>

                  <div className="relative mt-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.discount_value ?? ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          discount_value: e.target.value,
                        })
                      }
                      className="w-full rounded-xl border p-3 pr-14"
                      placeholder={
                        form.discount_type === "percentage"
                          ? "15"
                          : "100"
                      }
                      required
                    />

                    {form.discount_type && (
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-neutral-400">
                        {form.discount_type === "percentage"
                          ? "%"
                          : "₹"}
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-xs text-neutral-500">
                    {form.discount_type === "percentage"
                      ? "Example: enter 15 for 15% off."
                      : "Example: enter 100 for ₹100 off."}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium">
                    Minimum booking amount
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.minimum_amount ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        minimum_amount: e.target.value,
                      })
                    }
                    className="mt-2 w-full rounded-xl border p-3"
                    placeholder="500"
                  />

                  <p className="mt-1 text-xs text-neutral-500">
                    Leave blank if there is no minimum booking amount.
                  </p>
                </div>

                {form.discount_type === "percentage" && (
                  <div>
                    <label className="text-sm font-medium">
                      Maximum discount
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.max_discount_amount ?? ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          max_discount_amount: e.target.value,
                        })
                      }
                      className="mt-2 w-full rounded-xl border p-3"
                      placeholder="100"
                    />

                    <p className="mt-1 text-xs text-neutral-500">
                      Example: 15% off, up to ₹100 maximum.
                    </p>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium">
                    Usage limit
                  </label>

                  <select
                    value={
                      form.usage_limit === null ||
                      form.usage_limit === undefined ||
                      form.usage_limit === ""
                        ? "unlimited"
                        : "limited"
                    }
                    onChange={(e) => {
                      if (e.target.value === "unlimited") {
                        setForm({
                          ...form,
                          usage_limit: "",
                        });
                      } else {
                        setForm({
                          ...form,
                          usage_limit: "1",
                        });
                      }
                    }}
                    className="mt-2 w-full rounded-xl border p-3"
                  >
                    <option value="unlimited">
                      Unlimited uses
                    </option>

                    <option value="limited">
                      Limited uses
                    </option>
                  </select>

                  {form.usage_limit !== "" &&
                    form.usage_limit !== null &&
                    form.usage_limit !== undefined && (
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={form.usage_limit}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            usage_limit: e.target.value,
                          })
                        }
                        className="mt-2 w-full rounded-xl border p-3"
                        placeholder="100"
                      />
                    )}
                </div>

                <div>
                  <label className="text-sm font-medium">
                    Expiration date and time
                  </label>

                  <input
                    type="datetime-local"
                    value={
                      form.expires_at
                        ? new Date(form.expires_at)
                            .toISOString()
                            .slice(0, 16)
                        : ""
                    }
                    onChange={(e) =>
                      setForm({
                        ...form,
                        expires_at: e.target.value,
                      })
                    }
                    className="mt-2 w-full rounded-xl border p-3"
                  />

                  <p className="mt-1 text-xs text-neutral-500">
                    Leave blank if this coupon never expires.
                  </p>
                </div>

                {form.code && form.discount_value && (
                  <div className="rounded-2xl bg-[#f8f5f1] p-4 text-sm">
                    <p className="font-medium">
                      {form.code}
                    </p>

                    <p className="mt-1 text-neutral-600">
                      {form.discount_type === "percentage"
                        ? `${form.discount_value}% off`
                        : `₹${form.discount_value} off`}

                      {form.max_discount_amount &&
                        form.discount_type === "percentage"
                        ? ` · up to ₹${form.max_discount_amount}`
                        : ""}
                    </p>

                    {form.minimum_amount && (
                      <p className="mt-1 text-xs text-neutral-500">
                        Minimum booking: ₹{form.minimum_amount}
                      </p>
                    )}
                  </div>
                )}
              </div>

            ) : section === "availability" ? (
              /* -------------------------------------------------- */
              /* AVAILABILITY / WEEKLY WORKING HOURS */
              /* -------------------------------------------------- */

              <div className="mt-6 space-y-4">
                <div>
                  <label className="text-sm font-medium">Stylist</label>
                  <select
                    value={form.stylist_id ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        stylist_id: e.target.value,
                      })
                    }
                    className="mt-2 w-full rounded-xl border p-3"
                    required
                  >
                    <option value="">Choose stylist</option>
                    {stylists.map((stylist) => (
                      <option key={stylist.id} value={stylist.id}>
                        {stylist.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">Day</label>
                  <select
                    value={
                      form.day_of_week === undefined ||
                      form.day_of_week === ""
                        ? ""
                        : String(form.day_of_week)
                    }
                    onChange={(e) =>
                      setForm({
                        ...form,
                        day_of_week: e.target.value,
                      })
                    }
                    className="mt-2 w-full rounded-xl border p-3"
                    required
                  >
                    <option value="">Choose day</option>
                    {days.map((day, index) => (
                      <option key={day} value={index}>
                        {day}
                      </option>
                    ))}
                  </select>
                </div>

                <label className="flex items-center gap-3 rounded-xl border p-4">
                  <input
                    type="checkbox"
                    checked={Boolean(form.day_off)}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        day_off: e.target.checked,
                      })
                    }
                    className="h-4 w-4"
                  />
                  <div>
                    <p className="text-sm font-medium">Day off</p>
                    <p className="text-xs text-neutral-500">
                      This is a recurring weekly day off for this stylist.
                    </p>
                  </div>
                </label>

                {!form.day_off && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium">Opens</label>
                      <input
                        type="time"
                        value={form.start_time ?? ""}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            start_time: e.target.value,
                          })
                        }
                        className="mt-2 w-full rounded-xl border p-3"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Closes</label>
                      <input
                        type="time"
                        value={form.end_time ?? ""}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            end_time: e.target.value,
                          })
                        }
                        className="mt-2 w-full rounded-xl border p-3"
                        required
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : section === "blocked-periods" ? (
              /* -------------------------------------------------- */
              /* SPECIFIC DATE / TIME OFF */
              /* -------------------------------------------------- */

              <div className="mt-6 space-y-4">
                <div>
                  <label className="text-sm font-medium">Stylist</label>
                  <select
                    value={form.stylist_id ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        stylist_id: e.target.value,
                      })
                    }
                    className="mt-2 w-full rounded-xl border p-3"
                    required
                  >
                    <option value="">Choose stylist</option>
                    {stylists.map((stylist) => (
                      <option key={stylist.id} value={stylist.id}>
                        {stylist.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">Date</label>
                  <input
                    type="date"
                    value={form.date ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        date: e.target.value,
                      })
                    }
                    className="mt-2 w-full rounded-xl border p-3"
                    required
                  />
                  <p className="mt-1 text-xs text-neutral-500">
                    This is a specific date, not a recurring weekly day.
                  </p>
                </div>

                <label className="flex items-center gap-3 rounded-xl border p-4">
                  <input
                    type="checkbox"
                    checked={Boolean(form.all_day)}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        all_day: e.target.checked,
                      })
                    }
                    className="h-4 w-4"
                  />
                  <div>
                    <p className="text-sm font-medium">All day</p>
                    <p className="text-xs text-neutral-500">
                      Make this stylist unavailable for the entire date.
                    </p>
                  </div>
                </label>

                {!form.all_day && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium">From</label>
                      <input
                        type="time"
                        value={form.start_time ?? ""}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            start_time: e.target.value,
                          })
                        }
                        className="mt-2 w-full rounded-xl border p-3"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Until</label>
                      <input
                        type="time"
                        value={form.end_time ?? ""}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            end_time: e.target.value,
                          })
                        }
                        className="mt-2 w-full rounded-xl border p-3"
                        required
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium">Reason</label>
                  <input
                    type="text"
                    value={form.reason ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        reason: e.target.value,
                      })
                    }
                    placeholder="Personal leave, vacation, appointment, etc."
                    className="mt-2 w-full rounded-xl border p-3"
                  />
                </div>

                <div className="rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-600">
                  <p className="font-medium text-neutral-900">
                    Before creating time off
                  </p>
                  <p className="mt-1">
                    Any confirmed appointments during this period will be
                    detected first. The time off will not be created
                    automatically if customers are affected.
                  </p>
                </div>
              </div>
            ) : (
              /* -------------------------------------------------- */
              /* NORMAL FORMS */
              /* -------------------------------------------------- */

             <div className="mt-6 min-w-0 grid gap-3">
  {c.fields?.map((f: any[]) => {
    const field = f[0];
    const label = f[1];

    /*
     * CATEGORY
     *
     * Keep this as a controlled dropdown so only
     * the database-supported values can be selected.
     */
    if (field === "category") {
      return (
        <div key={field}>
          <label className="text-sm font-medium">
            Category
          </label>

          <select
            value={form[field] ?? ""}
            onChange={(e) => {
              setFormError("");

              setForm({
                ...form,
                [field]: e.target.value,
              });
            }}
            className="mt-2 w-full rounded-xl border p-3"
            required
          >
            <option value="">
              Select category
            </option>

            <option value="male">
              Male
            </option>

            <option value="female">
              Female
            </option>

            <option value="unisex">
              Unisex
            </option>
          </select>
        </div>
      );
    }

    /*
     * DESCRIPTION / BIO
     */
    if (
      field === "description" ||
      field === "bio"
    ) {
      return (
        <textarea
          key={field}
          placeholder={label}
          value={form[field] ?? ""}
          onChange={(e) => {
            setFormError("");

            setForm({
              ...form,
              [field]: e.target.value,
            });
          }}
          className="min-h-24 rounded-xl border p-3"
        />
      );
    }

    /*
     * NORMAL INPUTS
     */
    return (
      <input
        key={field}
        type={
          field === "price" ||
          field === "duration_minutes"
            ? "number"
            : "text"
        }
        placeholder={label}
        value={form[field] ?? ""}
        onChange={(e) => {
          setFormError("");

          setForm({
            ...form,
            [field]: e.target.value,
          });
        }}
        className="rounded-xl border p-3"
        required
      />
    );
  })}


                {/* STYLIST PHOTO */}
                {section === "stylists" && (
                  <div className="mt-4 rounded-2xl border border-black/10 bg-neutral-50/60 p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <div className="h-28 w-28 shrink-0 overflow-hidden rounded-2xl border border-black/10 bg-white">
                        <img
                          src={stylistPhotoPreview || "/stylists/placeholder.svg"}
                          alt="Stylist preview"
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium">Stylist photo</p>
                        <p className="mt-1 text-xs leading-5 text-neutral-500">Use a clear square-ish JPG, PNG or WebP photo. Maximum 5 MB.</p>
                        <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-medium hover:bg-neutral-50">
                          <Camera size={16} />
                          {stylistPhotoFile ? "Change photo" : "Choose photo"}
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              setStylistPhotoFile(file);
                              if (file) setStylistPhotoPreview(URL.createObjectURL(file));
                            }}
                          />
                        </label>
                        {stylistPhotoFile && <p className="mt-2 text-xs text-neutral-500">{stylistPhotoFile.name}</p>}
                      </div>
                    </div>
                  </div>
                )}

                {/* STYLIST SERVICES */}
                {section === "stylists" && (
                  <div className="mt-3 min-w-0 overflow-hidden rounded-2xl border border-black/10 bg-neutral-50/60 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium">Services this stylist provides</p>
                        <p className="mt-1 text-xs leading-5 text-neutral-500">
                          Select every service this stylist can perform. Customers will only see this stylist for selected services.
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-neutral-600">
                        {selectedServices.length} selected
                      </span>
                    </div>

                    <div className="relative mt-4">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
                      <input
                        value={serviceSearch}
                        onChange={(e) => setServiceSearch(e.target.value)}
                        placeholder="Search services..."
                        className="w-full rounded-xl border border-black/10 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-black/30"
                      />
                    </div>

                    <div className="mt-4 max-h-72 min-w-0 space-y-4 overflow-x-hidden overflow-y-auto pr-1">
                      {(() => {
                        const term = serviceSearch.trim().toLowerCase();
                        const filtered = services.filter((service) =>
                          `${service.name} ${service.description || ""} ${service.service_categories?.name || ""}`.toLowerCase().includes(term)
                        );
                        const groups = new Map<string, any[]>();
                        filtered.forEach((service) => {
                          const key = service.service_categories?.id || "other";
                          if (!groups.has(key)) groups.set(key, []);
                          groups.get(key)!.push(service);
                        });
                        const orderedGroups = Array.from(groups.entries()).sort((a, b) => {
                          const an = a[1][0]?.service_categories?.display_order ?? 9999;
                          const bn = b[1][0]?.service_categories?.display_order ?? 9999;
                          return an - bn;
                        });

                        if (!orderedGroups.length) {
                          return <p className="text-sm text-neutral-500">No services available yet.</p>;
                        }

                        return orderedGroups.map(([groupId, groupServices]) => (
                          <div key={groupId}>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                              {groupServices[0]?.service_categories?.name || "Other services"}
                            </p>
                            <div className="space-y-2">
                              {groupServices.map((service: any) => {
                                const id = String(service.id);
                                const checked = selectedServices.includes(id);
                                return (
                                  <label key={id} className={`flex min-w-0 cursor-pointer items-start gap-3 overflow-hidden rounded-xl border bg-white p-3 transition ${checked ? "border-neutral-900 shadow-sm" : "border-black/10 hover:border-black/25"}`}>
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={(e) => {
                                        setSelectedServices((current) =>
                                          e.target.checked
                                            ? current.includes(id) ? current : [...current, id]
                                            : current.filter((x) => x !== id)
                                        );
                                      }}
                                      className="h-4 w-4 accent-black"
                                    />
                                    <span className="min-w-0 flex-1">
                                      <span className="block text-sm font-medium">{service.name}</span>
                                      {service.description && <span className="mt-0.5 block break-words text-xs leading-5 text-neutral-500">{service.description}</span>}
                                    </span>
                                    {checked && <span className="shrink-0 text-xs font-medium text-neutral-700">Selected</span>}
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}
              </div>
            )}

        {formError && (
          <div
            role="alert"
            className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <p className="font-medium">Unable to save</p>
            <p className="mt-1">{formError}</p>
          </div>
        )}
        
            <button
              disabled={saving || photoUploading}
              className="mt-6 w-full rounded-xl bg-neutral-900 p-3 text-white disabled:opacity-50"
            >
              {saving || photoUploading
                ? "Saving..."
                : editingId
                  ? "Save changes"
                  : "Save"}
            </button>
          </form>
        </div>
      )}

      {/* -------------------------------------------------- */}
      {/* LIST */}
      {/* -------------------------------------------------- */}

      <div className="mt-5 overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm">
        <div className="hidden border-b bg-neutral-50 px-5 py-3 text-xs uppercase tracking-wider text-neutral-400 md:grid md:grid-cols-[1.2fr_1fr_140px]">
          <span>Item</span>
          <span>Details</span>
          <span />
        </div>

        {shown.map((x) => (
          <div
            key={x.id}
            className="grid gap-3 border-b px-5 py-5 last:border-0 md:grid-cols-[1.2fr_1fr_140px] md:items-center"
          >
            <div>
              <p className="font-medium">
              
	    
{section === "coupons"
  ? x.code
  : section === "availability"
    ? `${
        stylists.find(
          (s) => s.id === x.stylist_id
        )?.name || "Unknown stylist"
      } · ${
        days[Number(x.day_of_week)] ??
        "Unknown day"
      }`
    : x.name || x.code || x.id}
              </p>

              <p className="text-xs text-neutral-400">
                {section === "coupons"
                  ? x.discount_type === "percentage"
                    ? `${x.discount_value}% off`
                    : `₹${x.discount_value} off`
                  : x.category ||
                    x.discount_type ||
                    ""}
              </p>
            </div>

            <div className="text-sm text-neutral-500">
              {section === "coupons" ? (
                <div>
                  <p>
                    Minimum: ₹
                    {Number(x.minimum_amount || 0)}
                  </p>

                  {x.max_discount_amount && (
                    <p>
                      Maximum discount: ₹
                      {Number(x.max_discount_amount)}
                    </p>
                  )}

                  <p>
                    {x.usage_limit
                      ? `Limit: ${x.usage_limit}`
                      : "Unlimited uses"}
                  </p>

                  <p>
                    {x.expires_at
                      ? `Expires: ${new Date(
                          x.expires_at
                        ).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}`
                      : "No expiry"}
                  </p>
                </div>


                ) : section === "blocked-periods" ? (
                  <div>
                    <p>
                      Stylist:{" "}
                      {stylists.find(
                        (s) => s.id === x.stylist_id
                      )?.name || "Unknown stylist"}
                    </p>

                    <p className="mt-1">
                      {x.start_time
                        ? new Date(x.start_time).toLocaleString(
                            "en-IN",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )
                        : "Unknown start"}{" "}
                      –{" "}
                      {x.end_time
                        ? new Date(x.end_time).toLocaleTimeString(
                            "en-IN",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )
                        : "Unknown end"}
                    </p>

                    {x.reason && (
                      <p className="mt-1 text-xs text-neutral-500">
                        Reason: {x.reason}
                      </p>
                    )}
                  </div>
                ) : section === "availability" ? (
                  <div>
                    <p>
                      Stylist:{" "}
                      {stylists.find(
                        (s) => s.id === x.stylist_id
                      )?.name || "Unknown stylist"}
                    </p>

                    <p className="mt-1">
                      {days[Number(x.day_of_week)] ?? "Unknown day"} ·{" "}
                      {x.start_time?.slice(0, 5)} –{" "}
                      {x.end_time?.slice(0, 5)}
                    </p>
                  </div>
              ) : (
                Object.entries(x)
                  .filter(
                    ([k]) =>
                      ![
                        "id",
                        "created_at",
                        "updated_at",
                        "deleted_at",
                        "name",
                        "code",
                        "category",
                        "discount_type",
                      ].includes(k)
                  )
                  .slice(0, 4)
                  .map(
                    ([k, v]) =>
                      `${k}: ${String(v)}`
                  )
                  .join(" · ")
              )}
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => openEdit(x)}
                className="flex items-center gap-1 text-sm text-neutral-700"
              >
                <Pencil size={15} />
                Edit
              </button>

              <button
                onClick={() => del(x.id)}
                className="flex items-center gap-1 text-sm text-red-600"
              >
                <Trash2 size={15} />
                Remove
              </button>
            </div>
          </div>
        ))}

        {!shown.length && (
          <p className="py-12 text-center text-sm text-neutral-500">
            No records found.
          </p>
        )}
      </div>
    </div>
  );
}
