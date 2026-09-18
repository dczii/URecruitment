-- Delay-status view for pipeline entries that still carry a stage limit (#158).
-- Mirrors src/server/pipeline/status.ts: same column names and the overdue /
-- due-soon / on-track boundaries (overdue when working days used exceeds the
-- resolved limit; due-soon from ceil(limit * 0.8)). waiting_on matches
-- STAGE_WAITING_ON in src/lib/stages.ts. Placed and the three end states are
-- excluded; rows with no resolved limit are excluded because a delay status
-- is meaningless without one. security_invoker so RLS on pipeline_entries,
-- jobs and stage_limits is enforced for the caller. No GRANT: the publishable
-- key must read nothing.

create view public.pipeline_status
with (security_invoker = true)
as
select
  pe.id as pipeline_entry_id,
  pe.candidate_id,
  pe.job_id,
  pe.stage,
  public.sg_working_days_between(pe.entered_at, now()) as working_days_used,
  public.resolve_stage_limit(pe.job_id, j.client_id, pe.stage) as limit_days,
  case
    when public.sg_working_days_between(pe.entered_at, now())
         > public.resolve_stage_limit(pe.job_id, j.client_id, pe.stage)
      then 'overdue'
    when public.sg_working_days_between(pe.entered_at, now())
         >= ceil(public.resolve_stage_limit(pe.job_id, j.client_id, pe.stage) * 0.8)
      then 'due-soon'
    else 'on-track'
  end as status,
  greatest(
    0,
    public.sg_working_days_between(pe.entered_at, now())
      - public.resolve_stage_limit(pe.job_id, j.client_id, pe.stage)
  ) as days_over,
  case pe.stage
    when 'Sourced' then 'Recruiter'
    when 'Screening' then 'Recruiter'
    when 'Shortlisted' then 'Recruiter'
    when 'Submitted to client' then 'Client'
    when 'Client interview' then 'Client / candidate'
    when 'Offer' then 'Candidate'
  end as waiting_on
from public.pipeline_entries pe
join public.jobs j on j.id = pe.job_id
where pe.stage in (
    'Sourced', 'Screening', 'Shortlisted', 'Submitted to client',
    'Client interview', 'Offer'
  )
  and public.resolve_stage_limit(pe.job_id, j.client_id, pe.stage) is not null;
