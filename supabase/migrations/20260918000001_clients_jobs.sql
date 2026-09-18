-- Job-side schema: clients, jobs, job_versions, gap_flags (#109).
-- Every table is locked down in this same migration (ADR-0002 D2).

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  guarantee_period_days integer not null default 30,
  stage_limit_overrides jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.clients enable row level security;
revoke all on table public.clients from anon, authenticated;

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  owner_name text not null,
  status text not null default 'open',
  current_version_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.jobs enable row level security;
revoke all on table public.jobs from anon, authenticated;

-- job_versions rows are immutable: never updated after insert.
create table public.job_versions (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  fields jsonb not null,
  must_haves jsonb not null default '[]'::jsonb,
  nice_to_haves jsonb not null default '[]'::jsonb,
  requires_nationality boolean not null default false,
  nationality_reason text,
  requires_language boolean not null default false,
  language_reason text,
  created_at timestamptz not null default now(),
  constraint job_versions_nationality_reason_check
    check (
      requires_nationality = false
      or (nationality_reason is not null and length(trim(nationality_reason)) > 0)
    ),
  constraint job_versions_language_reason_check
    check (
      requires_language = false
      or (language_reason is not null and length(trim(language_reason)) > 0)
    )
);

alter table public.job_versions enable row level security;
revoke all on table public.job_versions from anon, authenticated;

alter table public.jobs
  add constraint jobs_current_version_id_fkey
  foreign key (current_version_id)
  references public.job_versions(id)
  on delete set null;

create table public.gap_flags (
  id uuid primary key default gen_random_uuid(),
  job_version_id uuid not null references public.job_versions(id) on delete cascade,
  flag_type text not null check (flag_type in ('missing', 'uncertain', 'conflicting', 'fair-employment')),
  reason text not null,
  suggested_question text,
  resolution_state text not null default 'open' check (resolution_state in ('open', 'resolved', 'dismissed')),
  resolution_note text,
  created_at timestamptz not null default now()
);

alter table public.gap_flags enable row level security;
revoke all on table public.gap_flags from anon, authenticated;
