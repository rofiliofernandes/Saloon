"use client";

import { useState } from "react";

export default function ReferralCard({
  referralCode,
  points,
  siteUrl,
}: {
  referralCode: string;
  points: number;
  siteUrl: string;
}) {
  const [redeeming, setRedeeming] = useState(false);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const referralLink = `${siteUrl.replace(/\/$/, "")}/signup?ref=${encodeURIComponent(referralCode)}`;
  const rupeeValue = points / 2;

  async function copyLink() {
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  async function redeem() {
    if (points < 1) return;
    setRedeeming(true);
    setMessage("");

    try {
      const response = await fetch("/api/referrals/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ points }),
      });
      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Unable to redeem points.");
        return;
      }

      setMessage(`₹${result.coupon.amount} salon credit created. Coupon: ${result.coupon.code}`);
      window.setTimeout(() => window.location.reload(), 900);
    } catch {
      setMessage("Unable to redeem points.");
    } finally {
      setRedeeming(false);
    }
  }

  return (
    <section id="referral-rewards" className="mt-10 scroll-mt-28 rounded-3xl border bg-white p-6 shadow-sm sm:p-7">
      <p className="text-xs uppercase tracking-[0.22em] text-neutral-400">Referral rewards</p>
      <h2 className="mt-2 text-2xl font-semibold">Refer a friend</h2>
      <p className="mt-2 text-sm leading-6 text-neutral-500">
        When a new customer joins using your referral and completes their first purchase,
        you earn 5% of that purchase as points.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-neutral-50 p-5">
          <p className="text-xs text-neutral-500">Your points</p>
          <p className="mt-1 text-3xl font-semibold">{points}</p>
          <p className="mt-1 text-sm text-neutral-500">₹{rupeeValue.toFixed(2)} salon credit value</p>
        </div>
        <div className="rounded-2xl bg-neutral-50 p-5">
          <p className="text-xs text-neutral-500">Your referral code</p>
          <p className="mt-1 text-xl font-semibold tracking-wide">{referralCode}</p>
          <p className="mt-1 text-xs text-neutral-500">2 points = ₹1</p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border p-4">
        <p className="text-sm font-medium">Share your referral link</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input readOnly value={referralLink} className="min-w-0 flex-1 rounded-xl border bg-neutral-50 px-3 py-2.5 text-sm" />
          <button type="button" onClick={copyLink} className="rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white">
            {copied ? "Copied!" : "Copy link"}
          </button>
        </div>
      </div>

      <div className="mt-5">
        <button
          type="button"
          disabled={points < 1 || redeeming}
          onClick={redeem}
          className="rounded-xl border px-4 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
        >
          {redeeming ? "Converting..." : `Convert ${points} points to ₹${rupeeValue.toFixed(2)} credit`}
        </button>
        <p className="mt-2 text-xs text-neutral-500">Your points are converted into a one-time salon-credit coupon.</p>
      </div>

      {message && <p className="mt-3 rounded-xl bg-neutral-50 px-3 py-2 text-sm text-neutral-700">{message}</p>}
    </section>
  );
}
