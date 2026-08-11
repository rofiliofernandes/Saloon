"use client";

import { useState } from "react";

export function CancelAppointmentButton({
  appointmentId,
}: {
  appointmentId: string;
}) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function cancelAppointment() {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this appointment?"
    );

    if (!confirmed) return;

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/appointments/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          appointment_id: appointmentId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Unable to cancel appointment.");
        return;
      }

      window.location.reload();
    } catch {
      setMessage("Unable to cancel appointment.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={cancelAppointment}
        disabled={loading}
        className="rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
      >
        {loading ? "Cancelling..." : "Cancel appointment"}
      </button>

      {message && (
        <p className="mt-2 text-sm text-red-600">
          {message}
        </p>
      )}
    </div>
  );
}
