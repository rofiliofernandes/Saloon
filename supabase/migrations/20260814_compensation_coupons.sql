/*
  Compensation coupons
  --------------------

  Supports:
  - customer-specific coupons
  - one-time coupons
  - automatic cancellation compensation
  - linking coupon to the appointment that caused it
*/

alter table public.coupons
  add column if not exists customer_id uuid
    references public.profiles(id)
    on delete cascade;

alter table public.coupons
  add column if not exists source text
    default 'manual';

alter table public.coupons
  add column if not exists source_appointment_id uuid
    references public.appointments(id)
    on delete set null;

alter table public.coupons
  add column if not exists reason text;

alter table public.coupons
  add column if not exists issued_at timestamptz
    default now();

alter table public.coupons
  add column if not exists redeemed_at timestamptz;

alter table public.coupons
  add constraint coupons_source_check
  check (
    source in (
      'manual',
      'stylist_cancellation',
      'automatic'
    )
  );

create index if not exists
coupons_customer_id_idx
on public.coupons(customer_id);

create index if not exists
coupons_source_appointment_id_idx
on public.coupons(source_appointment_id);

create index if not exists
coupons_expires_at_idx
on public.coupons(expires_at);

/*
  A stylist-cancellation can only generate
  one compensation coupon.
*/
create unique index if not exists
coupons_one_stylist_cancellation_coupon
on public.coupons(source_appointment_id)
where source = 'stylist_cancellation';

/*
  Customer-specific coupons are only valid
  for their assigned customer.
*/
create or replace function public.validate_customer_coupon(
  p_coupon_code text,
  p_customer_id uuid
)
returns public.coupons
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.coupons;
begin

  select *
  into c
  from public.coupons
  where upper(code) = upper(trim(p_coupon_code))
    and active = true
  for update;

  if not found then
    raise exception 'Invalid coupon';
  end if;

  if c.expires_at is not null
     and c.expires_at <= now() then
    raise exception 'Coupon expired';
  end if;

  if c.usage_limit is not null
     and c.used_count >= c.usage_limit then
    raise exception 'Coupon limit reached';
  end if;

  /*
    Customer-specific coupon.
  */
  if c.customer_id is not null
     and c.customer_id <> p_customer_id then
    raise exception 'This coupon is not valid for this customer';
  end if;

  return c;

end;
$$;

revoke all
on function public.validate_customer_coupon(text, uuid)
from public;

grant execute
on function public.validate_customer_coupon(text, uuid)
to authenticated;

/*
  Service-role access for Admin/server operations.
*/
grant select, insert, update, delete
on public.coupons
to service_role;
