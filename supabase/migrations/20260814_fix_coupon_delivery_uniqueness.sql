/*
  Fix coupon email delivery uniqueness.

  A single coupon can be sent to many customers.

  The old migration incorrectly allowed only one
  delivery row per coupon.
*/

drop index if exists
public.coupon_email_deliveries_one_per_coupon_idx;

create unique index if not exists
coupon_email_deliveries_coupon_customer_unique
on public.coupon_email_deliveries(
  coupon_id,
  customer_id
)
where customer_id is not null;

create unique index if not exists
coupon_email_deliveries_coupon_email_unique
on public.coupon_email_deliveries(
  coupon_id,
  lower(email)
)
where customer_id is null;
