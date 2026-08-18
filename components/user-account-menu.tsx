"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, Copy, Gift, Check, Users } from "lucide-react";

export default function UserAccountMenu({
  name,
  referralCode,
  referralPoints,
}: {
  name: string;
  referralCode: string | null;
  referralPoints: number;
}) {
  const [open, setOpen] = useState(false);
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  const [code, setCode] = useState(referralCode);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOrigin(window.location.origin);

    function onPointerDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  async function ensureReferralCode() {
    if (code) return code;

    try {
      const response = await fetch("/api/referrals/me", { method: "POST" });
      const result = await response.json();
      if (response.ok && result.referralCode) {
        setCode(result.referralCode);
        return result.referralCode as string;
      }
    } catch {
      // Keep the menu usable even if the request fails.
    }

    return null;
  }

  async function copyReferralLink() {
    const referralCode = await ensureReferralCode();
    if (!referralCode) return;

    const link = `${window.location.origin}/signup?ref=${encodeURIComponent(referralCode)}`;

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
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex max-w-[220px] items-center gap-2 rounded-[10px] px-3 py-2.5 text-sm font-medium text-[#292929] transition hover:bg-[#bd9144]/10"
      >
        <span className="max-w-[165px] truncate">{name || "Account"}</span>
        <ChevronDown size={16} className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-[70] mt-2 w-72 overflow-hidden rounded-2xl border border-black/10 bg-white p-2 shadow-xl"
        >
          <button
            type="button"
            role="menuitem"
            onClick={copyReferralLink}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-neutral-50"
          >
            {copied ? <Check size={18} /> : <Copy size={18} />}
            <span className="min-w-0">
              <span className="block text-sm font-medium">
                {copied ? "Referral link copied" : "Copy referral link"}
              </span>
              <span className="mt-0.5 block truncate text-xs text-neutral-500">
                {code && origin
                  ? `${origin}/signup?ref=${code}`
                  : "Click to generate your referral link"}
              </span>
            </span>
          </button>

          <Link
            href="/referrals"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-neutral-50"
          >
            <Gift size={18} />
            <span>
              <span className="block text-sm font-medium">Referral points</span>
              <span className="mt-0.5 block text-xs text-neutral-500">
                {referralPoints} points
              </span>
            </span>
          </Link>

          <Link
            href="/referrals"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-neutral-50"
          >
            <Users size={18} />
            <span>
              <span className="block text-sm font-medium">People you referred</span>
              <span className="mt-0.5 block text-xs text-neutral-500">
                See who joined using your code
              </span>
            </span>
          </Link>
        </div>
      )}
    </div>
  );
}
