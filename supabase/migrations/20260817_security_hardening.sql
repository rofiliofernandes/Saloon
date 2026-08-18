/*
  Security hardening baseline.

  1. Ensure the auth.users -> profiles trigger exists. This is required for
     normal signups and administrator invitations.
  2. Keep privileged helper functions inaccessible to anonymous callers.
  3. Make the trigger function explicitly safe to execute with elevated
     privileges.
*/

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_referral_code text;
  v_referrer_id uuid;
  v_gender text;
begin
  v_referral_code := nullif(upper(trim(new.raw_user_meta_data->>'referral_code')), '');

  if v_referral_code is not null then
    select id into v_referrer_id
    from public.profiles
    where upper(referral_code) = v_referral_code
    limit 1;

    if v_referrer_id is null then
      raise exception 'Invalid referral code';
    end if;
  end if;

  v_gender := nullif(lower(trim(new.raw_user_meta_data->>'gender')), '');
  if v_gender is not null and v_gender not in ('male', 'female') then
    raise exception 'Invalid gender';
  end if;

  insert into public.profiles(id, name, email, phone, gender, referral_code, referred_by)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'Customer'),
    new.email,
    nullif(regexp_replace(coalesce(new.raw_user_meta_data->>'phone', ''), '\D', '', 'g'), ''),
    v_gender,
    'AK' || upper(substr(replace(new.id::text, '-', ''), 1, 8)),
    v_referrer_id
  )
  on conflict (id) do update
  set email = excluded.email;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon;
revoke all on function public.handle_new_user() from authenticated;

-- A previous migration recreated the function but did not recreate its trigger.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- These functions are only called by RLS/database internals or trusted APIs.
revoke all on function public.is_admin() from public;
revoke all on function public.is_admin() from anon;
revoke all on function public.is_admin() from authenticated;

grant execute on function public.is_admin() to authenticated;

