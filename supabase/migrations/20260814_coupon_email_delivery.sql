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
    check (status in ('pending', 'sent', 'failed')),

  provider text default 'resend',

  provider_message_id text,

  error_message text,

  sent_at timestamptz,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()
);

create index if not exists
coupon_email_deliveries_coupon_id_idx
on public.coupon_email_deliveries(coupon_id);

create index if not exists
coupon_email_deliveries_customer_id_idx
on public.coupon_email_deliveries(customer_id);

create index if not exists
coupon_email_deliveries_status_idx
on public.coupon_email_deliveries(status);

create unique index if not exists
coupon_email_deliveries_one_per_coupon_idx
on public.coupon_email_deliveries(coupon_id);
