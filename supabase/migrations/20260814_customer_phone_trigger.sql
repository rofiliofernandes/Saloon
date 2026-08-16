/*
  Store customer phone number from Supabase Auth metadata
  when a new profile is created.
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
      trim(new.raw_user_meta_data->>'phone'),
      ''
    )
  );

  return new;
end;
$$;
