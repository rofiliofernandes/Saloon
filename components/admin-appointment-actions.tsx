"use client";

import { useState } from "react";

type Props = {
  appointmentId: string;
  status: string;
};

export default function AdminAppointmentActions({
  appointmentId,
  status,
}: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function updateStatus(
    nextStatus: "completed" | "no_show"
  ) {
    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        `/api/admin/appointments/${appointmentId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: nextStatus,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to update appointment.");
        return;
      }

      window.location.reload();
    } catch {
      setError("Unable to update appointment.");
    } finally {
      setSaving(false);
    }
  }

  async function cancelAppointment() {
    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        `/api/admin/appointments/${appointmentId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: "cancelled",
            cancellation_reason:
              reason.trim() || null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to cancel appointment.");
        return;
      }

      window.location.reload();
    } catch {
      setError("Unable to cancel appointment.");
    } finally {
      setSaving(false);
    }
  }

  if (status === "cancelled") {
    return null;
  }

  return (
    <div className="w-full lg:w-auto lg:min-w-[180px]">
      <div className="flex flex-wrap gap-2 lg:justify-end">
        {status === "confirmed" && (
          <>
            <button
              type="button"
              disabled={saving}
              onClick={() => updateStatus("completed")}
              className="rounded-full border px-4 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50"
            >
              Mark completed
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => updateStatus("no_show")}
              className="rounded-full border px-4 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50"
            >
              No-show
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => setOpen((value) => !value)}
              className="rounded-full border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              Cancel
            </button>
          </>
        )}

        {error && (
          <p className="w-full text-sm text-red-600">
            {error}
          </p>
        )}
      </div>

      {open && (
        <div className="mt-3 rounded-2xl border border-red-100 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-700">
            Cancel appointment?
          </p>

          <p className="mt-1 text-xs text-red-600">
            This will mark the appointment as cancelled and
            record that it was cancelled by admin.
          </p>

          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Reason (optional)"
            rows={3}
            className="mt-3 w-full rounded-xl border border-red-200 bg-white px-3 py-2 text-sm outline-none focus:border-red-400"
          />

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => setOpen(false)}
              className="rounded-full border bg-white px-4 py-2 text-sm"
            >
              Keep appointment
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={cancelAppointment}
              className="rounded-full bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
            >
              {saving ? "Cancelling..." : "Confirm cancellation"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
