"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Search, Pencil } from "lucide-react";

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
    fields: [
      ["stylist_id", "Stylist ID"],
      ["start_time", "Start time"],
      ["end_time", "End time"],
    ],
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
  const [saving, setSaving] = useState(false);

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
    const r = await fetch("/api/admin/services");
    const x = await r.json();
    setServices(x.rows || []);
  }

  useEffect(() => {
    load();

    if (section === "availability") {
      loadStylists();
    }

    if (section === "stylists") {
      loadServices();
    }
  }, [section]);

  function resetForm() {
    setForm({});
    setSelectedServices([]);
    setEditingId(null);
  }

  async function openEdit(row: any) {
    setEditingId(row.id);
    setForm({ ...row });
    setSelectedServices([]);

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
       * STYLISTS
       */
      if (section === "stylists") {
        payload.service_ids = selectedServices;
      }

      /*
       * AVAILABILITY
       *
       * day_off means there should be no working-hours row.
       * If editing an existing working-hour row and selecting
       * day off, remove that row instead.
       */
      if (section === "availability" && form.day_off) {
        if (editingId) {
          await fetch(`/api/admin/${section}/${editingId}`, {
            method: "DELETE",
          });
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
        alert(x.error || "Unable to save.");
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

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-5 backdrop-blur-sm">
          <form
            onSubmit={save}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-7 shadow-2xl"
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
              /* AVAILABILITY */
              /* -------------------------------------------------- */

              <div className="mt-6 space-y-4">
                <div>
                  <label className="text-sm font-medium">
                    Stylist
                  </label>

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
                    <option value="">
                      Choose stylist
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
                </div>

                <div>
                  <label className="text-sm font-medium">
                    Day
                  </label>

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
                    <option value="">
                      Choose day
                    </option>

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
                    <p className="text-sm font-medium">
                      Day off
                    </p>

                    <p className="text-xs text-neutral-500">
                      This stylist is unavailable all day.
                    </p>
                  </div>
                </label>

                {!form.day_off && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium">
                        Opens
                      </label>

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
                      <label className="text-sm font-medium">
                        Closes
                      </label>

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
            ) : (
              /* -------------------------------------------------- */
              /* NORMAL FORMS */
              /* -------------------------------------------------- */

              <div className="mt-6 grid gap-3">
                {c.fields?.map((f: any[]) => {
                  const field = f[0];
                  const label = f[1];

                  if (
                    field === "description" ||
                    field === "bio"
                  ) {
                    return (
                      <textarea
                        key={field}
                        placeholder={label}
                        value={form[field] ?? ""}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            [field]: e.target.value,
                          })
                        }
                        className="min-h-24 rounded-xl border p-3"
                      />
                    );
                  }

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
                      onChange={(e) =>
                        setForm({
                          ...form,
                          [field]: e.target.value,
                        })
                      }
                      className="rounded-xl border p-3"
                      required
                    />
                  );
                })}

                {/* STYLIST SERVICES */}
                {section === "stylists" && (
                  <div className="mt-3 rounded-2xl border p-4">
                    <p className="font-medium">
                      Services this stylist provides
                    </p>

                    <p className="mt-1 text-xs text-neutral-500">
                      Customers will only be able to choose this
                      stylist for the services selected here.
                    </p>

                    <div className="mt-4 space-y-2">
                      {services.map((service) => (
                        <label
                          key={service.id}
                          className="flex items-center gap-3 rounded-xl border p-3"
                        >
                          <input
                            type="checkbox"
                            checked={selectedServices.includes(
                              String(service.id)
                            )}
                            onChange={(e) => {
                              const id = String(service.id);

                              setSelectedServices((current) =>
                                e.target.checked
                                  ? [...current, id]
                                  : current.filter(
                                      (x) => x !== id
                                    )
                              );
                            }}
                            className="h-4 w-4"
                          />

                          <span className="text-sm">
                            {service.name}
                          </span>
                        </label>
                      ))}

                      {!services.length && (
                        <p className="text-sm text-neutral-500">
                          No services available yet.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              disabled={saving}
              className="mt-6 w-full rounded-xl bg-neutral-900 p-3 text-white disabled:opacity-50"
            >
              {saving
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
                    ? `${x.stylist_id} · ${
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
              ) : section === "availability" ? (
                <div>
                  <p>
                    Stylist:{" "}
                    {stylists.find(
                      (s) => s.id === x.stylist_id
                    )?.name || x.stylist_id}
                  </p>

                  <p>
                    {x.day_off
                      ? "Day off"
                      : `${x.start_time?.slice(
                          0,
                          5
                        )} – ${x.end_time?.slice(0, 5)}`}
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
