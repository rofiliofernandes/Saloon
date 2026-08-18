"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, Copy, Gift, Users } from "lucide-react";

export default function MobileNav({
  user,
  admin,
  owner,
  name,
  referralCode,
  referralPoints,
}: {
  user: boolean;
  admin: boolean;
  owner: boolean;
  name: string;
  referralCode: string | null;
  referralPoints: number;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const close = () => setOpen(false);

  async function copyReferralLink() {
    let code = referralCode;
    if (!code) {
      try {
        const response = await fetch("/api/referrals/me", { method: "POST" });
        const result = await response.json();
        if (response.ok) code = result.referralCode || null;
      } catch {
        code = null;
      }
    }

    if (!code) return;

    const link = `${window.location.origin}/signup?ref=${encodeURIComponent(code)}`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = link;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="relative ml-auto md:hidden">
      <button
        type="button"
        aria-label={open ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex h-11 w-11 items-center justify-center rounded-[10px] border border-[#bd9144] text-[#292929] transition hover:bg-[#bd9144]/10"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {open && (
        <div className="absolute right-0 top-14 z-50 max-h-[82vh] w-80 overflow-y-auto rounded-2xl border border-[#d8c4a0]/50 bg-[#faf8f4] p-2 shadow-xl">
          <Link href="/services" onClick={close} className="block rounded-xl px-4 py-3 text-sm font-medium text-[#262626] hover:bg-[#bd9144]/10">Services</Link>
          <Link href="/stylists" onClick={close} className="block rounded-xl px-4 py-3 text-sm font-medium text-[#262626] hover:bg-[#bd9144]/10">Stylists</Link>
          <Link href={user ? "/book" : "/login?next=/book"} onClick={close} className="block rounded-xl px-4 py-3 text-sm font-medium text-[#262626] hover:bg-[#bd9144]/10">Book</Link>

          {user && (
            <Link href="/appointments" onClick={close} className="block rounded-xl px-4 py-3 text-sm font-medium text-[#262626] hover:bg-[#bd9144]/10">Appointments</Link>
          )}

          {user && (
            <>
              <div className="my-2 border-t border-[#d8c4a0]/40" />
              <p className="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-400">{name || "Account"}</p>
              <button type="button" onClick={copyReferralLink} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-[#262626] hover:bg-[#bd9144]/10">
                <Copy size={17} />
                <span>{copied ? "Referral link copied" : "Copy referral link"}</span>
              </button>
              <Link href="/referrals" onClick={close} className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-[#262626] hover:bg-[#bd9144]/10">
                <Gift size={17} />
                <span>Referral points <span className="text-xs text-neutral-500">({referralPoints})</span></span>
              </Link>
              <Link href="/referrals" onClick={close} className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-[#262626] hover:bg-[#bd9144]/10">
                <Users size={17} />
                <span>People you referred</span>
              </Link>
            </>
          )}

          {admin && (
            <>
              <div className="my-2 border-t border-[#d8c4a0]/40" />
              <p className="px-4 pb-2 pt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-400">Management</p>
              <Link href="/admin" onClick={close} className="mb-1 block rounded-xl bg-[#bd9144] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#a98038]">Admin dashboard</Link>
              <Link href="/admin/appointments" onClick={close} className="block rounded-xl px-4 py-3 text-sm font-medium text-[#262626] hover:bg-[#bd9144]/10">Appointments</Link>
              <Link href="/admin/services" onClick={close} className="block rounded-xl px-4 py-3 text-sm font-medium text-[#262626] hover:bg-[#bd9144]/10">Services</Link>
              <Link href="/admin/stylists" onClick={close} className="block rounded-xl px-4 py-3 text-sm font-medium text-[#262626] hover:bg-[#bd9144]/10">Stylists</Link>
              <Link href="/admin/availability" onClick={close} className="block rounded-xl px-4 py-3 text-sm font-medium text-[#262626] hover:bg-[#bd9144]/10">Availability</Link>
              <Link href="/admin/customers" onClick={close} className="block rounded-xl px-4 py-3 text-sm font-medium text-[#262626] hover:bg-[#bd9144]/10">Customers</Link>
              <Link href="/admin/coupons" onClick={close} className="block rounded-xl px-4 py-3 text-sm font-medium text-[#262626] hover:bg-[#bd9144]/10">Coupons</Link>
              <Link href="/admin/stylist-cancellations" onClick={close} className="block rounded-xl px-4 py-3 text-sm font-medium text-[#262626] hover:bg-[#bd9144]/10">Stylist Cancellations</Link>
              {owner && (
                <>
                  <Link href="/admin/reports" onClick={close} className="block rounded-xl px-4 py-3 text-sm font-medium text-[#262626] hover:bg-[#bd9144]/10">Reports</Link>
                  <Link href="/admin/admins" onClick={close} className="block rounded-xl px-4 py-3 text-sm font-medium text-[#262626] hover:bg-[#bd9144]/10">Admin Management</Link>
                </>
              )}
            </>
          )}

          <div className="my-2 border-t border-[#d8c4a0]/40" />
          {user ? (
            <form action="/api/auth/signout" method="post">
              <button type="submit" onClick={close} className="block w-full rounded-xl px-4 py-3 text-left text-sm font-medium text-[#292929] hover:bg-[#bd9144]/10">Sign out</button>
            </form>
          ) : (
            <Link href="/login" onClick={close} className="block rounded-xl px-4 py-3 text-sm font-medium text-[#292929] hover:bg-[#bd9144]/10">Sign in</Link>
          )}
        </div>
      )}
    </div>
  );
}
