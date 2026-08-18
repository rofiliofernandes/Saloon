-- Customer/admin appointment cancellation and lifecycle helpers.

-- Customer cancellation:
-- - Only the appointment owner can use it.
-- - Only confirmed appointments can be cancelled.
-- - Cancellation must happen more than 1 hour before start_time.
-- - The function records who cancelled it.

create or replace function public.cancel_appointment(
  p_appointment_id uuid,
  p_reason text default null
)
returns public.appointments
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.appointments;
begin

  select *
  into a
  from appointments
  where id = p_appointment_id
  for update;

  if not found then
    raise exception 'Appointment not found';
  end if;

  if a.customer_id <> auth.uid() then
    raise exception 'Not authorized';
  end if;

  if a.status <> 'confirmed' then
    raise exception 'Only confirmed appointments can be cancelled';
  end if;

  if a.start_time <= now() + interval '1 hour' then
    raise exception 'Appointments can only be cancelled more than 1 hour in advance';
  end if;

  update appointments
  set
    status = 'cancelled',
    cancelled_by = 'customer',
    cancelled_at = now(),
    cancellation_reason = nullif(trim(p_reason), '')
  where id = p_appointment_id
  returning * into a;

  return a;
end;
$$;

revoke all on function public.cancel_appointment(uuid, text) from public;

grant execute
on function public.cancel_appointment(uuid, text)
to authenticated;


-- Admin cancellation:
-- Admins can cancel confirmed appointments regardless of
-- the one-hour customer restriction.

create or replace function public.admin_cancel_appointment(
  p_appointment_id uuid,
  p_reason text default null
)
returns public.appointments
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.appointments;
begin

  if not public.is_admin() then
    raise exception 'FORBIDDEN';
  end if;

  select *
  into a
  from appointments
  where id = p_appointment_id
  for update;

  if not found then
    raise exception 'Appointment not found';
  end if;

  if a.status <> 'confirmed' then
    raise exception 'Only confirmed appointments can be cancelled';
  end if;

  update appointments
  set
    status = 'cancelled',
    cancelled_by = 'admin',
    cancelled_at = now(),
    cancellation_reason = nullif(trim(p_reason), '')
  where id = p_appointment_id
  returning * into a;

  return a;
end;
$$;

revoke all on function public.admin_cancel_appointment(uuid, text) from public;

grant execute
on function public.admin_cancel_appointment(uuid, text)
to authenticated;
