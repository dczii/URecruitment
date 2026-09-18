-- Pipeline, audit and AI-traceability tables: current stage per job, stage changes, limits, placements, settings log, and one row per AI call (#112).
-- Every table is locked down in this same migration (ADR-0002 D2).

-- A candidate occupies exactly one row (and therefore one stage) per job; a new stage is a new row only if the old one is removed/updated.
create table public.pipeline_entries (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  stage text not null,
  entered_at timestamptz not null default now(),
  owner_name text not null,
  created_at timestamptz not null default now(),
  constraint pipeline_entries_one_stage_per_job unique (candidate_id, job_id)
);

alter table public.pipeline_entries enable row level security;
revoke all on table public.pipeline_entries from anon, authenticated;

-- Append-only: no updated_at.
create table public.stage_events (
  id uuid primary key default gen_random_uuid(),
  pipeline_entry_id uuid not null references public.pipeline_entries(id) on delete cascade,
  from_stage text,
  to_stage text not null,
  recruiter_name text not null check (length(trim(recruiter_name)) > 0),
  created_at timestamptz not null default now()
);

alter table public.stage_events enable row level security;
revoke all on table public.stage_events from anon, authenticated;

-- Day counts are not seeded here — the PRD's per-stage table is partly garbled (ADR-0002 D3); the task that seeds real numbers confirms them with the product owner.
create table public.stage_limits (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('default', 'client', 'job')),
  client_id uuid references public.clients(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete cascade,
  stage text not null,
  limit_days integer not null check (limit_days > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.stage_limits enable row level security;
revoke all on table public.stage_limits from anon, authenticated;

create table public.placements (
  id uuid primary key default gen_random_uuid(),
  pipeline_entry_id uuid not null references public.pipeline_entries(id) on delete cascade,
  start_date date not null,
  guarantee_period_days integer not null default 30,
  guarantee_end_date date not null,
  created_at timestamptz not null default now()
);

alter table public.placements enable row level security;
revoke all on table public.placements from anon, authenticated;

-- Append-only: no updated_at, same shape as stage_events.
create table public.settings_log (
  id uuid primary key default gen_random_uuid(),
  setting_key text not null,
  old_value jsonb,
  new_value jsonb,
  recruiter_name text not null check (length(trim(recruiter_name)) > 0),
  created_at timestamptz not null default now()
);

alter table public.settings_log enable row level security;
revoke all on table public.settings_log from anon, authenticated;

-- No secrets and no CV text in `error` — messages only (ADR-0002 D4 invariant 3, CLAUDE.md hard rule 4).
create table public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  step text not null,
  provider text not null,
  model_id text not null,
  model_version text not null,
  prompt_version text not null,
  input_ref text,
  input_hash text,
  output jsonb,
  status text not null default 'pending' check (status in ('pending', 'succeeded', 'failed')),
  error text,
  input_tokens integer,
  output_tokens integer,
  cost_usd numeric(10,4),
  duration_ms integer,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.ai_runs enable row level security;
revoke all on table public.ai_runs from anon, authenticated;
