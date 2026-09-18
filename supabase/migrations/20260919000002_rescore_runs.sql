-- Retryable re-score progress tracking (#150). Run state lives in Supabase,
-- not an external queue, so CV/job text never leaves Singapore.

create table public.rescore_runs (
  id uuid primary key default gen_random_uuid(),
  job_version_id uuid not null references public.job_versions(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'running', 'failed', 'complete')),
  candidate_ids_scored jsonb not null default '[]'::jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.rescore_runs enable row level security;
revoke all on table public.rescore_runs from anon, authenticated;

create index rescore_runs_job_version_id_idx on public.rescore_runs (job_version_id);
