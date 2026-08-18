/*
  FINAL ADMIN DATA FIX
  --------------------
  Run this migration once in Supabase SQL Editor for an existing project.

  Fixes:
  - missing stylists.image_url
  - missing coupons.event_name
  - missing coupon_outreach_history
  - owner/admin access to appointments and admin tables
  - service-role table grants used by server-side admin APIs

  All statements are idempotent and safe to run more than once.
*/

begin;

/* Required columns used by the current application. */
alter table public.stylists
  add column if not exists image_url text;

alter table public.coupons
  add column if not exists event_name text;

alter table public.coupons
  add column if not exists source text default 'manual';

alter table public.coupons
  add column if not exists reason text;

alter table public.coupons
  add column if not exists customer_id uuid references public.profiles(id) on delete cascade;

alter table public.coupons
  add column if not exists source_appointment_id uuid references public.appointments(id) on delete set null;

alter table public.coupons
  add column if not exists issued_at timestamptz default now();

alter table public.coupons
  add column if not exists redeemed_at timestamptz;

/* Compensation metadata used by cancellation recovery. */
alter table public.coupons
  add column if not exists compensation_appointment_id uuid references public.appointments(id) on delete set null;

alter table public.coupons
  add column if not exists compensation_customer_id uuid references public.profiles(id) on delete set null;

alter table public.coupons
  add column if not exists compensation_reason text;

/* Keep coupon source values compatible with all current coupon features. */
alter table public.coupons
  drop constraint if exists coupons_source_check;

alter table public.coupons
  add constraint coupons_source_check
  check (source in ('manual', 'stylist_cancellation', 'festival_event', 'automatic'));

create index if not exists coupons_customer_id_idx
  on public.coupons(customer_id);

create index if not exists coupons_source_appointment_id_idx
  on public.coupons(source_appointment_id);

create index if not exists coupons_expires_at_idx
  on public.coupons(expires_at);

create index if not exists coupons_source_created_at_idx
  on public.coupons(source, created_at desc);

create unique index if not exists coupons_one_stylist_cancellation_coupon
  on public.coupons(source_appointment_id)
  where source = 'stylist_cancellation';

/* Persistent outreach/copy history. */
create table if not exists public.coupon_outreach_history (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  phone_copied_at timestamptz,
  message_copied_at timestamptz,
  whatsapp_opened_at timestamptz,
  last_action text,
  updated_at timestamptz not null default now(),
  unique(coupon_id)
);

create index if not exists coupon_outreach_history_updated_idx
  on public.coupon_outreach_history(updated_at desc);

/* Admin/owner authorization helper. */
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('admin', 'owner')
  );
$$;

/* Ensure RLS is enabled on the sensitive tables. */
alter table public.profiles enable row level security;
alter table public.stylists enable row level security;
alter table public.stylist_services enable row level security;
alter table public.appointments enable row level security;
alter table public.coupons enable row level security;
alter table public.coupon_outreach_history enable row level security;
alter table public.audit_logs enable row level security;

/* Explicit admin policies. Existing policies are replaced only where needed. */
drop policy if exists "stylists admin write" on public.stylists;
create policy "stylists admin write"
on public.stylists
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "appointments admin select" on public.appointments;
create policy "appointments admin select"
on public.appointments
for select
using (customer_id = auth.uid() or public.is_admin());

drop policy if exists "appointments admin update" on public.appointments;
create policy "appointments admin update"
on public.appointments
for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "coupon outreach admin" on public.coupon_outreach_history;
create policy "coupon outreach admin"
on public.coupon_outreach_history
for all
using (public.is_admin())
with check (public.is_admin());

/* Server-side service-role access used by Next.js admin APIs. */
grant usage on schema public to service_role;
grant select, insert, update, delete on public.appointments to service_role;
grant select, insert, update, delete on public.stylists to service_role;
grant select, insert, update, delete on public.stylist_services to service_role;
grant select, insert, update, delete on public.profiles to service_role;
grant select, insert, update, delete on public.coupons to service_role;
grant select, insert, update, delete on public.coupon_outreach_history to service_role;
grant select, insert, update, delete on public.audit_logs to service_role;

grant usage, select on all sequences in schema public to service_role;

commit;
