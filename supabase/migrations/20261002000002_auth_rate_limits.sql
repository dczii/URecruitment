-- Shared atomic login limits. Buckets contain keyed hashes, never raw addresses/IPs.
create table public.auth_rate_limits (
  bucket text primary key,
  window_start timestamptz not null default now(),
  attempts integer not null default 0 check (attempts >= 0)
);
alter table public.auth_rate_limits enable row level security;
revoke all on table public.auth_rate_limits from anon, authenticated;

-- Service-role-only limiter. SECURITY DEFINER is needed for atomic private counters.
create function public.consume_auth_limit(bucket_key text, max_attempts integer, window_seconds integer)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare
  used integer;
  current_time_utc timestamptz := clock_timestamp();
begin
  if length(bucket_key) > 120 or max_attempts < 1 or max_attempts > 100
    or window_seconds < 1 or window_seconds > 3600 then
    raise exception 'Invalid auth limit configuration';
  end if;
  -- Bound storage without a cron. Largest supported window is one hour.
  delete from public.auth_rate_limits where window_start < current_time_utc - interval '2 hours';
  insert into public.auth_rate_limits(bucket, window_start, attempts)
  values (bucket_key, current_time_utc, 1)
  on conflict (bucket) do update set
    attempts = case when auth_rate_limits.window_start <= current_time_utc - make_interval(secs => window_seconds)
      then 1 else least(auth_rate_limits.attempts + 1, max_attempts + 1) end,
    window_start = case when auth_rate_limits.window_start <= current_time_utc - make_interval(secs => window_seconds)
      then current_time_utc else auth_rate_limits.window_start end
  returning attempts into used;
  return used <= max_attempts;
end;
$$;
revoke all on function public.consume_auth_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_auth_limit(text, integer, integer) to service_role;
