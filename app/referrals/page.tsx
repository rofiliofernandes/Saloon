import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function ReferralsPage() {
  const s = await createClient();
  const {
    data: { user },
  } = await s.auth.getUser();

  if (!user) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-20">
        <h1 className="text-3xl font-semibold">Please sign in.</h1>
      </main>
    );
  }

  const { data: profile } = await s
    .from("profiles")
    .select("name,referral_code,referral_points")
    .eq("id", user.id)
    .maybeSingle();

  const { data: rewards, error } = await s
    .from("referral_rewards")
    .select("id,referred_customer_id,purchase_amount,reward_points,created_at")
    .eq("referrer_id", user.id)
    .order("created_at", { ascending: false });

  const referredIds = [...new Set((rewards || []).map((reward) => reward.referred_customer_id))];
  let referredProfiles: Array<{ id: string; name: string | null }> = [];

  if (referredIds.length) {
    const { data } = await s
      .from("profiles")
      .select("id,name")
      .in("id", referredIds);
    referredProfiles = data || [];
  }

  const profileById = new Map(referredProfiles.map((item) => [item.id, item]));
  const totalPoints = Number(profile?.referral_points || 0);

  return (
    <main className="mx-auto max-w-5xl px-6 py-14 sm:py-16">
      <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-900">
        ← Back to salon
      </Link>

      <p className="mt-10 text-xs uppercase tracking-[0.25em] text-neutral-400">
        Referral rewards
      </p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">Your referrals</h1>
      <p className="mt-2 max-w-2xl text-neutral-500">
        See the customers who used your referral code and the rewards they generated.
      </p>

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border bg-white p-6 shadow-sm">
          <p className="text-xs text-neutral-500">Referral code</p>
          <p className="mt-2 text-xl font-semibold tracking-wide">{profile?.referral_code || "Generating…"}</p>
        </div>
        <div className="rounded-3xl border bg-white p-6 shadow-sm">
          <p className="text-xs text-neutral-500">Referral points</p>
          <p className="mt-2 text-3xl font-semibold">{totalPoints}</p>
        </div>
        <div className="rounded-3xl border bg-white p-6 shadow-sm">
          <p className="text-xs text-neutral-500">People who earned rewards</p>
          <p className="mt-2 text-3xl font-semibold">{rewards?.length || 0}</p>
        </div>
      </section>

      <section className="mt-8 rounded-3xl border bg-white shadow-sm">
        <div className="border-b p-6">
          <h2 className="text-xl font-semibold">People who used your code</h2>
          <p className="mt-1 text-sm text-neutral-500">
            A person appears here after their first completed purchase creates a referral reward.
          </p>
        </div>

        {error ? (
          <div className="p-6 text-sm text-red-600">Unable to load referral history.</div>
        ) : rewards?.length ? (
          <div className="divide-y">
            {rewards.map((reward) => {
              const referred = profileById.get(reward.referred_customer_id);
              return (
                <div key={reward.id} className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium">{referred?.name || "Customer"}</p>
                    <p className="mt-1 text-xs text-neutral-400">Rewarded on {formatDate(reward.created_at)}</p>
                  </div>
                  <div className="shrink-0 sm:text-right">
                    <p className="font-semibold">+{reward.reward_points} points</p>
                    <p className="mt-1 text-xs text-neutral-500">Purchase ₹{Number(reward.purchase_amount).toFixed(2)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-10 text-center text-sm text-neutral-500">
            No completed referral rewards yet. Share your referral link to get started.
          </div>
        )}
      </section>
    </main>
  );
}
