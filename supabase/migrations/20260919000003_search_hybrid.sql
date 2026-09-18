-- Hybrid talent search (#153 / Story #52): PGroonga + pgvector + hard filters
-- in one SQL function, plus a searchable_candidates visibility hook.
--
-- HNSW on embeddings is still deferred (no fixed vector dimension yet; see
-- 20260918000003_embeddings_scores.sql). Vector search is exact cosine.

create extension if not exists pgroonga;

-- Searchable text for PGroonga: location, titles/employers, skills, education,
-- certifications, languages. Built from the effective profile (overrides win
-- per field). Must stay IMMUTABLE so the expression index can use it.
create function public.candidate_search_text(parsed jsonb, overrides jsonb)
returns text
language sql
immutable
parallel safe
security invoker
set search_path = public
as $$
  select concat_ws(
    ' ',
    coalesce(overrides->>'location', parsed->>'location'),
    coalesce(overrides->'work_history', parsed->'work_history')::text,
    coalesce(overrides->'skills', parsed->'skills')::text,
    coalesce(overrides->'education', parsed->'education')::text,
    coalesce(overrides->'certifications', parsed->'certifications')::text,
    coalesce(overrides->'languages_spoken', parsed->'languages_spoken')::text
  );
$$;

comment on function public.candidate_search_text(jsonb, jsonb) is
  'Concatenated searchable text (location, titles, skills, education, certifications, languages) from a candidate profile. Overrides win per field. Indexed with PGroonga.';

create index candidate_profiles_search_text_pgroonga
  on public.candidate_profiles
  using pgroonga (public.candidate_search_text(parsed, overrides));

-- Filter-column btrees (talent-search performance notes). HNSW is deferred.
create index candidate_skills_candidate_id_skill_idx
  on public.candidate_skills (candidate_id, lower(trim(skill)));

create index embeddings_candidate_profile_owner_idx
  on public.embeddings (owner_id)
  where owner_type = 'candidate_profile';

create index match_scores_job_version_model_idx
  on public.match_scores (job_version_id, model_version, candidate_id);

-- Overlap-merging total years, mirroring src/server/cv/total-years.ts.
-- STABLE (reads clock) because a current role runs through UTC now.
create function public.candidate_total_years(work_history jsonb)
returns numeric
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  rec record;
  start_m integer;
  end_m integer;
  y integer;
  mo integer;
  now_m integer;
  merged_start integer;
  merged_end integer;
  total_months integer := 0;
begin
  if work_history is null or jsonb_typeof(work_history) <> 'array' then
    return 0;
  end if;

  now_m := (extract(year from timezone('UTC', now())))::integer * 12
         + (extract(month from timezone('UTC', now())))::integer
         - 1;

  merged_start := null;
  merged_end := null;

  for rec in
    select
      elem->>'start' as start_ym,
      elem->>'end' as end_ym,
      coalesce(elem->>'current', 'false') as is_current
    from jsonb_array_elements(work_history) elem
    order by 1 nulls last
  loop
    if rec.start_ym is null or rec.start_ym !~ '^\d{4}-\d{2}$' then
      continue;
    end if;
    y := substr(rec.start_ym, 1, 4)::integer;
    mo := substr(rec.start_ym, 6, 2)::integer;
    if mo < 1 or mo > 12 then
      continue;
    end if;
    start_m := y * 12 + mo - 1;

    if rec.is_current in ('true', 't') then
      end_m := now_m;
    elsif rec.end_ym is not null and rec.end_ym ~ '^\d{4}-\d{2}$' then
      y := substr(rec.end_ym, 1, 4)::integer;
      mo := substr(rec.end_ym, 6, 2)::integer;
      if mo < 1 or mo > 12 then
        continue;
      end if;
      end_m := y * 12 + mo - 1;
    else
      continue;
    end if;

    if end_m <= start_m then
      continue;
    end if;

    if merged_start is null then
      merged_start := start_m;
      merged_end := end_m;
    elsif start_m > merged_end then
      total_months := total_months + (merged_end - merged_start);
      merged_start := start_m;
      merged_end := end_m;
    elsif end_m > merged_end then
      merged_end := end_m;
    end if;
  end loop;

  if merged_start is not null then
    total_months := total_months + (merged_end - merged_start);
  end if;

  return total_months::numeric / 12;
end;
$$;

comment on function public.candidate_total_years(jsonb) is
  'Sum of YYYY-MM work-history intervals in years, merging overlaps so they count once. current=true runs through UTC now. Mirror of computeTotalYears in src/server/cv/total-years.ts.';

-- Visibility hook: MVP passes every candidate. Real-data release changes only
-- this WHERE clause (consent + 12-month retention) — callers stay unchanged.
create view public.searchable_candidates
with (security_invoker = true)
as
select c.*
from public.candidates c
where true;

comment on view public.searchable_candidates is
  'Visibility hook for talent search. MVP: all candidates (WHERE true). Real-data release: hide candidates without consent or past 12-month retention. search_candidates selects from this view, never candidates directly.';

revoke all on table public.searchable_candidates from anon, authenticated;

-- Hybrid search: hard filters → PGroonga keyword (`&@~`) → vector cosine →
-- reciprocal rank fusion. When job_version_id is set, rank by that version's
-- current-model match_scores.score instead and return stored reasons.
--
-- Reciprocal rank fusion constants (Cormack, Clarke & Büttcher 2009).
-- Must match src/server/search/fusion.ts (RRF_K).
--   fused_score = 1/(RRF_K + keyword_rank) + 1/(RRF_K + vector_rank)
--   RRF_K = 60
-- A candidate absent from a ranking contributes 0 (infinite rank).
-- Ties broken by candidate id.
create or replace function public.search_candidates(
  filters jsonb,
  keyword text,
  embedding vector,
  job_version_id uuid default null,
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
  vector_score double precision,
  fused_score double precision,
  match_score integer,
  matched jsonb,
  missing jsonb,
  uncertain jsonb,
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
  latest_embedding as (
    select distinct on (e.owner_id)
      e.owner_id,
      e.embedding
    from public.embeddings e
    where e.owner_type = 'candidate_profile'
      and e.embedding is not null
      and (
        $3 is null
        or vector_dims(e.embedding) = vector_dims($3)
      )
    order by e.owner_id, e.created_at desc, e.id desc
  ),
  current_model as (
    select ms.model_version
    from public.match_scores ms
    where $4 is not null
      and ms.job_version_id = $4
    order by ms.created_at desc, ms.id desc
    limit 1
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
      -- skills (AND): every requested skill is on candidate_skills, normalised
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
      ))[1] as highlight,
      row_number() over (
        order by pgroonga_score(p.tableoid, p.ctid) desc, f.id
      ) as keyword_rank
    from filtered f
    inner join public.candidate_profiles p on p.id = f.profile_id
    where nullif(trim($2), '') is not null
      and public.candidate_search_text(p.parsed, p.overrides) &@~ trim($2)
  ),
  vector_ranked as (
    select
      f.id as candidate_id,
      (1 - (le.embedding <=> $3))::double precision as vector_score,
      row_number() over (
        order by (le.embedding <=> $3) asc, f.id
      ) as vector_rank
    from filtered f
    inner join latest_embedding le on le.owner_id = f.id
    where $3 is not null
  ),
  fused as (
    select
      f.id,
      f.full_name,
      f.work_history,
      f.cv_updated_at,
      f.location,
      f.languages_json,
      f.total_years,
      kr.keyword_score,
      kr.highlight,
      vr.vector_score,
      (
        coalesce(1.0::double precision / (60 + kr.keyword_rank), 0)
        + coalesce(1.0::double precision / (60 + vr.vector_rank), 0)
      ) as fused_score,
      ms.score as match_score,
      ms.matched,
      ms.missing,
      ms.uncertain
    from filtered f
    left join keyword_ranked kr on kr.candidate_id = f.id
    left join vector_ranked vr on vr.candidate_id = f.id
    left join public.match_scores ms
      on ms.candidate_id = f.id
     and $4 is not null
     and ms.job_version_id = $4
     and ms.model_version = (select model_version from current_model)
  )
  select
    fused.id,
    fused.full_name,
    coalesce(
      (
        select e->>'job_title'
        from jsonb_array_elements(fused.work_history) e
        where coalesce(e->>'current', 'false') in ('true', 't')
          and nullif(e->>'job_title', '') is not null
        limit 1
      ),
      (
        select e->>'job_title'
        from jsonb_array_elements(fused.work_history) e
        where nullif(e->>'job_title', '') is not null
        order by e->>'start' desc nulls last
        limit 1
      )
    ) as headline,
    fused.total_years,
    fused.location,
    coalesce(
      (
        select array_agg(spoken order by spoken)
        from jsonb_array_elements_text(fused.languages_json) spoken
      ),
      '{}'::text[]
    ) as languages,
    fused.cv_updated_at,
    coalesce(fused.keyword_score, 0)::double precision,
    fused.vector_score,
    fused.fused_score,
    fused.match_score,
    fused.matched,
    fused.missing,
    fused.uncertain,
    fused.highlight
  from fused
  order by
    case
      when $4 is not null then coalesce(fused.match_score, -1)::double precision
      else fused.fused_score
    end desc,
    fused.id
  limit coalesce($5, 50)
  offset coalesce($6, 0)
$$;

comment on function public.search_candidates(jsonb, text, vector, uuid, integer, integer) is
  'Hybrid talent search over searchable_candidates: hard filters, PGroonga keyword (`&@~`), pgvector cosine, reciprocal rank fusion (RRF_K=60). job_version_id switches ranking to current-model match_scores.';

revoke all on function public.candidate_search_text(jsonb, jsonb)
  from public, anon, authenticated;
revoke all on function public.candidate_total_years(jsonb)
  from public, anon, authenticated;
revoke all on function public.search_candidates(jsonb, text, vector, uuid, integer, integer)
  from public, anon, authenticated;

-- Server secret-key role is the only intended caller of the search RPC
-- (T2b). PUBLIC execute is revoked above, matching working-day functions.
grant execute on function public.candidate_search_text(jsonb, jsonb)
  to service_role;
grant execute on function public.candidate_total_years(jsonb)
  to service_role;
grant execute on function public.search_candidates(jsonb, text, vector, uuid, integer, integer)
  to service_role;
