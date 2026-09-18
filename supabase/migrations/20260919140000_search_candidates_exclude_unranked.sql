-- Fix search_candidates to exclude candidates absent from every requested
-- ranking (#156 PR's db check caught this via supabase/tests/search.db.test.ts
-- AC4). The original function in 20260919000003_search_hybrid.sql left-joins
-- keyword_ranked/vector_ranked onto `filtered`, so a keyword-only or
-- vector-only search returned every filter-passing candidate, not just the
-- ones that actually matched the keyword or the vector query. The TS mirror
-- (fuseRankLists in src/server/search/fusion.ts) already unions only the ids
-- present in a ranking that was actually requested; this migration makes the
-- SQL agree. Never edit the merged 20260919000003 migration directly
-- (supabase-db rule) — redefine the function here instead.

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
  where
    -- A candidate must appear in at least one requested ranking. Filter-only
    -- calls (no keyword, no embedding) are unaffected and return every filtered
    -- row; this only excludes candidates that matched the filters but neither
    -- the keyword nor the vector search when one was actually requested,
    -- matching the TS mirror's union-of-ranked-ids semantics
    -- (fuseRankLists in src/server/search/fusion.ts).
    (nullif(trim($2), '') is null and $3 is null)
    or fused.keyword_score is not null
    or fused.vector_score is not null
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
  'Hybrid talent search over searchable_candidates: hard filters, PGroonga keyword (`&@~`), pgvector cosine, reciprocal rank fusion (RRF_K=60). job_version_id switches ranking to current-model match_scores. Excludes candidates absent from every requested ranking (fixed 20260919140000).';
