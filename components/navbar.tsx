import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Crown } from "lucide-react";

export async function Navbar() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let admin = false;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role,name")
      .eq("id", user.id)
      .maybeSingle();

    admin =
  profile?.role === "admin" ||
  profile?.role === "owner";
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[#d8c4a0]/35 bg-[#faf8f4] shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
      <nav className="mx-auto flex h-[104px] max-w-[1500px] items-center px-8 lg:px-12">

        {/* =========================================================
            BRAND
        ========================================================= */}
        <Link
          href="/"
          aria-label="AK Hair & Beauty Salon"
          className="group flex shrink-0 items-center"
        >
          {/* Crown + AK mark */}
          <div className="relative flex h-[82px] w-[82px] items-end justify-center">
            <Crown
              size={31}
              strokeWidth={1.45}
              className="absolute left-1/2 top-0 -translate-x-1/2 text-[#b4862c]"
            />

            <span className="font-serif text-[47px] font-medium leading-none tracking-[-0.16em] text-[#a87820]">
              AK
            </span>
          </div>

          {/* Vertical divider */}
          <div className="mx-4 h-[48px] w-px bg-[#b4862c]/35" />

          {/* Wordmark */}
          <div className="flex flex-col justify-center">
            <span className="font-serif text-[31px] leading-none tracking-[0.025em] text-[#171717]">
              AK
            </span>

            <span className="mt-2 whitespace-nowrap text-[9px] font-medium uppercase tracking-[0.23em] text-[#a87820]">
              Hair &amp; Beauty Salon
            </span>
          </div>
        </Link>

        {/* =========================================================
            NAVIGATION
        ========================================================= */}
        <div className="ml-auto flex items-center gap-10">

          <div className="hidden items-center gap-9 text-[15px] font-medium text-[#262626] md:flex">
            <Link
              href="/services"
              className="transition-colors hover:text-[#a87820]"
            >
              Services
            </Link>

            <Link
              href="/stylists"
              className="transition-colors hover:text-[#a87820]"
            >
              Stylists
            </Link>

            <Link
              href="/book"
              className="transition-colors hover:text-[#a87820]"
            >
              Book
            </Link>

            {user && (
              <Link
                href="/appointments"
                className="transition-colors hover:text-[#a87820]"
              >
                Appointments
              </Link>
            )}
          </div>

          {/* =======================================================
              ACTIONS
          ======================================================= */}
          <div className="flex items-center gap-3">

            {admin && (
              <Link
                href="/admin"
                className="hidden rounded-[10px] bg-[#bd9144] px-7 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#a98038] sm:inline-flex"
              >
                Admin
              </Link>
            )}

            {user ? (
              <form
                action="/api/auth/signout"
                method="post"
              >
                <button
                  type="submit"
                  className="rounded-[10px] border border-[#bd9144] bg-transparent px-7 py-3 text-sm font-medium text-[#292929] transition hover:bg-[#bd9144]/10"
                >
                  Sign out
                </button>
              </form>
            ) : (
              <Link
                href="/login"
                className="rounded-[10px] border border-[#bd9144] bg-transparent px-7 py-3 text-sm font-medium text-[#292929] transition hover:bg-[#bd9144]/10"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
