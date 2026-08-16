/*
 * Customer phone numbers
 */

alter table public.profiles
add column if not exists phone text;

create index if not exists profiles_phone_idx
on public.profiles(phone);

/*
 * Keep phone from Supabase signup metadata
 * when a new customer account is created.
 */
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles(
    id,
    name,
    email,
    phone
  )
  values(
    new.id,
    coalesce(
      new.raw_user_meta_data->>'name',
      'Customer'
    ),
    new.email,
    nullif(
      regexp_replace(
        coalesce(
          new.raw_user_meta_data->>'phone',
          ''
        ),
        '\D',
        '',
        'g'
      ),
      ''
    )
  );

  return new;
end;
$$;
