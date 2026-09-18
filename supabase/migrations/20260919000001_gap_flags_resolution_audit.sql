-- Resolve/dismiss audit trail (#143): typed name + time of the recruiter who
-- closed a flag. Additive only; gap_flags RLS/no-public-policy stance from
-- #109 is unaffected.

alter table public.gap_flags
  add column resolved_by text,
  add column resolved_at timestamptz;
