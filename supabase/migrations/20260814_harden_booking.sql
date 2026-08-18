/*
============================================================
AK HAIR & BEAUTY SALON
HARDEN BOOKING ENGINE

This migration:

1. Adds service-option-aware booking.
2. Validates service options.
3. Uses option price + duration.
4. Validates stylist/service compatibility.
5. Validates future appointments.
6. Validates stylist working hours.
7. Validates salon closures.
8. Validates blocked periods.
9. Validates coupons.
10. Preserves historical pricing.
11. Keeps PostgreSQL overlap protection.
12. Keeps the old 5-argument RPC working by routing it
    through the new secure booking engine.

Business timezone:
    Asia/Kolkata

Existing appointments are not modified.
============================================================
*/


/*
============================================================
1. NEW BOOKING RPC
============================================================
*/

create or replace function public.create_appointment(
  p_customer_id uuid,
  p_service_id uuid,
  p_stylist_id uuid,
  p_service_option_id uuid,
  p_start_time timestamptz,
  p_coupon_code text default null
)
returns public.appointments
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare

  v_service public.services;
  v_stylist public.stylists;
  v_option public.service_options;
  v_coupon public.coupons;
  v_appointment public.appointments;

  v_end_time timestamptz;

  v_local_start timestamp;
  v_local_end timestamp;

  v_local_date date;
  v_day_of_week integer;

  v_base_price numeric(10,2);
  v_final_price numeric(10,2);
  v_discount_amount numeric(10,2) := 0;

  v_applied_coupon_code text := null;

