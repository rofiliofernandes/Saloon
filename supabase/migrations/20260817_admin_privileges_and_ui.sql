/*
  Final admin privilege hardening.

  Admin API/page code is authenticated with requireAdmin() and then uses the
  server-only service-role client. Explicit grants prevent PostgREST from
  returning "permission denied for table ..." when table privileges have been
  tightened in the project.
*/

begin;

grant usage on schema public to service_role;

grant select, insert, update, delete on public.profiles to service_role;
grant select, insert, update, delete on public.appointments to service_role;
grant select, insert, update, delete on public.services to service_role;
grant select, insert, update, delete on public.service_categories to service_role;
grant select, insert, update, delete on public.service_options to service_role;
grant select, insert, update, delete on public.service_audiences to service_role;
grant select, insert, update, delete on public.stylists to service_role;
grant select, insert, update, delete on public.stylist_services to service_role;
grant select, insert, update, delete on public.working_hours to service_role;
grant select, insert, update, delete on public.blocked_periods to service_role;
grant select, insert, update, delete on public.coupons to service_role;
grant select, insert, update, delete on public.coupon_usage to service_role;
grant select, insert, update, delete on public.referral_rewards to service_role;
grant select, insert, update, delete on public.audit_logs to service_role;

grant usage, select on all sequences in schema public to service_role;

alter default privileges in schema public
  grant select, insert, update, delete on tables to service_role;
alter default privileges in schema public
  grant usage, select on sequences to service_role;

/* Storage is server-side for stylist photos. */
grant usage on schema storage to service_role;
grant select, insert, update, delete on storage.objects to service_role;
grant select on storage.buckets to service_role;

insert into storage.buckets (id, name, public)
values ('stylist-images', 'stylist-images', true)
on conflict (id) do update set public = true;

commit;
