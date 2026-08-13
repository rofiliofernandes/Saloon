import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Crown, Menu, X } from "lucide-react";

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
      <nav className="mx-auto flex min-h-[78px] w-full max-w-[1500px] items-center justify-between px-4 sm:h-[88px] sm:px-6 lg:h-[104px] lg:px-12">

        {/* =====================================================
            BRAND
        ===================================================== */}

        <Link
          href="/"
          aria-label="AK Hair & Beauty Salon"
          className="flex min-w-0 shrink items-center"
        >
          <div className="relative flex h-[58px] w-[58px] shrink-0 items-end justify-center sm:h-[68px] sm:w-[68px] lg:h-[82px] lg:w-[82px]">
            <Crown
              size={23}
              strokeWidth={1.45}
              className="absolute left-1/2 top-0 -translate-x-1/2 text-[#b4862c] sm:size-[27px] lg:size-[31px]"
            />

            <span className="font-serif text-[35px] font-medium leading-none tracking-[-0.16em] text-[#a87820] sm:text-[41px] lg:text-[47px]">
              AK
            </span>
          </div>

          <div className="mx-2 h-[38px] w-px shrink-0 bg-[#b4862c]/35 sm:mx-3 sm:h-[44px] lg:mx-4 lg:h-[48px]" />

          <div className="flex min-w-0 flex-col justify-center">
            <span className="font-serif text-[24px] leading-none tracking-[0.025em] text-[#171717] sm:text-[27px] lg:text-[31px]">
              AK
            </span>

            <span className="mt-1 whitespace-nowrap text-[7px] font-medium uppercase tracking-[0.18em] text-[#a87820] sm:mt-1.5 sm:text-[8px] sm:tracking-[0.21em] lg:mt-2 lg:text-[9px] lg:tracking-[0.23em]">
              Hair &amp; Beauty Salon
            </span>
          </div>
        </Link>

        {/* =====================================================
            DESKTOP NAVIGATION
        ===================================================== */}

        <div className="ml-auto hidden items-center gap-10 md:flex">

          <div className="flex items-center gap-9 text-[15px] font-medium text-[#262626]">
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

          {/* DESKTOP ACTIONS */}

          <div className="flex items-center gap-3">

            {admin && (
              <Link
                href="/admin"
                className="rounded-[10px] bg-[#bd9144] px-7 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#a98038]"
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
                  className="whitespace-nowrap rounded-[10px] border border-[#bd9144] bg-transparent px-7 py-3 text-sm font-medium text-[#292929] transition hover:bg-[#bd9144]/10"
                >
                  Sign out
                </button>
              </form>
            ) : (
              <Link
                href="/login"
                className="whitespace-nowrap rounded-[10px] border border-[#bd9144] bg-transparent px-7 py-3 text-sm font-medium text-[#292929] transition hover:bg-[#bd9144]/10"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>

        {/* =====================================================
            MOBILE NAVIGATION
        ===================================================== */}

        <div className="ml-auto flex items-center gap-2 md:hidden">

          <details className="relative group">
            <summary
              aria-label="Open navigation menu"
              className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-[10px] border border-[#bd9144] text-[#292929] transition hover:bg-[#bd9144]/10 [&::-webkit-details-marker]:hidden"
            >
              <Menu
                size={20}
                className="group-open:hidden"
              />

              <X
                size={20}
                className="hidden group-open:block"
              />
            </summary>

            <div className="absolute right-0 top-14 w-64 overflow-hidden rounded-2xl border border-[#d8c4a0]/50 bg-[#faf8f4] p-2 shadow-xl">

              <Link
                href="/services"
                className="block rounded-xl px-4 py-3 text-sm font-medium text-[#262626] hover:bg-[#bd9144]/10"
              >
                Services
              </Link>

              <Link
                href="/stylists"
                className="block rounded-xl px-4 py-3 text-sm font-medium text-[#262626] hover:bg-[#bd9144]/10"
              >
                Stylists
              </Link>

              <Link
                href="/book"
                className="block rounded-xl px-4 py-3 text-sm font-medium text-[#262626] hover:bg-[#bd9144]/10"
              >
                Book
              </Link>

              {user && (
                <Link
                  href="/appointments"
                  className="block rounded-xl px-4 py-3 text-sm font-medium text-[#262626] hover:bg-[#bd9144]/10"
                >
                  Appointments
                </Link>
              )}

              {admin && (
                <Link
                  href="/admin"
                  className="block rounded-xl px-4 py-3 text-sm font-medium text-[#262626] hover:bg-[#bd9144]/10"
                >
                  Admin
                </Link>
              )}

              <div className="my-2 border-t border-[#d8c4a0]/40" />

              {user ? (
                <form
                  action="/api/auth/signout"
                  method="post"
                >
                  <button
                    type="submit"
                    className="block w-full rounded-xl px-4 py-3 text-left text-sm font-medium text-[#292929] hover:bg-[#bd9144]/10"
                  >
                    Sign out
                  </button>
                </form>
              ) : (
                <Link
                  href="/login"
                  className="block rounded-xl px-4 py-3 text-sm font-medium text-[#292929] hover:bg-[#bd9144]/10"
                >
                  Sign in
                </Link>
              )}
            </div>
          </details>

        </div>
      </nav>
    </header>
  );
}