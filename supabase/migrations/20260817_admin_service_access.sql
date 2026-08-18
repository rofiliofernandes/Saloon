/*
  Admin service-access hardening + stylist photo prerequisites.

  The admin API now performs service-catalogue and stylist-service reads/writes
  with the Supabase service-role client after the caller has been authenticated
  and authorized as an admin/owner. These grants keep the server-side client
  explicitly provisioned and make the migration safe to rerun.
*/

begin;

grant usage on schema public to service_role;
grant select, insert, update, delete on public.services to service_role;
grant select, insert, update, delete on public.service_categories to service_role;
grant select, insert, update, delete on public.service_options to service_role;
grant select, insert, update, delete on public.service_audiences to service_role;
grant select, insert, update, delete on public.stylist_services to service_role;
grant select, insert, update, delete on public.stylists to service_role;
grant usage, select on all sequences in schema public to service_role;

/* The photo bucket is public for customer-facing stylist profiles.
   Upload/update operations themselves are server-side only. */
insert into storage.buckets (id, name, public)
values ('stylist-images', 'stylist-images', true)
on conflict (id) do update set public = true;

commit;
