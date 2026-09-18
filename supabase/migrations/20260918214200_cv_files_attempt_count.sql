-- Review-queue backend (#130): make repeated parse failures visible.
-- Additive only; cv_files RLS/no-public-policy stance from #110 is unaffected.

alter table public.cv_files
  add column attempt_count integer not null default 0,
  add column last_attempted_at timestamptz;