begin

  /*
  ----------------------------------------------------------
  AUTHORIZATION
  ----------------------------------------------------------
  */

  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if auth.uid() <> p_customer_id then
    raise exception 'Not authorized';
  end if;


  /*
  ----------------------------------------------------------
  BASIC INPUT VALIDATION
  ----------------------------------------------------------
  */

  if p_service_id is null then
    raise exception 'Service is required';
  end if;

  if p_stylist_id is null then
    raise exception 'Stylist is required';
  end if;

  if p_service_option_id is null then
    raise exception 'Service option is required';
  end if;

  if p_start_time is null then
    raise exception 'Appointment time is required';
  end if;

  if p_start_time <= now() then
    raise exception 'Appointment must be in the future';
  end if;


  /*
  ----------------------------------------------------------
  SERVICE
  ----------------------------------------------------------
  */

  select *
  into v_service
  from public.services
  where id = p_service_id
    and active = true
    and deleted_at is null;

  if not found then
    raise exception 'Service unavailable';
  end if;


  /*
  ----------------------------------------------------------
  STYLIST
  ----------------------------------------------------------
  */

  select *
  into v_stylist
  from public.stylists
  where id = p_stylist_id
    and active = true
    and deleted_at is null;

  if not found then
    raise exception 'Stylist unavailable';
  end if;


  /*
  ----------------------------------------------------------
  STYLIST / SERVICE COMPATIBILITY
  ----------------------------------------------------------
  */

  if not exists (
    select 1
    from public.stylist_services ss
    where ss.stylist_id = p_stylist_id
      and ss.service_id = p_service_id
  ) then

    raise exception
      'Stylist does not provide this service';

  end if;


  /*
  ----------------------------------------------------------
  SERVICE OPTION
  ----------------------------------------------------------

  The option must:

  - exist
  - belong to the selected service
  - be active

  The appointment will use the option's price and
  duration instead of the legacy service values.
  ----------------------------------------------------------
  */

  select *
  into v_option
  from public.service_options
  where id = p_service_option_id
    and service_id = p_service_id
    and active = true;

  if not found then
    raise exception
      'Selected service option is unavailable';
  end if;


  /*
  ----------------------------------------------------------
  CALCULATE END TIME
  ----------------------------------------------------------
  */

  v_end_time :=
    p_start_time
    + make_interval(
        mins => v_option.duration_minutes
      );


  /*
  ----------------------------------------------------------
  CONVERT TO SALON LOCAL TIME
  ----------------------------------------------------------

  The salon operates in Asia/Kolkata.

  timestamptz is kept for the actual appointment,
  while working-hours/closure checks use local salon time.
  ----------------------------------------------------------
  */

  v_local_start :=
    p_start_time at time zone 'Asia/Kolkata';

  v_local_end :=
    v_end_time at time zone 'Asia/Kolkata';

  v_local_date :=
    v_local_start::date;

  v_day_of_week :=
    extract(
      dow from v_local_start
    )::integer;


  /*
  ----------------------------------------------------------
  DO NOT ALLOW AN APPOINTMENT TO CROSS LOCAL MIDNIGHT
  ----------------------------------------------------------
  */

  if v_local_start::date <> v_local_end::date then
    raise exception
      'Appointment cannot cross midnight';
  end if;


  /*
  ----------------------------------------------------------
  SALON CLOSURE
  ----------------------------------------------------------

  close_time IS NULL
      = salon completely closed that day

  close_time IS NOT NULL
      = salon is closed from midnight through close_time

  Example:

      closure_date = 2026-08-20
      close_time   = 14:00

  A booking ending after 14:00 is rejected.
  ----------------------------------------------------------
  */

  if exists (
    select 1
    from public.salon_closures sc
    where sc.closure_date = v_local_date
      and (
        sc.close_time is null
        or v_local_end::time > sc.close_time
      )
  ) then

    raise exception
      'The salon is closed at that time';

  end if;


  /*
  ----------------------------------------------------------
  STYLIST WORKING HOURS
  ----------------------------------------------------------

  The entire appointment must fit inside at least one
  working-hours interval.

  Example:

      Working hours: 10:00 - 18:00

      Booking: 17:30 - 18:30

  Rejected.

  Booking: 17:00 - 18:00

  Accepted.
  ----------------------------------------------------------
  */

  if not exists (
    select 1
    from public.working_hours wh
    where wh.stylist_id = p_stylist_id
      and wh.day_of_week = v_day_of_week
      and v_local_start::time >= wh.start_time
      and v_local_end::time <= wh.end_time
  ) then

    raise exception
      'The stylist is not working during that time';

  end if;


  /*
  ----------------------------------------------------------
  BLOCKED PERIODS
  ----------------------------------------------------------

  Blocks can belong to:

      specific stylist

  OR:

      entire salon
  ----------------------------------------------------------
  */

  if exists (
    select 1
    from public.blocked_periods bp
    where (
      bp.stylist_id = p_stylist_id
      or bp.stylist_id is null
    )
    and tstzrange(
      bp.start_time,
      bp.end_time,
      '[)'
    )
    &&
    tstzrange(
      p_start_time,
      v_end_time,
      '[)'
    )
  ) then

    raise exception
      'That period is blocked';

  end if;


  /*
  ----------------------------------------------------------
  PRICE
  ----------------------------------------------------------

  IMPORTANT:

  We deliberately use the service option's price.

  Example:

      Service:
          Hair Colour

      Option:
          Premium

      Option price:
          ₹800

      Option duration:
          60 minutes

  The appointment stores ₹800 and 60 minutes.
  ----------------------------------------------------------
  */

  v_base_price :=
    v_option.price;

  v_final_price :=
    v_base_price;


  /*
  ----------------------------------------------------------
  COUPON
  ----------------------------------------------------------
  */

  if p_coupon_code is not null
     and trim(p_coupon_code) <> '' then

    select *
    into v_coupon
    from public.coupons
    where upper(code) = upper(trim(p_coupon_code))
      and active = true
      and (
        expires_at is null
        or expires_at > now()
      )
    for update;


    if not found then
      raise exception 'Invalid coupon';
    end if;


    /*
    Customer-specific coupons.

    If customer_id exists and is populated,
    the coupon belongs to that customer.
    */

    if v_coupon.customer_id is not null
       and v_coupon.customer_id <> p_customer_id then

      raise exception
        'This coupon is not valid for this customer';

    end if;


    /*
    Minimum booking amount.
    */

    if v_base_price < coalesce(
      v_coupon.minimum_amount,
      0
    ) then

      raise exception
        'Minimum booking amount not met';

    end if;


    /*
    Global usage limit.
    */

    if v_coupon.usage_limit is not null
       and v_coupon.used_count >= v_coupon.usage_limit then

      raise exception
        'Coupon limit reached';

    end if;


    /*
    Calculate discount.
    */

    v_applied_coupon_code :=
      v_coupon.code;


    if v_coupon.discount_type = 'percentage' then

      v_discount_amount :=
        round(
          v_base_price
          * v_coupon.discount_value
          / 100,
          2
        );

    else

      v_discount_amount :=
        v_coupon.discount_value;

    end if;


    /*
    Never allow discount to exceed price.
    */

    v_discount_amount :=
      least(
        v_discount_amount,
        v_base_price
      );


    v_final_price :=
      greatest(
        0,
        v_base_price - v_discount_amount
      );

  end if;


  /*
  ----------------------------------------------------------
  CREATE APPOINTMENT
  ----------------------------------------------------------
  */

  insert into public.appointments(
    customer_id,
    stylist_id,
    service_id,
    service_option_id,

    start_time,
    end_time,

    base_price,
    discount_amount,
    price,

    coupon_id,
    coupon_code,

    booking_source
  )
  values(
    p_customer_id,
    p_stylist_id,
    p_service_id,
    p_service_option_id,

    p_start_time,
    v_end_time,

    v_base_price,
    v_discount_amount,
    v_final_price,

    case
      when v_coupon.id is not null
      then v_coupon.id
      else null
    end,

    v_applied_coupon_code,

    'online'
  )
  returning *
  into v_appointment;


  /*
  ----------------------------------------------------------
  COUPON USAGE
  ----------------------------------------------------------
  */

  if v_coupon.id is not null then

    update public.coupons
    set used_count =
      coalesce(used_count, 0) + 1
    where id = v_coupon.id;


    insert into public.coupon_usage(
      coupon_id,
      customer_id,
      appointment_id
    )
    values(
      v_coupon.id,
      p_customer_id,
      v_appointment.id
    );

  end if;


  /*
  ----------------------------------------------------------
  RETURN
  ----------------------------------------------------------
  */

  return v_appointment;


