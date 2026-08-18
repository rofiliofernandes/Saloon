/*
  Admin reliability + cancellation outreach history.

  - Makes owners count as admins for every admin RLS policy.
  - Ensures the event_name coupon column exists.
  - Gives the server service role explicit access to the tables used by
    admin cancellation/coupon workflows.
  - Persists copy/outreach progress so an admin can close the browser and
    continue later without losing their place.
*/

alter table public.coupons
  add column if not exists event_name text;

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

grant select, insert, update, delete on public.appointments to service_role;
grant select, insert, update, delete on public.stylists to service_role;
grant select, insert, update, delete on public.stylist_services to service_role;
grant select, insert, update, delete on public.profiles to service_role;
grant select, insert, update, delete on public.coupons to service_role;
grant select, insert, update, delete on public.audit_logs to service_role;

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

alter table public.coupon_outreach_history enable row level security;

drop policy if exists "coupon outreach admin" on public.coupon_outreach_history;
create policy "coupon outreach admin"
on public.coupon_outreach_history
for all
using (public.is_admin())
with check (public.is_admin());

grant select, insert, update, delete
on public.coupon_outreach_history
to service_role;
