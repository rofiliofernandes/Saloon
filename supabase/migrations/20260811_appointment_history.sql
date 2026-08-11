-- Preserve the original service price and discount information
-- for historical reporting.

alter table public.appointments
  add column if not exists base_price numeric(10,2),
  add column if not exists discount_amount numeric(10,2) not null default 0,
  add column if not exists coupon_code text,
  add column if not exists booking_source text not null default 'online',
  add column if not exists cancelled_by text,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancellation_reason text,
  add column if not exists completed_at timestamptz;

-- Keep booking sources controlled.
alter table public.appointments
  add constraint appointments_booking_source_check
  check (booking_source in ('online', 'walk_in', 'admin'));

-- Keep cancellation attribution controlled.
alter table public.appointments
  add constraint appointments_cancelled_by_check
  check (
    cancelled_by is null
    or cancelled_by in ('customer', 'admin')
  );

-- Existing appointments were already storing the final price.
-- For historical records, use the existing price as the best
-- available base price until we have a separate historical value.
update public.appointments
set base_price = price
where base_price is null;
