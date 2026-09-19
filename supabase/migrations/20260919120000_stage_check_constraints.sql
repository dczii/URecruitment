-- Ties pipeline_entries.stage and stage_events.from_stage/to_stage to the fixed stage list (#156).
-- The 10 values (7 stages + 3 end states) must match src/lib/stages.ts's `ALL_PIPELINE_STAGES`
-- exactly; that TS module is the human-facing source of truth, this constraint is its DB mirror.

alter table public.pipeline_entries
  add constraint pipeline_entries_stage_check check (
    stage in (
      'Sourced', 'Screening', 'Shortlisted', 'Submitted to client',
      'Client interview', 'Offer', 'Placed',
      'Rejected by agency', 'Rejected by client', 'Withdrawn'
    )
  );

alter table public.stage_events
  add constraint stage_events_from_stage_check check (
    from_stage is null or from_stage in (
      'Sourced', 'Screening', 'Shortlisted', 'Submitted to client',
      'Client interview', 'Offer', 'Placed',
      'Rejected by agency', 'Rejected by client', 'Withdrawn'
    )
  );

alter table public.stage_events
  add constraint stage_events_to_stage_check check (
    to_stage in (
      'Sourced', 'Screening', 'Shortlisted', 'Submitted to client',
      'Client interview', 'Offer', 'Placed',
      'Rejected by agency', 'Rejected by client', 'Withdrawn'
    )
  );
