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
    fields: [
      ["code", "Code"],
      ["discount_type", "Discount type"],
      ["discount_value", "Discount value"],
      ["minimum_amount", "Minimum amount"],
      ["usage_limit", "Usage limit"],
      ["expires_at", "Expires at"],
    ],
  },

  availability: {
    title: "Working hours",
    fields: [
      ["stylist_id", "Stylist ID"],
      ["day_of_week", "Day (0–6)"],
      ["start_time", "Start time"],
      ["end_time", "End time"],
    ],
  },
};

export function AdminEditor({ section }: { section: string }) {
  const c = config[section] || config.services;

  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<any>({});
  const [services, setServices] = useState<any[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [stylistRows, setStylistRows] = useState<any[]>([]); 

  async function load() {
    const r = await fetch("/api/admin/" + section);
    const x = await r.json();
    setRows(x.rows || []);
  }

async function loadServices() {
  if (section === "stylists") {
    const r = await fetch("/api/admin/services");
    const x = await r.json();
    setServices(x.rows || []);
  }

  if (section === "availability") {
    const r = await fetch("/api/admin/stylists");
    const x = await r.json();
    setStylistRows(x.rows || []);
  }
}

  useEffect(() => {
    load();
    loadServices();
  }, [section]);

  async function openEdit(row: any) {
    setEditingId(row.id);

    const nextForm: any = {};

    for (const field of c.fields) {
      nextForm[field[0]] = row[field[0]] ?? "";
    }

    setForm(nextForm);

    if (section === "stylists") {
      const r = await fetch(
        `/api/admin/stylist-services?stylist_id=${row.id}`
      );

      const x = await r.json();

      setSelectedServices(x.service_ids || []);
    } else {
      setSelectedServices([]);
    }

    setOpen(true);
  }

  async function save(e: any) {
    e.preventDefault();

if (section === "availability" && form.day_off) {
  if (editingId) {
    const r = await fetch(
      `/api/admin/availability/${editingId}`,
      {
        method: "DELETE",
      }
    );

    if (!r.ok) {
      const x = await r.json();
      alert(x.error || "Unable to set day off");
      return;
    }
  }

  setForm({});
  setEditingId(null);
  setOpen(false);
  load();
  return;
}

    const payload =
      section === "stylists"
        ? {
            ...form,
            service_ids: selectedServices,
          }
        : form;

    const url = editingId
      ? `/api/admin/${section}/${editingId}`
      : `/api/admin/${section}`;

    const r = await fetch(url, {
      method: editingId ? "PATCH" : "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const x = await r.json();

    if (!r.ok) {
      alert(x.error || "Unable to save");
      return;
    }

    setForm({});
    setSelectedServices([]);
    setEditingId(null);
    setOpen(false);

    load();
  }

  async function del(id: string) {
    if (!confirm("Remove this item?")) return;

    const r = await fetch(
      "/api/admin/" + section + "/" + id,
      {
        method: "DELETE",
      }
    );

    if (r.ok) {
      load();
    }
  }

  function closeEditor() {
    setOpen(false);
    setEditingId(null);
    setForm({});
    setSelectedServices([]);
  }

  const shown = rows.filter((x) =>
    JSON.stringify(x)
      .toLowerCase()
      .includes(search.toLowerCase())
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
            <Search
              size={16}
              className="text-neutral-400"
            />

            <input
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              className="w-32 bg-transparent p-2 text-sm outline-none sm:w-48"
              placeholder="Search"
            />
          </div>

          <button
            onClick={() => {
              setForm({});
              setSelectedServices([]);
              setEditingId(null);
              setOpen(true);
            }}
            className="rounded-xl bg-neutral-900 px-4 py-2.5 text-sm text-white"
          >
            <Plus
              className="mr-1 inline"
              size={16}
            />
            Add
          </button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-5 backdrop-blur-sm">
          <form
            onSubmit={save}
            className="w-full max-w-lg rounded-3xl bg-white p-7 shadow-2xl"
          >
            <div className="flex justify-between">
              <h2 className="text-2xl font-semibold">
                {editingId
                  ? `Edit ${c.title.slice(0, -1)}`
                  : `Add ${c.title.slice(0, -1)}`}
              </h2>

              <button
                type="button"
                onClick={closeEditor}
                className="text-2xl"
              >
                ×
              </button>
            </div>

            <div className="mt-6 grid gap-3">
            {section === "availability" ? (
  <>
    <select
      value={form.stylist_id ?? ""}
      onChange={(e) =>
        setForm({ ...form, stylist_id: e.target.value })
      }
      className="rounded-xl border p-3"
      required
    >
      <option value="">Choose stylist</option>

      {stylistRows.map((stylist) => (
        <option key={stylist.id} value={stylist.id}>
          {stylist.name}
        </option>
      ))}
    </select>

    <select
      value={form.day_of_week ?? ""}
      onChange={(e) =>
        setForm({
          ...form,
          day_of_week: e.target.value,
        })
      }
      className="rounded-xl border p-3"
      required
    >
      <option value="">Choose day</option>
      <option value="0">Sunday</option>
      <option value="1">Monday</option>
      <option value="2">Tuesday</option>
      <option value="3">Wednesday</option>
      <option value="4">Thursday</option>
      <option value="5">Friday</option>
      <option value="6">Saturday</option>
    </select>

    <label className="flex items-center gap-3 rounded-xl border p-3">
      <input
        type="checkbox"
        checked={form.day_off === true}
        onChange={(e) =>
          setForm({
            ...form,
            day_off: e.target.checked,
          })
        }
      />

      <span>Day off</span>
    </label>

    {!form.day_off && (
      <>
        <label className="text-sm">
          Start time
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
        </label>

        <label className="text-sm">
          End time
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
        </label>
      </>
    )}
  </>
) : (
  c.fields.map((f: any[]) =>
    f[0] === "description" || f[0] === "bio" ? (
      <textarea
        key={f[0]}
        placeholder={f[1]}
        value={form[f[0]] ?? ""}
        onChange={(e) =>
          setForm({
            ...form,
            [f[0]]: e.target.value,
          })
        }
        className="min-h-24 rounded-xl border p-3"
      />
    ) : (
      <input
        key={f[0]}
        placeholder={f[1]}
        value={form[f[0]] ?? ""}
        onChange={(e) =>
          setForm({
            ...form,
            [f[0]]: e.target.value,
          })
        }
        className="rounded-xl border p-3"
        required={
          !["usage_limit", "expires_at"].includes(f[0])
        }
      />
    )
  )
)}

              {section === "stylists" && (
                <div className="rounded-2xl border p-4">
                  <p className="font-medium">
                    Services
                  </p>

                  <p className="mt-1 text-sm text-neutral-500">
                    Select the services this stylist
                    can provide.
                  </p>

                  <div className="mt-4 grid gap-2">
                    {services.map((service) => (
                      <label
                        key={service.id}
                        className="flex cursor-pointer items-center gap-3 rounded-xl border p-3 hover:bg-neutral-50"
                      >
                        <input
                          type="checkbox"
                          checked={selectedServices.includes(
                            service.id
                          )}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedServices(
                                (current) => [
                                  ...current,
                                  service.id,
                                ]
                              );
                            } else {
                              setSelectedServices(
                                (current) =>
                                  current.filter(
                                    (id) =>
                                      id !==
                                      service.id
                                  )
                              );
                            }
                          }}
                        />

                        <span>
                          {service.name}
                        </span>
                      </label>
                    ))}

                    {services.length === 0 && (
                      <p className="text-sm text-neutral-500">
                        No services available.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="mt-5 w-full rounded-xl bg-neutral-900 p-3 text-white"
            >
              {editingId ? "Save changes" : "Save"}
            </button>
          </form>
        </div>
      )}

      <div className="mt-5 overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm">
        <div className="hidden border-b bg-neutral-50 px-5 py-3 text-xs uppercase tracking-wider text-neutral-400 md:grid md:grid-cols-[1.2fr_1fr_120px]">
          <span>Item</span>
          <span>Details</span>
          <span />
        </div>

        {shown.map((x) => (
          <div
            key={x.id}
            className="grid gap-3 border-b px-5 py-5 last:border-0 md:grid-cols-[1.2fr_1fr_120px] md:items-center"
          >
            <div>
              <p className="font-medium">
                {x.name || x.code || x.id}
              </p>

              <p className="text-xs text-neutral-400">
                {x.category ||
                  x.discount_type ||
                  ""}
              </p>
            </div>

            <p className="text-sm text-neutral-500">
              {Object.entries(x)
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
                .join(" · ")}
            </p>

            <div className="flex items-center gap-3">
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
          <p className="p-10 text-center text-sm text-neutral-500">
            No records found.
          </p>
        )}
      </div>
    </div>
  );
}
