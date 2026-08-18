import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Crown } from "lucide-react";
import MobileNav from "@/components/mobile-nav";
import UserAccountMenu from "@/components/user-account-menu";

export async function Navbar() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let admin = false;
  let owner = false;
  let profileName = user?.user_metadata?.name || user?.email?.split("@")[0] || "Account";
  let referralCode: string | null = null;
  let referralPoints = 0;

  if (user) {
    // The navbar must be able to see the user's role even when profiles RLS
    // only permits the user to read their own row. This is a server component,
    // so use the service-role client for this single authorization lookup.
    const profileClient = createAdminClient();
    const { data: profile } = await profileClient
      .from("profiles")
      .select("role,name,referral_code,referral_points")
      .eq("id", user.id)
      .maybeSingle();

    admin =
      profile?.role === "admin" ||
      profile?.role === "owner";

    owner = profile?.role === "owner";
    profileName = profile?.name || profileName;
    referralCode = profile?.referral_code || null;
    referralPoints = Number(profile?.referral_points || 0);

    // Older profiles may predate the referral-code migration. Generate the
    // same deterministic code used by the signup trigger so the link works
    // immediately instead of showing “Referral link unavailable”.
    if (!referralCode) {
      const generatedCode = `AK${user.id.replaceAll("-", "").slice(0, 8).toUpperCase()}`;
      const adminClient = createAdminClient();
      const { data: repairedProfile } = await adminClient
        .from("profiles")
        .update({ referral_code: generatedCode })
        .eq("id", user.id)
        .is("referral_code", null)
        .select("referral_code")
        .maybeSingle();

      referralCode = repairedProfile?.referral_code || generatedCode;
    }
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
          className="flex min-w-0 shrink items-center outline-none focus:outline-none focus-visible:outline-none"
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
              href={user ? "/book" : "/login?next=/book"}
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
              <>
                <UserAccountMenu
                  name={profileName}
                  referralCode={referralCode}
                  referralPoints={referralPoints}
                />
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
              </>
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

        <MobileNav
          user={Boolean(user)}
          admin={admin}
          owner={owner}
          name={profileName}
          referralCode={referralCode}
          referralPoints={referralPoints}
        />

      </nav>
    </header>
  );
}
