-- Private individual recruiter approvals; no signup or email side effects.
create table public.recruiter_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique check (email = lower(trim(email)) and length(email) <= 254),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.recruiter_access enable row level security;
revoke all on table public.recruiter_access from anon, authenticated;
