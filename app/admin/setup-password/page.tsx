"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const MIN_PASSWORD_LENGTH = 12;

export default function AdminSetupPassword() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        router.replace("/login?next=/admin/setup-password");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profile?.role !== "admin" && profile?.role !== "owner") {
        setMessage("This invitation is not valid for an administrator account.");
      } else {
        setAllowed(true);
      }
      setChecking(false);
    });
  }, [router]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (password.length < MIN_PASSWORD_LENGTH) {
      setMessage(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setMessage("Passwords do not match.");
      return;
    }

    setSaving(true);
    const { error } = await createClient().auth.updateUser({ password });
    if (error) {
      setMessage("We could not set your password. Please request a new invitation or try again.");
      setSaving(false);
      return;
    }

    router.replace("/admin");
  }

  if (checking) return <main className="mx-auto max-w-xl px-6 py-20 text-center text-sm text-neutral-500">Checking your invitation…</main>;

  return (
    <main className="min-h-[calc(100vh-64px)] px-6 py-12 sm:py-20">
      <div className="mx-auto max-w-xl rounded-[2rem] border border-black/10 bg-white p-7 shadow-sm sm:p-10">
        <p className="text-xs uppercase tracking-[0.25em] text-neutral-400">Administrator invitation</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Set your password</h1>
        <p className="mt-3 text-sm leading-6 text-neutral-500">Choose a strong password for your administrator account. The salon owner never sees or receives your password.</p>

        {message && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{message}</div>}

        {allowed && (
          <form onSubmit={submit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium">New password</label>
              <input id="password" name="password" type="password" autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-black/15 px-4 py-3.5 text-sm outline-none focus:border-black" required />
            </div>
            <div>
              <label htmlFor="confirm" className="mb-2 block text-sm font-medium">Confirm password</label>
              <input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} value={confirm} onChange={(e) => setConfirm(e.target.value)} className="w-full rounded-xl border border-black/15 px-4 py-3.5 text-sm outline-none focus:border-black" required />
            </div>
            <button type="submit" disabled={saving} className="w-full rounded-xl bg-neutral-900 px-4 py-3.5 text-sm font-medium text-white disabled:opacity-50">{saving ? "Saving…" : "Set password and continue"}</button>
          </form>
        )}
      </div>
    </main>
  );
}
