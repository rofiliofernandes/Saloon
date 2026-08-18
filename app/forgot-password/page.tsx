"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPassword() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage("");
    setSent(false);
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "")
      .trim()
      .toLowerCase();

    if (!email) {
      setMessage("Please enter your email address.");
      setLoading(false);
      return;
    }

    const supabase = createClient();

    const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
    const isLocalConfiguredUrl = !configuredSiteUrl || /localhost|127\.0\.0\.1/.test(configuredSiteUrl);
    const redirectTo = `${isLocalConfiguredUrl ? window.location.origin : configuredSiteUrl}/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      setMessage(
        "We couldn't send the reset email right now. Please try again."
      );
      setLoading(false);
      return;
    }

    setSent(true);
    setMessage(
      "If an account exists for that email, a password reset link has been sent."
    );

    setLoading(false);
  }

  return (
    <main className="min-h-[calc(100vh-64px)] px-6 py-12 sm:py-20">
      <div className="mx-auto grid max-w-4xl overflow-hidden rounded-[2rem] border border-black/10 bg-white shadow-sm lg:grid-cols-[0.9fr_1.1fr]">
        <div className="relative hidden min-h-[500px] overflow-hidden bg-neutral-950 p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full border border-white/10" />
          <div className="absolute -bottom-32 -left-24 h-80 w-80 rounded-full border border-white/10" />

          <div className="relative z-10">
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">
              AK Hair &amp; Beauty Salon
            </p>

            <h2 className="mt-8 text-4xl font-semibold leading-tight">
              We&apos;ve got
              <br />
              you covered.
            </h2>

            <p className="mt-5 max-w-sm text-sm leading-6 text-white/60">
              Enter your email and we&apos;ll help you get back into your
              account.
            </p>
          </div>

          <div className="relative z-10">
            <div className="mb-5 h-px w-16 bg-white/30" />

            <p className="text-sm text-white/50">
              Your account, safely in your hands.
            </p>
          </div>

          <div className="absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10 animate-pulse" />
        </div>

        <div className="p-7 sm:p-10 lg:p-12">
          <div className="mx-auto max-w-md">
            <p className="text-xs uppercase tracking-[0.25em] text-neutral-400">
              Account recovery
            </p>

            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
              Reset your password
            </h1>

            <p className="mt-3 text-sm leading-6 text-neutral-500">
              Enter the email address associated with your AK Hair &amp;
              Beauty Salon account. We&apos;ll send you a secure link to
              choose a new password.
            </p>

            <form
              onSubmit={handleSubmit}
              className="mt-8 space-y-5"
            >
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
                  disabled={loading}
                />
              </div>

              {message && (
                <div
                  className={`rounded-xl border px-4 py-3 text-sm leading-5 ${
                    sent
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-red-200 bg-red-50 text-red-700"
                  }`}
                >
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-neutral-900 px-4 py-3.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Sending..." : "Send reset link"}
              </button>
            </form>

            <div className="mt-7 text-center text-sm text-neutral-500">
              Remember your password?{" "}
              <Link
                href="/login"
                className="font-medium text-neutral-900 underline underline-offset-4"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
