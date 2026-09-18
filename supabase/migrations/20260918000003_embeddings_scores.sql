-- Matching storage: unconstrained pgvector embeddings and version-keyed match scores (#111).
-- Every table is locked down in this same migration (ADR-0002 D2).

create extension if not exists vector;

-- No fixed vector dimension and no ANN index yet — the embedding model is an open PRD question (ADR-0003). A follow-up migration fixes the dimension and adds the HNSW index once it's chosen.
create table public.embeddings (
  id uuid primary key default gen_random_uuid(),
  owner_type text not null check (owner_type in ('candidate_profile', 'job_version')),
  owner_id uuid not null,
  embedding vector,
  embedding_model text not null,
  ai_run_id uuid,
  created_at timestamptz not null default now()
);

alter table public.embeddings enable row level security;
revoke all on table public.embeddings from anon, authenticated;

-- Unique key is (candidate, job_version, model_version) — ADR-0002 D4 invariant 1. Queries always filter by the job's current version and the active model version; that filtering is application code, not this migration.
create table public.match_scores (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  job_version_id uuid not null references public.job_versions(id) on delete cascade,
  model_version text not null,
  score integer not null check (score >= 0 and score <= 100),
  raw_score integer check (raw_score >= 0 and raw_score <= 100),
  matched jsonb not null default '[]'::jsonb,
  missing jsonb not null default '[]'::jsonb,
  uncertain jsonb not null default '[]'::jsonb,
  ai_run_id uuid,
  created_at timestamptz not null default now(),
  constraint match_scores_candidate_job_version_model_key unique (candidate_id, job_version_id, model_version)
);

alter table public.match_scores enable row level security;
revoke all on table public.match_scores from anon, authenticated;
