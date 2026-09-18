-- Singapore public holidays used for working-day counts (#115).
-- Recruiters maintain this list from Settings once E10-S02-T01 ships; this seed
-- is the MVP baseline for 2025–2027 (sample-data span + Dec 2026 launch).
-- In-lieu Mondays are included when a gazetted holiday falls on Sunday
-- (Employment Act: the following Monday is a public holiday). Saturday
-- holidays have no in-lieu day.

create table public.sg_public_holidays (
  date date primary key,
  name text not null,
  year integer not null
);

alter table public.sg_public_holidays enable row level security;
revoke all on table public.sg_public_holidays from anon, authenticated;

-- Gazetted dates. Islamic holidays (Hari Raya Puasa / Hari Raya Haji) are
-- subject to moon-sighting confirmation; 2025–2026 match the MOM lists as
-- published/observed. 2027 Islamic and Vesak dates are the best-known
-- astronomical/lunar equivalents pending the MOM 2027 gazette.
insert into public.sg_public_holidays (date, name, year) values
  -- 2025 (MOM public holidays 2025; Hari Raya Haji observed 6 Jun after moon sighting)
  ('2025-01-01', 'New Year''s Day', 2025),
  ('2025-01-29', 'Chinese New Year', 2025),
  ('2025-01-30', 'Chinese New Year', 2025),
  ('2025-03-31', 'Hari Raya Puasa', 2025),
  ('2025-04-18', 'Good Friday', 2025),
  ('2025-05-01', 'Labour Day', 2025),
  ('2025-05-12', 'Vesak Day', 2025),
  ('2025-06-06', 'Hari Raya Haji', 2025),
  ('2025-08-09', 'National Day', 2025),
  ('2025-10-20', 'Deepavali', 2025),
  ('2025-12-25', 'Christmas Day', 2025),
  -- 2026 (MOM public holidays 2026, including Sunday in-lieu Mondays)
  ('2026-01-01', 'New Year''s Day', 2026),
  ('2026-02-17', 'Chinese New Year', 2026),
  ('2026-02-18', 'Chinese New Year', 2026),
  ('2026-03-21', 'Hari Raya Puasa', 2026),
  ('2026-04-03', 'Good Friday', 2026),
  ('2026-05-01', 'Labour Day', 2026),
  ('2026-05-27', 'Hari Raya Haji', 2026),
  ('2026-05-31', 'Vesak Day', 2026),
  ('2026-06-01', 'Vesak Day (in lieu)', 2026),
  ('2026-08-09', 'National Day', 2026),
  ('2026-08-10', 'National Day (in lieu)', 2026),
  ('2026-11-08', 'Deepavali', 2026),
  ('2026-11-09', 'Deepavali (in lieu)', 2026),
  ('2026-12-25', 'Christmas Day', 2026),
  -- 2027 (fixed-date and lunar-calendar holidays; see comment above for Islamic/Vesak)
  ('2027-01-01', 'New Year''s Day', 2027),
  ('2027-02-06', 'Chinese New Year', 2027),
  ('2027-02-07', 'Chinese New Year', 2027),
  ('2027-02-08', 'Chinese New Year (in lieu)', 2027),
  ('2027-03-10', 'Hari Raya Puasa', 2027),
  ('2027-03-26', 'Good Friday', 2027),
  ('2027-05-01', 'Labour Day', 2027),
  ('2027-05-17', 'Hari Raya Haji', 2027),
  ('2027-05-20', 'Vesak Day', 2027),
  ('2027-08-09', 'National Day', 2027),
  ('2027-10-29', 'Deepavali', 2027),
  ('2027-12-25', 'Christmas Day', 2027)
on conflict (date) do nothing;

-- Working-day arithmetic for the future delay-status view (#116).
-- Mirrors src/lib/working-days.ts. Day boundaries use Asia/Singapore
-- (fixed UTC+8, no DST). A working day is counted as elapsed only once
-- the SGT local-midnight boundary has been crossed; partial days are
-- not rounded up. Weekends (Sat/Sun) and rows in sg_public_holidays
-- are skipped; there is no other day-skipping rule.
--
-- Called later by the pipeline_status view. security invoker so RLS on
-- sg_public_holidays is respected by the caller; stable because these
-- are pure reads of the holiday table.

-- Elapsed working days in the half-open SGT-date range [from, to).
-- Signature: sg_working_days_between(from_utc timestamptz, to_utc timestamptz)
--   → integer  (same semantics as workingDaysElapsed)
create function public.sg_working_days_between(
  from_utc timestamptz,
  to_utc timestamptz
)
returns integer
language sql
stable
security invoker
set search_path = public
as $$
  select count(*)::integer
  from generate_series(
    (from_utc at time zone 'Asia/Singapore')::date,
    (to_utc at time zone 'Asia/Singapore')::date - 1,
    interval '1 day'
  ) as gs(d)
  where extract(isodow from gs.d) between 1 and 5
    and not exists (
      select 1
      from public.sg_public_holidays h
      where h.date = gs.d::date
    );
$$;

comment on function public.sg_working_days_between(timestamptz, timestamptz) is
  'Count of Mon–Fri Asia/Singapore calendar dates in [from_utc, to_utc) that are not in sg_public_holidays. A working day counts as elapsed only once SGT local midnight has been crossed; partial days are not rounded up. Mirror of workingDaysElapsed in src/lib/working-days.ts.';

-- SGT-local midnight, `days` Singapore working days after from_utc.
-- Signature: sg_add_working_days(from_utc timestamptz, days integer)
--   → timestamptz  (same semantics as addWorkingDays)
create function public.sg_add_working_days(
  from_utc timestamptz,
  days integer
)
returns timestamptz
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  cursor_date date;
  remaining integer;
begin
  cursor_date := (from_utc at time zone 'Asia/Singapore')::date;
  remaining := days;
  while remaining > 0 loop
    cursor_date := cursor_date + 1;
    if extract(isodow from cursor_date) between 1 and 5
       and not exists (
         select 1
         from public.sg_public_holidays h
         where h.date = cursor_date
       )
    then
      remaining := remaining - 1;
    end if;
  end loop;
  -- Interpret midnight on the landing SGT date as Asia/Singapore, yielding
  -- the UTC instant (00:00 SGT = 16:00 UTC of the previous UTC calendar day).
  return (cursor_date::timestamp at time zone 'Asia/Singapore');
end;
$$;

comment on function public.sg_add_working_days(timestamptz, integer) is
  'UTC instant of SGT-local midnight `days` Singapore working days after from_utc. The from-date itself is not counted; weekends and sg_public_holidays are skipped. Mirror of addWorkingDays in src/lib/working-days.ts.';

revoke all on function public.sg_working_days_between(timestamptz, timestamptz)
  from public, anon, authenticated;
revoke all on function public.sg_add_working_days(timestamptz, integer)
  from public, anon, authenticated;
