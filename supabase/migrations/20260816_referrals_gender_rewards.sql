/*
  Customer profile + referral rewards.

  Reward model:
  - 5% of the referred customer's first completed purchase is awarded.
  - 2 points = ₹1 salon credit.
  - Example: ₹500 purchase -> ₹25 credit -> 50 points.
*/

alter table public.profiles
  add column if not exists gender text;

alter table public.profiles
  add column if not exists referral_code text;

alter table public.profiles
  add column if not exists referred_by uuid
    references public.profiles(id)
    on delete set null;

alter table public.profiles
  add column if not exists referral_points integer not null default 0;

alter table public.profiles
  drop constraint if exists profiles_gender_check;

alter table public.profiles
  add constraint profiles_gender_check
  check (gender is null or gender in ('male', 'female'));

alter table public.profiles
  drop constraint if exists profiles_referral_points_check;

alter table public.profiles
  add constraint profiles_referral_points_check
  check (referral_points >= 0);

/* Give existing customers a referral code. */
update public.profiles
set referral_code = 'AK' || upper(substr(replace(id::text, '-', ''), 1, 8))
where referral_code is null;

create unique index if not exists profiles_referral_code_unique
on public.profiles(upper(referral_code))
where referral_code is not null;

create index if not exists profiles_referred_by_idx
on public.profiles(referred_by);

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

create policy "referral rewards customer read"
on public.referral_rewards
for select
using (referrer_id = auth.uid() or referred_customer_id = auth.uid() or public.is_admin());

create policy "referral rewards admin all"
on public.referral_rewards
for all
using (public.is_admin())
with check (public.is_admin());

grant select on public.referral_rewards to authenticated;
grant select, insert, update, delete on public.referral_rewards to service_role;

/*
  Add referral as a supported coupon source.
*/
alter table public.coupons
  drop constraint if exists coupons_source_check;

alter table public.coupons
  add constraint coupons_source_check
  check (
    source in (
      'manual',
      'stylist_cancellation',
      'automatic',
      'referral'
    )
  );

/*
  Signup trigger.

  A referral code is validated inside the database, so a client
  cannot attach a fake/non-existent referrer to an account.
*/
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referral_code text;
  v_referrer_id uuid;
  v_gender text;
begin
  v_referral_code := nullif(
    upper(trim(new.raw_user_meta_data->>'referral_code')),
    ''
  );

  if v_referral_code is not null then
    select id
    into v_referrer_id
    from public.profiles
    where upper(referral_code) = v_referral_code
    limit 1;

    if v_referrer_id is null then
      raise exception 'Invalid referral code';
    end if;
  end if;

  v_gender := nullif(
    lower(trim(new.raw_user_meta_data->>'gender')),
    ''
  );

  if v_gender is not null and v_gender not in ('male', 'female') then
    raise exception 'Invalid gender';
  end if;

  insert into public.profiles(
    id,
    name,
    email,
    phone,
    gender,
    referral_code,
    referred_by
  )
  values(
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'Customer'),
    new.email,
    nullif(
      regexp_replace(
        coalesce(new.raw_user_meta_data->>'phone', ''),
        '\D',
        '',
        'g'
      ),
      ''
    ),
    v_gender,
    'AK' || upper(substr(replace(new.id::text, '-', ''), 1, 8)),
    v_referrer_id
  );

  return new;
end;
$$;

/*
  Award the referral exactly once when the referred customer's
  first appointment becomes completed.
*/
create or replace function public.award_referral_reward()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referrer_id uuid;
  v_points integer;
  v_purchase numeric(10,2);
begin
  if new.status <> 'completed' or old.status = 'completed' then
    return new;
  end if;

  if new.customer_id is null then
    return new;
  end if;

  select referred_by
  into v_referrer_id
  from public.profiles
  where id = new.customer_id;

  if v_referrer_id is null then
    return new;
  end if;

  /* One reward per referred customer: their first completed purchase only. */
  if exists (
    select 1
    from public.referral_rewards
    where referred_customer_id = new.customer_id
  ) then
    return new;
  end if;

  v_purchase := greatest(coalesce(new.price, 0), 0);

  /* 5% of ₹ value, represented as 2 points per ₹1. */
  v_points := round(v_purchase * 0.05 * 2);

  if v_points <= 0 then
    return new;
  end if;

  insert into public.referral_rewards(
    referrer_id,
    referred_customer_id,
    appointment_id,
    purchase_amount,
    reward_points
  )
  values(
    v_referrer_id,
    new.customer_id,
    new.id,
    v_purchase,
    v_points
  )
  on conflict (referred_customer_id) do nothing;

  if found then
    update public.profiles
    set referral_points = referral_points + v_points
    where id = v_referrer_id;
  end if;

  return new;
end;
$$;

revoke all on function public.award_referral_reward() from public;
grant execute on function public.award_referral_reward() to service_role;

drop trigger if exists appointment_referral_reward on public.appointments;

create trigger appointment_referral_reward
after update of status on public.appointments
for each row
when (new.status = 'completed' and old.status is distinct from new.status)
execute function public.award_referral_reward();

/*
  Convert referral points into a customer-specific salon-credit coupon.
  2 points = ₹1.
*/
create table if not exists public.referral_redemptions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  points_redeemed integer not null check (points_redeemed > 0),
  credit_amount numeric(10,2) not null check (credit_amount > 0),
  coupon_id uuid not null references public.coupons(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists referral_redemptions_customer_idx
on public.referral_redemptions(customer_id, created_at desc);

alter table public.referral_redemptions enable row level security;

create policy "referral redemptions customer read"
on public.referral_redemptions
for select
using (customer_id = auth.uid() or public.is_admin());

grant select on public.referral_redemptions to authenticated;
grant select, insert, update, delete on public.referral_redemptions to service_role;

create or replace function public.redeem_referral_points(
  p_customer_id uuid,
  p_points integer
)
returns public.coupons
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_points integer;
  v_amount numeric(10,2);
  v_coupon public.coupons;
  v_code text;
begin
  if auth.uid() is null or auth.uid() <> p_customer_id then
    raise exception 'Not authorized';
  end if;

  if p_points is null or p_points <= 0 then
    raise exception 'Points must be a positive whole number';
  end if;

  select referral_points
  into v_points
  from public.profiles
  where id = p_customer_id
  for update;

  if v_points is null then
    raise exception 'Customer not found';
  end if;

  if v_points < p_points then
    raise exception 'Not enough referral points';
  end if;

  v_amount := p_points / 2.0;
  v_code := 'REF-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

  insert into public.coupons(
    code,
    discount_type,
    discount_value,
    minimum_amount,
    usage_limit,
    used_count,
    expires_at,
    active,
    customer_id,
    source,
    reason
  )
  values(
    v_code,
    'fixed',
    v_amount,
    0,
    1,
    0,
    now() + interval '90 days',
    true,
    p_customer_id,
    'referral',
    'Referral reward redemption'
  )
  returning * into v_coupon;

  update public.profiles
  set referral_points = referral_points - p_points
  where id = p_customer_id;

  insert into public.referral_redemptions(
    customer_id,
    points_redeemed,
    credit_amount,
    coupon_id
  )
  values(
    p_customer_id,
    p_points,
    v_amount,
    v_coupon.id
  );

  return v_coupon;
end;
$$;

revoke all on function public.redeem_referral_points(uuid, integer) from public;
grant execute on function public.redeem_referral_points(uuid, integer) to authenticated;
grant execute on function public.redeem_referral_points(uuid, integer) to service_role;
