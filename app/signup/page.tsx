"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  ) : (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="m3 3 18 18" />
      <path d="M10.6 5.2A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a18 18 0 0 1-3.1 3.9" />
      <path d="M6.1 6.1C3.4 8.1 2 12 2 12s3.5 7 10 7c1.5 0 2.8-.3 4-.8" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}

export default function Signup() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setLoading(true);

    const form = new FormData(event.currentTarget);

    const name = String(form.get("name") || "").trim();
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");
    const confirm = String(form.get("confirm") || "");

    if (password.length < 8) {
      setMessage("Password must be at least 8 characters.");
      setLoading(false);
      return;
    }

    if (password !== confirm) {
      setMessage("Passwords do not match.");
      setLoading(false);
      return;
    }

    const { error } = await createClient().auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage(
        "Account created. Please check your email to verify your account."
      );
    }

    setLoading(false);
  }

  return (
    <main className="min-h-[calc(100vh-64px)] px-6 py-12 sm:py-20">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-[2rem] border border-black/10 bg-white shadow-sm lg:grid-cols-[1fr_1.05fr]">
        {/* Brand panel */}
        <div className="relative hidden min-h-[620px] overflow-hidden bg-neutral-950 p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full border border-white/10" />
          <div className="absolute -bottom-32 -left-24 h-80 w-80 rounded-full border border-white/10" />

          <div className="relative z-10">
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">
              Luxe Salon
            </p>

            <h2 className="mt-8 max-w-sm text-4xl font-semibold leading-tight">
              Make time
              <br />
              for yourself.
            </h2>

            <p className="mt-5 max-w-sm text-sm leading-6 text-white/60">
              Create your account and make your next salon appointment just
              a few clicks away.
            </p>
          </div>

          <div className="relative z-10">
            <div className="mb-5 h-px w-16 bg-white/30" />
            <p className="text-sm text-white/50">
              Simple booking. Beautiful results.
            </p>
          </div>

          <div className="absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10 animate-pulse" />
        </div>

        {/* Form */}
        <div className="p-7 sm:p-10 lg:p-12">
          <div className="mx-auto max-w-md">
            <p className="text-xs uppercase tracking-[0.25em] text-neutral-400">
              Account
            </p>

            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
              Create account
            </h1>

            <p className="mt-2 text-sm leading-6 text-neutral-500">
              Join Luxe Salon to book and manage your appointments.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label
                  htmlFor="name"
                  className="mb-2 block text-sm font-medium"
                >
                  Name
                </label>

                <input
                  id="name"
                  name="name"
                  autoComplete="name"
                  className="w-full rounded-xl border border-black/15 px-4 py-3.5 text-sm outline-none transition focus:border-black focus:ring-2 focus:ring-black/5"
                  placeholder="Your name"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium"
                >
                  Email
                </label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  className="w-full rounded-xl border border-black/15 px-4 py-3.5 text-sm outline-none transition focus:border-black focus:ring-2 focus:ring-black/5"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium"
                >
                  Password
                </label>

                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    minLength={8}
                    className="w-full rounded-xl border border-black/15 px-4 py-3.5 pr-12 text-sm outline-none transition focus:border-black focus:ring-2 focus:ring-black/5"
                    placeholder="At least 8 characters"
                    required
                  />

                  <button
                    type="button"
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-neutral-400 hover:bg-neutral-50 hover:text-neutral-800"
                  >
                    <EyeIcon open={showPassword} />
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="confirm"
                  className="mb-2 block text-sm font-medium"
                >
                  Confirm password
                </label>

                <div className="relative">
                  <input
                    id="confirm"
                    name="confirm"
                    type={showConfirm ? "text" : "password"}
                    autoComplete="new-password"
                    minLength={8}
                    className="w-full rounded-xl border border-black/15 px-4 py-3.5 pr-12 text-sm outline-none transition focus:border-black focus:ring-2 focus:ring-black/5"
                    placeholder="Enter password again"
                    required
                  />

                  <button
                    type="button"
                    aria-label={
                      showConfirm
                        ? "Hide password"
                        : "Show password"
                    }
                    onClick={() => setShowConfirm((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-neutral-400 hover:bg-neutral-50 hover:text-neutral-800"
                  >
                    <EyeIcon open={showConfirm} />
                  </button>
                </div>
              </div>

              {message && (
                <div className="rounded-xl border border-black/10 bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-neutral-900 px-4 py-3.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Creating account..." : "Create account"}
              </button>
            </form>

            <p className="mt-7 text-center text-sm text-neutral-500">
              Already registered?{" "}
              <Link
                href="/login"
                className="font-medium text-neutral-900 underline underline-offset-4"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
