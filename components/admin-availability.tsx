"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

const days = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

function formatTime(value: string) {
  if (!value) return "";

  const [hourString, minute] = value.split(":");
  const hour = Number(hourString);

  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;

  return `${displayHour}:${minute} ${suffix}`;
}

export default function AdminAvailability() {
  const [rows, setRows] = useState<any[]>([]);
  const [stylists, setStylists] = useState<any[]>([]);

  const [selectedStylist, setSelectedStylist] = useState("");
  const [open, setOpen] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    stylist_id: "",
    day_of_week: "1",
    start_time: "10:00",
    end_time: "22:00",
    day_off: false,
  });

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);

    try {
      const response = await fetch("/api/admin/availability");
      const data = await response.json();

      setRows(data.rows || []);
    } finally {
      setLoading(false);
    }
  }

  async function loadStylists() {
    const response = await fetch("/api/admin/stylists");
    const data = await response.json();

    setStylists(data.rows || []);
  }

  useEffect(() => {
    load();
    loadStylists();
  }, []);

  const filteredRows = useMemo(() => {
    if (!selectedStylist) {
      return rows;
    }

    return rows.filter(
      (row) => String(row.stylist_id) === String(selectedStylist)
    );
  }, [rows, selectedStylist]);

  const grouped = useMemo(() => {
    const map = new Map<number, any[]>();

    for (const day of days) {
      map.set(day.value, []);
    }

    for (const row of filteredRows) {
      const existing = map.get(row.day_of_week) || [];
      existing.push(row);
      map.set(row.day_of_week, existing);
    }

    return map;
  }, [filteredRows]);

  function stylistName(id: string) {
    return (
      stylists.find(
        (stylist) => String(stylist.id) === String(id)
      )?.name || "Unknown stylist"
    );
  }

  function openAdd(day?: number) {
    setEditingId(null);

    setForm({
      stylist_id: selectedStylist || stylists[0]?.id || "",
      day_of_week: String(day ?? 1),
      start_time: "10:00",
      end_time: "22:00",
      day_off: false,
    });

    setOpen(true);
  }

  function openEdit(row: any) {
    setEditingId(row.id);

    setForm({
      stylist_id: row.stylist_id,
      day_of_week: String(row.day_of_week),
      start_time: String(row.start_time).slice(0, 5),
      end_time: String(row.end_time).slice(0, 5),
      day_off: false,
    });

    setOpen(true);
  }

  async function remove(id: string) {
    if (!confirm("Remove this working schedule?")) {
      return;
    }

    const response = await fetch(
      `/api/admin/availability/${id}`,
      {
        method: "DELETE",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      alert(data.error || "Unable to remove schedule.");
      return;
    }

    await load();
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();

    if (!form.stylist_id) {
      alert("Please select a stylist.");
      return;
    }

    if (!form.day_off && !form.start_time) {
      alert("Please choose a start time.");
      return;
    }

    if (!form.day_off && !form.end_time) {
      alert("Please choose an end time.");
      return;
    }

    if (
      !form.day_off &&
      form.start_time >= form.end_time
    ) {
      alert("End time must be after start time.");
      return;
    }

    setSaving(true);

    try {
      const url = editingId
        ? `/api/admin/availability/${editingId}`
        : "/api/admin/availability";

      const response = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stylist_id: form.stylist_id,
          day_of_week: Number(form.day_of_week),
          start_time: form.start_time,
          end_time: form.end_time,
          day_off: form.day_off,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Unable to save schedule.");
        return;
      }

      setOpen(false);
      setEditingId(null);

      await load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-8">
      <div className="flex flex-col justify-between gap-4 rounded-3xl border bg-white p-5 shadow-sm sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-semibold">
            Working schedule
          </h2>

          <p className="mt-1 text-sm text-neutral-500">
            Set the days and hours each stylist is available for bookings.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={selectedStylist}
            onChange={(event) =>
              setSelectedStylist(event.target.value)
            }
            className="rounded-xl border border-black/20 bg-white px-4 py-3 text-sm outline-none"
          >
            <option value="">All stylists</option>

            {stylists.map((stylist) => (
              <option key={stylist.id} value={stylist.id}>
                {stylist.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => openAdd()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-neutral-900 px-5 py-3 text-sm text-white hover:bg-neutral-800"
          >
            <Plus size={16} />
            Add hours
          </button>
        </div>
      </div>

      {loading ? (
        <div className="mt-6 rounded-2xl border bg-white p-10 text-center text-sm text-neutral-500">
          Loading availability...
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-3xl border bg-white shadow-sm">
          {days.map((day) => {
            const dayRows = grouped.get(day.value) || [];

            return (
              <div
                key={day.value}
                className="border-b last:border-b-0"
              >
                <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-start">
                  <div className="w-36 shrink-0">
                    <p className="font-semibold">
                      {day.label}
                    </p>

                    <button
                      type="button"
                      onClick={() => openAdd(day.value)}
                      className="mt-2 text-xs text-neutral-500 hover:text-neutral-900"
                    >
                      + Add
                    </button>
                  </div>

                  <div className="min-w-0 flex-1">
                    {!dayRows.length ? (
                      <div className="rounded-xl bg-neutral-50 px-4 py-4 text-sm text-neutral-400">
                        No working hours configured
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {dayRows.map((row) => (
                          <div
                            key={row.id}
                            className="flex flex-col gap-3 rounded-xl border border-black/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div>
                              <p className="font-medium">
                                {stylistName(row.stylist_id)}
                              </p>

                              <p className="mt-1 text-sm text-neutral-500">
                                {formatTime(row.start_time)} –{" "}
                                {formatTime(row.end_time)}
                              </p>
                            </div>

                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => openEdit(row)}
                                className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm hover:bg-neutral-50"
                              >
                                <Pencil size={14} />
                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={() => remove(row.id)}
                                className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                              >
                                <Trash2 size={14} />
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-8 rounded-2xl border border-amber-100 bg-amber-50 p-5">
        <h3 className="font-medium text-amber-900">
          Blocked periods
        </h3>

        <p className="mt-1 text-sm text-amber-800">
          Individual dates and temporary closures such as holidays,
          lunch breaks, meetings or personal time will be managed
          separately.
        </p>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold">
                  {editingId ? "Edit working hours" : "Add working hours"}
                </h2>

                <p className="mt-1 text-sm text-neutral-500">
                  Choose who is working and when.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-xl text-neutral-400 hover:text-neutral-900"
              >
                ×
              </button>
            </div>

            <form onSubmit={save} className="mt-6 space-y-4">
              <div>
                <label className="text-sm font-medium">
                  Stylist
                </label>

                <select
                  value={form.stylist_id}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      stylist_id: event.target.value,
                    })
                  }
                  className="mt-2 w-full rounded-xl border px-4 py-3 outline-none"
                >
                  <option value="">Select stylist</option>

                  {stylists.map((stylist) => (
                    <option key={stylist.id} value={stylist.id}>
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
                  value={form.day_of_week}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      day_of_week: event.target.value,
                    })
                  }
                  className="mt-2 w-full rounded-xl border px-4 py-3 outline-none"
                >
                  {days.map((day) => (
                    <option
                      key={day.value}
                      value={day.value}
                    >
                      {day.label}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-3 rounded-xl border bg-neutral-50 p-4">
                <input
                  type="checkbox"
                  checked={form.day_off}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      day_off: event.target.checked,
                    })
                  }
                  className="h-4 w-4"
                />

                <span>
                  <span className="block text-sm font-medium">
                    Day off
                  </span>

                  <span className="block text-xs text-neutral-500">
                    This stylist will not be available on this day.
                  </span>
                </span>
              </label>

              {!form.day_off && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium">
                      Starts at
                    </label>

                    <input
                      type="time"
                      value={form.start_time}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          start_time: event.target.value,
                        })
                      }
                      className="mt-2 w-full rounded-xl border px-4 py-3 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">
                      Ends at
                    </label>

                    <input
                      type="time"
                      value={form.end_time}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          end_time: event.target.value,
                        })
                      }
                      className="mt-2 w-full rounded-xl border px-4 py-3 outline-none"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-neutral-900 px-5 py-3 text-sm text-white hover:bg-neutral-800 disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : editingId
                  ? "Save changes"
                  : "Add working hours"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
