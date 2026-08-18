/*
  Add owner role.

  Existing roles:
    customer
    admin

  New role:
    owner
*/

alter type public.user_role
add value if not exists 'owner';


/*
  Owners are administrators too.

  This keeps all existing admin RLS policies working
  for both admin and owner accounts.
*/
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
