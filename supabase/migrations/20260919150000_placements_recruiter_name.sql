-- Placements need the typed recruiter name (CLAUDE.md hard rule 8, #162) and
-- must be one-per-pipeline-entry so a start-date change updates the existing
-- row instead of creating a second placement for the same candidate-on-job.
-- Never edit the merged 20260918000004_pipeline_audit.sql migration.

alter table public.placements
  add column recruiter_name text not null check (length(trim(recruiter_name)) > 0);

alter table public.placements
  add constraint placements_pipeline_entry_id_unique unique (pipeline_entry_id);
