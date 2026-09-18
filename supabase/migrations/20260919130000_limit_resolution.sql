-- Stage-limit resolution for the future delay-status view (#157).
-- Mirrors src/lib/stage-limits.ts. Priority is job > client > default.
-- An explicit limit_days of 0 is a real value (select into only yields
-- NULL when no matching row exists). Unrecognised stages raise, matching
-- resolveStageLimit.
--
-- Called later by the pipeline_status view. security invoker so RLS on
-- stage_limits is respected by the caller; stable because these are
-- pure reads of the limits table.

-- Signature: resolve_stage_limit(p_job_id uuid, p_client_id uuid, p_stage text)
--   → integer  (same semantics as resolveStageLimit)
create function public.resolve_stage_limit(
  p_job_id uuid,
  p_client_id uuid,
  p_stage text
)
returns integer
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  resolved integer;
begin
  if p_stage not in (
    'Sourced', 'Screening', 'Shortlisted', 'Submitted to client',
    'Client interview', 'Offer', 'Placed'
  ) then
    raise exception 'Unrecognised stage: %', p_stage;
  end if;

  select limit_days into resolved
    from public.stage_limits
    where scope = 'job' and job_id = p_job_id and stage = p_stage;
  if resolved is not null then
    return resolved;
  end if;

  select limit_days into resolved
    from public.stage_limits
    where scope = 'client' and client_id = p_client_id and stage = p_stage;
  if resolved is not null then
    return resolved;
  end if;

  select limit_days into resolved
    from public.stage_limits
    where scope = 'default' and stage = p_stage;
  return resolved;
end;
$$;

comment on function public.resolve_stage_limit(uuid, uuid, text) is
  'Resolved stage limit in working days for a job/client/stage: job override, then client override, then default. A 0-day limit is a real value; NULL means no matching row at any scope. Unrecognised stages raise. Mirror of resolveStageLimit in src/lib/stage-limits.ts.';

revoke all on function public.resolve_stage_limit(uuid, uuid, text)
  from public, anon, authenticated;
