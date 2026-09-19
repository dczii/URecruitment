-- Keyword + filter search only. Drop hybrid vector / match_score ranking.
-- Do not edit earlier search migrations; replace the function here.

drop function if exists public.search_candidates(jsonb, text, vector, uuid, integer, integer);

create function public.search_candidates(
  filters jsonb,
  keyword text,
  lim integer default 50,
  "off" integer default 0
)
returns table (
  candidate_id uuid,
  full_name text,
  headline text,
  total_years numeric,
  location text,
  languages text[],
  cv_updated_at timestamptz,
  keyword_score double precision,
  highlight text
)
language sql
stable
security invoker
set search_path = public
as $$
  with latest_profile as (
    select distinct on (p.candidate_id)
      p.id as profile_id,
      p.candidate_id,
      p.parsed,
      p.overrides,
      p.updated_at as cv_updated_at
    from public.candidate_profiles p
    order by p.candidate_id, p.updated_at desc, p.id desc
  ),
  filtered as (
    select
      sc.id,
      sc.full_name,
      lp.profile_id,
      lp.parsed,
      lp.overrides,
      lp.cv_updated_at,
      coalesce(lp.overrides->>'location', lp.parsed->>'location') as location,
      coalesce(
        lp.overrides->'work_history',
        lp.parsed->'work_history',
        '[]'::jsonb
      ) as work_history,
      coalesce(
        lp.overrides->'languages_spoken',
        lp.parsed->'languages_spoken',
        '[]'::jsonb
      ) as languages_json,
      public.candidate_total_years(
        coalesce(
          lp.overrides->'work_history',
          lp.parsed->'work_history',
          '[]'::jsonb
        )
      ) as total_years
    from public.searchable_candidates sc
    left join latest_profile lp on lp.candidate_id = sc.id
    where
      (
        jsonb_array_length(coalesce($1->'skills', '[]'::jsonb)) = 0
        or not exists (
          select 1
          from jsonb_array_elements_text(coalesce($1->'skills', '[]'::jsonb)) req
          where not exists (
            select 1
            from public.candidate_skills cs
            where cs.candidate_id = sc.id
              and lower(trim(cs.skill)) = lower(trim(req))
          )
        )
      )
      and (
        ($1->>'min_years') is null
        or public.candidate_total_years(
          coalesce(
            lp.overrides->'work_history',
            lp.parsed->'work_history',
            '[]'::jsonb
          )
        ) >= ($1->>'min_years')::numeric
      )
      and (
        ($1->>'max_years') is null
        or public.candidate_total_years(
          coalesce(
            lp.overrides->'work_history',
            lp.parsed->'work_history',
            '[]'::jsonb
          )
        ) <= ($1->>'max_years')::numeric
      )
      and (
        jsonb_array_length(coalesce($1->'locations', '[]'::jsonb)) = 0
        or exists (
          select 1
          from jsonb_array_elements_text(coalesce($1->'locations', '[]'::jsonb)) loc
          where position(
            lower(trim(loc))
            in lower(coalesce(
              lp.overrides->>'location',
              lp.parsed->>'location',
              ''
            ))
          ) > 0
        )
      )
      and (
        jsonb_array_length(coalesce($1->'languages', '[]'::jsonb)) = 0
        or not exists (
          select 1
          from jsonb_array_elements_text(coalesce($1->'languages', '[]'::jsonb)) req
          where not exists (
            select 1
            from jsonb_array_elements_text(
              coalesce(
                lp.overrides->'languages_spoken',
                lp.parsed->'languages_spoken',
                '[]'::jsonb
              )
            ) spoken
            where lower(trim(spoken)) = lower(trim(req))
          )
        )
      )
      and (
        ($1->>'cv_updated_after') is null
        or lp.cv_updated_at >= ($1->>'cv_updated_after')::timestamptz
      )
  ),
  keyword_ranked as not materialized (
    select
      f.id as candidate_id,
      pgroonga_score(p.tableoid, p.ctid) as keyword_score,
      (pgroonga_snippet_html(
        public.candidate_search_text(p.parsed, p.overrides),
        array[trim($2)]
      ))[1] as highlight
    from filtered f
    inner join public.candidate_profiles p on p.id = f.profile_id
    where nullif(trim($2), '') is not null
      and public.candidate_search_text(p.parsed, p.overrides) &@~ trim($2)
  ),
  result as (
    select
      f.id,
      f.full_name,
      f.work_history,
      f.cv_updated_at,
      f.location,
      f.languages_json,
      f.total_years,
      kr.keyword_score,
      kr.highlight
    from filtered f
    left join keyword_ranked kr on kr.candidate_id = f.id
    where
      nullif(trim($2), '') is null
      or kr.keyword_score is not null
  )
  select
    result.id,
    result.full_name,
    coalesce(
      (
        select e->>'job_title'
        from jsonb_array_elements(result.work_history) e
        where coalesce(e->>'current', 'false') in ('true', 't')
          and nullif(e->>'job_title', '') is not null
        limit 1
      ),
      (
        select e->>'job_title'
        from jsonb_array_elements(result.work_history) e
        where nullif(e->>'job_title', '') is not null
        order by e->>'start' desc nulls last
        limit 1
      )
    ) as headline,
    result.total_years,
    result.location,
    coalesce(
      (
        select array_agg(spoken order by spoken)
        from jsonb_array_elements_text(result.languages_json) spoken
      ),
      '{}'::text[]
    ) as languages,
    result.cv_updated_at,
    coalesce(result.keyword_score, 0)::double precision,
    result.highlight
  from result
  order by
    coalesce(result.keyword_score, 0) desc,
    result.id
  limit coalesce($3, 50)
  offset coalesce($4, 0)
$$;

comment on function public.search_candidates(jsonb, text, integer, integer) is
  'Talent search over searchable_candidates: hard filters and optional PGroonga keyword (`&@~`).';

revoke all on function public.search_candidates(jsonb, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.search_candidates(jsonb, text, integer, integer)
  to service_role;
