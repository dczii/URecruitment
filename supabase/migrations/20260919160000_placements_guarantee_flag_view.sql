-- Guarantee-ending flag view (#163). Mirrors resolveGuaranteeFlag in
-- src/server/placements/guarantee.ts: "ending-soon" once 5 SG working days
-- (sg_add_working_days, #116) forward from today reaches or passes
-- guarantee_end_date; "ended" once guarantee_end_date is already past.
-- Only flagged rows are returned (ok rows are excluded) — the dashboard
-- (#161) only ever wants the ones worth showing. security_invoker so RLS
-- on placements/pipeline_entries is enforced for the caller. No GRANT: the
-- publishable key must read nothing (PRD "5 working days before the
-- guarantee ends" timing is proposed, not decided — implemented as written).

create view public.placements_guarantee_flag
with (security_invoker = true)
as
select
  p.id as placement_id,
  p.pipeline_entry_id,
  p.start_date,
  p.guarantee_end_date,
  case
    when p.guarantee_end_date < (now() at time zone 'Asia/Singapore')::date
      then 'ended'
    when (public.sg_add_working_days(now(), 5) at time zone 'Asia/Singapore')::date >= p.guarantee_end_date
      then 'ending-soon'
    else 'ok'
  end as flag
from public.placements p
where
  p.guarantee_end_date < (now() at time zone 'Asia/Singapore')::date
  or (public.sg_add_working_days(now(), 5) at time zone 'Asia/Singapore')::date >= p.guarantee_end_date;

comment on view public.placements_guarantee_flag is
  'Guarantee-ending flag view (#163): only "ending-soon"/"ended" rows, derived at read time, no scheduled job. Mirrors resolveGuaranteeFlag in src/server/placements/guarantee.ts.';

revoke all on public.placements_guarantee_flag from anon, authenticated;
