/*
  Compensation coupon metadata.

  Links each compensation coupon to:
  - the cancelled appointment
  - the affected customer
  - the reason compensation was issued
*/

alter table public.coupons
add column if not exists compensation_appointment_id uuid
references public.appointments(id)
on delete set null;

alter table public.coupons
add column if not exists compensation_customer_id uuid
references public.profiles(id)
on delete set null;

alter table public.coupons
add column if not exists compensation_reason text;

create unique index if not exists
coupons_compensation_appointment_unique
on public.coupons(compensation_appointment_id)
where compensation_appointment_id is not null;

create index if not exists
coupons_compensation_customer_idx
on public.coupons(compensation_customer_id);
