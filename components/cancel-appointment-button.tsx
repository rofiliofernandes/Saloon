"use client";

import { useState } from "react";

export function CancelAppointmentButton({
  appointmentId,
}: {
  appointmentId: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function cancelAppointment() {
    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        "/api/appointments/cancel",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            appointment_id: appointmentId,
            reason,
          }),
        }
      );

      let result: any = {};

      try {
        result = await response.json();
      } catch {
        result = {};
      }

      if (!response.ok) {
        setError(
          result.error ||
            "Unable to cancel this appointment."
        );
        return;
      }

      window.location.reload();
    } catch {
      setError(
        "Unable to cancel this appointment. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-5 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
      >
        Cancel appointment
      </button>
    );
  }

  return (
    <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 p-4">
      <p className="text-sm font-medium text-red-800">
        Cancel this appointment?
      </p>

      <p className="mt-1 text-xs text-red-700">
        This action cannot be undone.
      </p>

      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason (optional)"
        className="mt-3 min-h-20 w-full rounded-xl border border-red-200 bg-white p-3 text-sm outline-none"
      />

      {error && (
        <p className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError("");
          }}
          disabled={saving}
          className="rounded-xl border bg-white px-4 py-2 text-sm"
        >
          Keep appointment
        </button>

        <button
          type="button"
          onClick={cancelAppointment}
          disabled={saving}
          className="rounded-xl bg-red-600 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {saving ? "Cancelling..." : "Confirm cancellation"}
        </button>
      </div>
    </div>
  );
}
