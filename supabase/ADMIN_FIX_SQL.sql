-- LEGACY/MANUAL SCRIPT: production database changes must be applied through supabase/migrations. Do not run this file on an already-managed production database unless you have reviewed every statement.
-- Run this in Supabase SQL Editor if you are not using the migration runner.
-- It is safe to run repeatedly.

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
grant usage on schema storage to service_role;
grant select, insert, update, delete on storage.objects to service_role;
grant select on storage.buckets to service_role;

insert into storage.buckets (id, name, public)
values ('stylist-images', 'stylist-images', true)
on conflict (id) do update set public = true;
