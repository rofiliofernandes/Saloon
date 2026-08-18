/* Distributed API rate limiting for horizontally scaled deployments. */

create table if not exists public.api_rate_limits (
  key text not null,
  window_start timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  primary key (key, window_start)
);

alter table public.api_rate_limits enable row level security;
revoke all on public.api_rate_limits from public;
revoke all on public.api_rate_limits from anon;
revoke all on public.api_rate_limits from authenticated;
grant select, insert, update, delete on public.api_rate_limits to service_role;

create or replace function public.check_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_window_start timestamptz;
  v_count integer;
begin
  if p_limit < 1 or p_window_seconds < 1 or length(coalesce(p_key, '')) < 16 then
    raise exception 'Invalid rate limit parameters';
  end if;

  v_window_start := to_timestamp(
    floor(extract(epoch from clock_timestamp()) / p_window_seconds) * p_window_seconds
  );

  insert into public.api_rate_limits(key, window_start, request_count)
  values (p_key, v_window_start, 1)
  on conflict (key, window_start)
  do update set request_count = public.api_rate_limits.request_count + 1
  returning request_count into v_count;

  -- Opportunistic cleanup keeps the table bounded without requiring pg_cron.
  delete from public.api_rate_limits
  where window_start < clock_timestamp() - interval '2 days';

  return v_count <= p_limit;
end;
$$;

revoke all on function public.check_rate_limit(text, integer, integer) from public;
revoke all on function public.check_rate_limit(text, integer, integer) from anon;
revoke all on function public.check_rate_limit(text, integer, integer) from authenticated;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;
