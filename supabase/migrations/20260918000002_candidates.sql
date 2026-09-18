-- Candidate-side schema: candidates, cv_files, candidate_profiles, candidate_skills (#110).
-- Every table is locked down in this same migration (ADR-0002 D2).

create table public.candidates (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  phone text,
  -- Inert in the MVP — no code writes or filters on these until the real-data release (ADR-0002 D3).
  consent_status text,
  consent_date timestamptz,
  consent_method text,
  last_activity_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.candidates enable row level security;
revoke all on table public.candidates from anon, authenticated;

-- Never store the public sample-data Blob URL — source_ref is the blob pathname only (ADR-0002 rejected alternatives).
create table public.cv_files (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid references public.candidates(id) on delete cascade,
  source text not null default 'seed-blob',
  source_ref text,
  source_hash text,
  storage_path text not null,
  doc_kind text not null check (doc_kind in ('cv', 'jd')),
  language text,
  parse_status text not null default 'pending' check (parse_status in ('pending', 'processing', 'parsed', 'error')),
  parse_error text,
  created_at timestamptz not null default now()
);

alter table public.cv_files enable row level security;
revoke all on table public.cv_files from anon, authenticated;

-- parsed and overrides are separate columns; re-parsing writes only `parsed`, never `overrides` (ADR-0002 D4 invariant 2). The effective profile is parsed merged with overrides, overrides winning — that merge is application code, not this migration.
create table public.candidate_profiles (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  cv_file_id uuid references public.cv_files(id) on delete set null,
  parsed jsonb not null default '{}'::jsonb,
  overrides jsonb not null default '{}'::jsonb,
  overridden_by text,
  overridden_at timestamptz,
  ai_run_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.candidate_profiles enable row level security;
revoke all on table public.candidate_profiles from anon, authenticated;

create table public.candidate_skills (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  skill text not null,
  source_text text not null check (length(trim(source_text)) > 0),
  ai_run_id uuid,
  created_at timestamptz not null default now()
);

alter table public.candidate_skills enable row level security;
revoke all on table public.candidate_skills from anon, authenticated;
