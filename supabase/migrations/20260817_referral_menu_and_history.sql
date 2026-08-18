/*
  Referral menu/history support.

  This migration is intentionally idempotent. It repairs older profiles that
  were created before referral codes were introduced and keeps the referral
  history readable by the referrer without exposing unrelated users.
*/

alter table public.profiles
  add column if not exists referral_code text;

alter table public.profiles
  add column if not exists referral_points integer not null default 0;

update public.profiles
set referral_code = 'AK' || upper(substr(replace(id::text, '-', ''), 1, 8))
where referral_code is null or btrim(referral_code) = '';

create unique index if not exists profiles_referral_code_unique
on public.profiles(upper(referral_code))
where referral_code is not null;

create table if not exists public.referral_rewards (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  referred_customer_id uuid not null references public.profiles(id) on delete cascade,
  appointment_id uuid not null references public.appointments(id) on delete restrict,
  purchase_amount numeric(10,2) not null check (purchase_amount >= 0),
  reward_points integer not null check (reward_points > 0),
  created_at timestamptz not null default now(),
  unique (referred_customer_id),
  unique (appointment_id)
);

create index if not exists referral_rewards_referrer_idx
on public.referral_rewards(referrer_id, created_at desc);

alter table public.referral_rewards enable row level security;

drop policy if exists "referral rewards customer read" on public.referral_rewards;
create policy "referral rewards customer read"
on public.referral_rewards
for select
to authenticated
using (referrer_id = auth.uid() or referred_customer_id = auth.uid() or public.is_admin());

grant select on public.referral_rewards to authenticated;
grant select, insert, update, delete on public.referral_rewards to service_role;