exception

  /*
  PostgreSQL exclusion constraint catches a race where
  another customer books the same stylist/time between
  our validation and INSERT.
  */

  when exclusion_violation then

    raise exception
      'That slot was just booked. Please choose another time.';

end;
$$;


/*
============================================================
2. KEEP THE OLD 5-ARGUMENT RPC SAFE
============================================================

The current website still calls the old function.

Instead of leaving the old vulnerable implementation
in place, route it through the new booking engine.

It automatically selects the first active option.

This is temporary compatibility for the old UI.

The booking UI will be updated next to explicitly send
service_option_id.
============================================================
*/

create or replace function public.create_appointment(
  p_customer_id uuid,
  p_service_id uuid,
  p_stylist_id uuid,
  p_start_time timestamptz,
  p_coupon_code text default null
)
returns public.appointments
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_option_id uuid;
begin

  select so.id
  into v_option_id
  from public.service_options so
  where so.service_id = p_service_id
    and so.active = true
  order by
    so.display_order asc,
    so.created_at asc
  limit 1;


  if v_option_id is null then
    raise exception
      'No active service option is available';
  end if;


  return public.create_appointment(
    p_customer_id,
    p_service_id,
    p_stylist_id,
    v_option_id,
    p_start_time,
    p_coupon_code
  );

end;
$$;


/*
============================================================
3. FUNCTION PERMISSIONS
============================================================
*/

revoke all on function public.create_appointment(
  uuid,
  uuid,
  uuid,
  uuid,
  timestamptz,
  text
)
from public;


revoke all on function public.create_appointment(
  uuid,
  uuid,
  uuid,
  timestamptz,
  text
)
from public;


grant execute on function public.create_appointment(
  uuid,
  uuid,
  uuid,
  uuid,
  timestamptz,
  text
)
to authenticated;


grant execute on function public.create_appointment(
  uuid,
  uuid,
  uuid,
  timestamptz,
  text
)
to authenticated;


/*
============================================================
4. INDEXES FOR BOOKING VALIDATION
============================================================
*/

create index if not exists
working_hours_stylist_day_idx
on public.working_hours(
  stylist_id,
  day_of_week,
  start_time,
  end_time
);


create index if not exists
blocked_periods_stylist_time_idx
on public.blocked_periods(
  stylist_id,
  start_time,
  end_time
);


create index if not exists
salon_closures_date_idx
on public.salon_closures(
  closure_date
);


create index if not exists
coupon_usage_customer_coupon_idx
on public.coupon_usage(
  customer_id,
  coupon_id
);


/*
============================================================
END
============================================================
*/
