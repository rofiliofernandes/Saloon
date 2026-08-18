"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  ShieldCheck,
  UserCog,
} from "lucide-react";

type Admin = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "owner";
  created_at: string;
  disabled: boolean;
};

export default function AdminManagement() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");

  const [modal, setModal] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/admin/admins",
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to load administrators."
        );
      }

      setAdmins(data.rows || []);
    } catch (e: any) {
      setError(
        e?.message ||
          "Unable to load administrators."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function resetForm() {
    setName("");
    setEmail("");
    setModalError("");
  }

  function closeModal() {
    if (saving) return;

    setModal(false);
    resetForm();
  }

  async function createAdmin(
    event: React.FormEvent
  ) {
    event.preventDefault();

    setModalError("");
    setError("");

    if (!name.trim()) {
      setModalError("Please enter a name.");
      return;
    }

    if (!email.trim()) {
      setModalError(
        "Please enter an email address."
      );
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        "/api/admin/admins",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim().toLowerCase(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to create administrator."
        );
      }

      setModal(false);
      resetForm();

      await load();
    } catch (e: any) {
      setModalError(
        e?.message ||
          "Unable to create administrator."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleAdmin(
    admin: Admin
  ) {
    const action = admin.disabled
      ? "enable"
      : "disable";

    const confirmed = window.confirm(
      `${
        action === "disable"
          ? "Disable"
          : "Enable"
      } ${admin.name}'s admin access?`
    );

    if (!confirmed) {
      return;
    }

    setError("");

    try {
      const response = await fetch(
        `/api/admin/admins/${admin.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            disabled: !admin.disabled,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to update administrator."
        );
      }

      await load();
    } catch (e: any) {
      setError(
        e?.message ||
          "Unable to update administrator."
      );
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 lg:px-8 lg:py-14">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.25em] text-neutral-400">
            Owner
          </p>

          <h1 className="mt-2 text-4xl font-semibold tracking-tight">
            Admin Management
          </h1>

          <p className="mt-2 max-w-xl text-sm text-neutral-500">
            Manage who can access the salon
            administration area.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            resetForm();
            setModal(true);
          }}
          className="inline-flex items-center justify-center rounded-full bg-neutral-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-neutral-800"
        >
          <Plus
            size={16}
            className="mr-2"
          />
          Add admin
        </button>
      </div>

      {error && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-8 overflow-hidden rounded-3xl border border-black/10 bg-white">
        {loading ? (
          <div className="p-10 text-center text-sm text-neutral-500">
            Loading administrators...
          </div>
        ) : !admins.length ? (
          <div className="p-10 text-center">
            <UserCog
              size={32}
              className="mx-auto text-neutral-300"
            />

            <h2 className="mt-4 text-lg font-semibold">
              No administrators
            </h2>

            <p className="mt-1 text-sm text-neutral-500">
              Add a normal administrator to
              help manage the salon.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-black/5">
            {admins.map((admin) => (
              <div
                key={admin.id}
                className="flex flex-col gap-5 px-6 py-6 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">
                      {admin.name}
                    </h2>

                    {admin.role ===
                    "owner" ? (
                      <span className="inline-flex items-center rounded-full bg-[#bd9144]/10 px-2.5 py-1 text-[11px] font-medium text-[#8d6827]">
                        <ShieldCheck
                          size={12}
                          className="mr-1"
                        />
                        Owner
                      </span>
                    ) : (
                      <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-medium text-neutral-600">
                        Normal Admin
                      </span>
                    )}

                    {admin.disabled && (
                      <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-medium text-red-600">
                        Disabled
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-sm text-neutral-500">
                    {admin.email}
                  </p>
                </div>

                {admin.role ===
                  "admin" && (
                  <button
                    type="button"
                    onClick={() =>
                      toggleAdmin(admin)
                    }
                    className={
                      admin.disabled
                        ? "rounded-full border border-black/10 px-4 py-2 text-sm font-medium transition hover:bg-neutral-50"
                        : "rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                    }
                  >
                    {admin.disabled
                      ? "Enable"
                      : "Disable"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-5 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[.2em] text-neutral-400">
                  Owner
                </p>

                <h2 className="mt-1 text-2xl font-semibold">
                  Add administrator
                </h2>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="text-xl text-neutral-400 hover:text-neutral-900 disabled:cursor-not-allowed"
              >
                ×
              </button>
            </div>

            {modalError && (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700">
                {modalError}
              </div>
            )}

            <form
              onSubmit={createAdmin}
              className="mt-6 space-y-4"
            >
              <div>
                <label className="text-sm font-medium">
                  Name
                </label>

                <input
                  value={name}
                  onChange={(event) =>
                    setName(
                      event.target.value
                    )
                  }
                  placeholder="Administrator name"
                  className="mt-2 w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-neutral-900"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium">
                  Email
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(
                      event.target.value
                    )
                  }
                  placeholder="admin@example.com"
                  className="mt-2 w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-neutral-900"
                  required
                />
              </div>

              <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-5 text-blue-800">
                The administrator will receive a secure invitation email and choose their own password. No administrator password is entered or stored by this salon dashboard.
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-neutral-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Sending invitation..."
                  : "Send invitation"}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
