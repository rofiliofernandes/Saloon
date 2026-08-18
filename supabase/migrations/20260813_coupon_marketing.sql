/*
  Coupon marketing support.

  Adds:
  - customer unsubscribe timestamp
  - per-recipient coupon email delivery log
*/

alter table public.profiles
add column if not exists marketing_unsubscribed_at timestamptz;

create table if not exists public.coupon_email_deliveries (
  id uuid primary key default gen_random_uuid(),

  coupon_id uuid not null
    references public.coupons(id)
    on delete cascade,

  customer_id uuid
    references public.profiles(id)
    on delete set null,

  email text not null,

  status text not null default 'pending'
    check (
      status in (
        'pending',
        'sent',
        'failed',
        'skipped'
      )
    ),

  resend_id text,

  error text,

  sent_at timestamptz,

  created_at timestamptz not null default now()
);

create index if not exists
coupon_email_deliveries_coupon_id_idx
on public.coupon_email_deliveries(coupon_id);

create index if not exists
coupon_email_deliveries_customer_id_idx
on public.coupon_email_deliveries(customer_id);

create index if not exists
coupon_email_deliveries_email_idx
on public.coupon_email_deliveries(email);

alter table public.coupon_email_deliveries
enable row level security;

/*
  Server-side service role access.
*/
grant select, insert, update, delete
on public.coupon_email_deliveries
to service_role;

grant select, update
on public.profiles
to service_role;
