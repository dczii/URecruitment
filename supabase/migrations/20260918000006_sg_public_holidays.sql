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
