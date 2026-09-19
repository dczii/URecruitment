import { afterAll, afterEach, describe, expect, it } from "vitest";
import postgres from "postgres";

/**
 * Keyword + filter search — DB integration.
 *
 * Proves hard-filter exclusion, a Simplified Chinese PGroonga keyword hit,
 * and the PRD 3-second budget (AC3) on the fixture set.
 *
 * Fixture writes use a direct Postgres connection (local `postgres` role, the
 * privileged equivalent of SUPABASE_SECRET_KEY). Local stack only.
 *
 * Not run in the executor environment (no Docker / local Supabase). CI must
 * confirm.
 */

const LOCAL_STACK_REQUIRED =
  "Start the local stack with `supabase start`. These tests use SUPABASE_DB_URL (default postgresql://postgres:postgres@127.0.0.1:54322/postgres). DB tests never run against a remote project.";

const DEFAULT_DB_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "0.0.0.0"]);

function assertLocal(url: string, name: string): void {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    throw new Error(`${name} is not a valid URL. ${LOCAL_STACK_REQUIRED}`);
  }
  if (!LOCAL_HOSTS.has(host)) {
    throw new Error(
      `Refusing to run DB tests against host "${host}" (${name}). These tests are local-stack only; agents and CI never point them at a remote project.`,
    );
  }
}

const dbUrl = process.env.SUPABASE_DB_URL ?? DEFAULT_DB_URL;
assertLocal(dbUrl, "SUPABASE_DB_URL");

const sql = postgres(dbUrl, { max: 1, idle_timeout: 2, connect_timeout: 5 });

type SearchRow = {
  candidate_id: string;
  full_name: string;
  headline: string | null;
  total_years: string | number;
  location: string | null;
  languages: string[] | null;
  cv_updated_at: Date | string | null;
  keyword_score: number | string | null;
  highlight: string | null;
};

type Fixture = {
  priyaId?: string;
  chenId?: string;
  samId?: string;
  wangId?: string;
  clientId?: string;
  jobId?: string;
  jobVersionId?: string;
};

let fixture: Fixture = {};

function isConnectionError(error: unknown): boolean {
  const code = (error as { code?: string }).code;
  return (
    code === "ECONNREFUSED" ||
    code === "ENOTFOUND" ||
    code === "CONNECT_TIMEOUT" ||
    code === "ECONNRESET"
  );
}

afterEach(async () => {
  const {
    priyaId,
    chenId,
    samId,
    wangId,
    jobVersionId,
    jobId,
    clientId,
  } = fixture;
  fixture = {};
  const candidateIds = [priyaId, chenId, samId, wangId].filter(
    (id): id is string => Boolean(id),
  );
  try {
    if (candidateIds.length > 0) {
      await sql`delete from public.embeddings where owner_id in ${sql(candidateIds)}`;
      await sql`delete from public.candidates where id in ${sql(candidateIds)}`;
    }
    if (jobVersionId) {
      await sql`delete from public.job_versions where id = ${jobVersionId}`;
    }
    if (jobId) {
      await sql`delete from public.jobs where id = ${jobId}`;
    }
    if (clientId) {
      await sql`delete from public.clients where id = ${clientId}`;
    }
  } catch (error) {
    if (isConnectionError(error)) {
      return;
    }
    throw error;
  }
});

afterAll(async () => {
  await sql.end({ timeout: 5 });
});

type ProfileSeed = {
  location: string;
  title: string;
  start: string;
  end: string;
  skills: string[];
  languages: string[];
  updatedAt: string;
};

async function insertCandidate(
  fullName: string,
  profile: ProfileSeed,
): Promise<string> {
  const [candidate] = await sql<{ id: string }[]>`
    insert into public.candidates (full_name)
    values (${fullName})
    returning id
  `;

  const parsed = {
    location: profile.location,
    location_source_text: profile.location,
    work_history: [
      {
        employer: "Fictional Employer Pte Ltd",
        employer_source_text: "Fictional Employer Pte Ltd",
        job_title: profile.title,
        job_title_source_text: profile.title,
        start: profile.start,
        end: profile.end,
        current: false,
        source_text: `${profile.title}, Fictional Employer Pte Ltd`,
      },
    ],
    education: [],
    certifications: [],
    skills: profile.skills.map((skill) => ({ skill, source_text: skill })),
    languages_spoken: profile.languages,
  };

  await sql`
    insert into public.candidate_profiles (
      candidate_id, parsed, overrides, updated_at
    )
    values (
      ${candidate.id},
      ${sql.json(parsed)},
      '{}'::jsonb,
      ${profile.updatedAt}::timestamptz
    )
  `;

  if (profile.skills.length > 0) {
    for (const skill of profile.skills) {
      await sql`
        insert into public.candidate_skills (candidate_id, skill, source_text)
        values (${candidate.id}, ${skill}, ${skill})
      `;
    }
  }

  return candidate.id;
}

async function seedFixture(): Promise<{
  priyaId: string;
  chenId: string;
  samId: string;
  wangId: string;
  jobVersionId: string;
}> {
  const priyaId = await insertCandidate(
    "Priya Nair",
    {
      location: "Singapore",
      title: "Senior Accountant",
      start: "2018-01",
      end: "2024-01",
      skills: ["SAP"],
      languages: ["English", "Mandarin"],
      updatedAt: "2026-01-15T00:00:00.000Z",
    },
  );
  fixture.priyaId = priyaId;
  const chenId = await insertCandidate(
    "Chen Wei",
    {
      location: "Shanghai",
      title: "Java Engineer",
      start: "2022-01",
      end: "2024-01",
      skills: ["Java"],
      languages: ["普通话"],
      updatedAt: "2026-09-01T00:00:00.000Z",
    },
  );
  fixture.chenId = chenId;
  const samId = await insertCandidate(
    "Sam Okonkwo",
    {
      location: "London",
      title: "Operations Associate",
      start: "2014-01",
      end: "2024-01",
      skills: ["Excel"],
      languages: ["English"],
      updatedAt: "2026-03-01T00:00:00.000Z",
    },
  );
  fixture.samId = samId;
  const wangId = await insertCandidate(
    "王芳",
    {
      location: "上海",
      title: "会计师",
      start: "2020-01",
      end: "2024-01",
      skills: ["会计"],
      languages: ["普通话"],
      updatedAt: "2026-08-01T00:00:00.000Z",
    },
  );
  fixture.wangId = wangId;

  const [client] = await sql<{ id: string }[]>`
    insert into public.clients (name)
    values ('Northwind Fictional Pte Ltd')
    returning id
  `;
  fixture.clientId = client.id;
  const [job] = await sql<{ id: string }[]>`
    insert into public.jobs (client_id, owner_name)
    values (${client.id}, 'Jordan Lee')
    returning id
  `;
  fixture.jobId = job.id;
  const [jobVersion] = await sql<{ id: string }[]>`
    insert into public.job_versions (job_id, fields)
    values (${job.id}, ${sql.json({ title: "Finance hire" })})
    returning id
  `;
  fixture.jobVersionId = jobVersion.id;

  fixture = {
    priyaId,
    chenId,
    samId,
    wangId,
    clientId: client.id,
    jobId: job.id,
    jobVersionId: jobVersion.id,
  };

  return {
    priyaId,
    chenId,
    samId,
    wangId,
    jobVersionId: jobVersion.id,
  };
}

type SearchFilters = {
  skills?: string[];
  min_years?: number;
  max_years?: number;
  locations?: string[];
  languages?: string[];
  cv_updated_after?: string;
};

async function search(args: {
  filters?: SearchFilters;
  keyword?: string;
  lim?: number;
  off?: number;
}): Promise<SearchRow[]> {
  const filters = args.filters ?? {};
  const keyword = args.keyword ?? "";
  const lim = args.lim ?? 50;
  const off = args.off ?? 0;
  return sql<SearchRow[]>`
    select * from public.search_candidates(
      ${sql.json(filters)}::jsonb,
      ${keyword},
      ${lim}::integer,
      ${off}::integer
    )
  `;
}

function idsOf(rows: SearchRow[]): string[] {
  return rows.map((row) => row.candidate_id);
}

describe("search_candidates lock-down and visibility hook", () => {
  it("is security invoker and revoked from anon and authenticated", async () => {
    const [fn] = await sql<{
      prosecdef: boolean;
      oid: string;
    }[]>`
      select p.prosecdef, p.oid::text as oid
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'search_candidates'
    `;
    expect(fn, "search_candidates must exist after the keyword search migration").toBeTruthy();
    if (!fn) {
      throw new Error("search_candidates is not installed");
    }
    expect(fn.prosecdef, "search_candidates must be SECURITY INVOKER").toBe(
      false,
    );

    const [privs] = await sql<{ anon_exec: boolean; auth_exec: boolean }[]>`
      select
        has_function_privilege('anon', ${fn.oid}::oid, 'EXECUTE') as anon_exec,
        has_function_privilege(
          'authenticated',
          ${fn.oid}::oid,
          'EXECUTE'
        ) as auth_exec
    `;
    expect(privs?.anon_exec).toBe(false);
    expect(privs?.auth_exec).toBe(false);
  });

  it("searchable_candidates is a security_invoker view that passes all candidates", async () => {
    const [view] = await sql<{ reloptions: string[] | null }[]>`
      select c.reloptions
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = 'searchable_candidates'
        and c.relkind = 'v'
    `;
    expect(view?.reloptions?.join(",")).toMatch(/security_invoker=true/);

    const [def] = await sql<{ viewdef: string }[]>`
      select pg_get_viewdef('public.searchable_candidates'::regclass, true) as viewdef
    `;
    expect(def?.viewdef.toLowerCase()).toMatch(/where\s+true/);
  });

  it("search_candidates selects from searchable_candidates, not candidates directly", async () => {
    const [def] = await sql<{ definition: string }[]>`
      select pg_get_functiondef(
        'public.search_candidates(jsonb, text, integer, integer)'::regprocedure
      ) as definition
    `;
    expect(def?.definition).toMatch(/searchable_candidates/);
  });
});

describe("search_candidates filters, keyword, timing", () => {
  it("skills filter excludes candidates who lack the normalised skill", async () => {
    const { priyaId, chenId, samId, wangId } = await seedFixture();
    const rows = await search({ filters: { skills: ["SAP"] } });
    const ids = idsOf(rows);
    expect(ids).toContain(priyaId);
    expect(ids).not.toContain(chenId);
    expect(ids).not.toContain(samId);
    expect(ids).not.toContain(wangId);
  });

  it("min_years filter excludes candidates below the floor", async () => {
    const { priyaId, chenId, samId, wangId } = await seedFixture();
    const rows = await search({ filters: { min_years: 5 } });
    const ids = idsOf(rows);
    expect(ids).toContain(priyaId);
    expect(ids).toContain(samId);
    expect(ids).not.toContain(chenId);
    expect(ids).not.toContain(wangId);
  });

  it("max_years filter excludes candidates above the ceiling", async () => {
    const { priyaId, chenId, samId, wangId } = await seedFixture();
    const rows = await search({ filters: { max_years: 3 } });
    const ids = idsOf(rows);
    expect(ids).toContain(chenId);
    expect(ids).not.toContain(priyaId);
    expect(ids).not.toContain(samId);
    expect(ids).not.toContain(wangId);
  });

  it("locations filter excludes candidates outside the requested place", async () => {
    const { priyaId, chenId, samId, wangId } = await seedFixture();
    const rows = await search({ filters: { locations: ["Singapore"] } });
    const ids = idsOf(rows);
    expect(ids).toContain(priyaId);
    expect(ids).not.toContain(chenId);
    expect(ids).not.toContain(samId);
    expect(ids).not.toContain(wangId);
  });

  it("languages filter excludes candidates who do not speak the language", async () => {
    const { priyaId, chenId, samId, wangId } = await seedFixture();
    const rows = await search({ filters: { languages: ["Mandarin"] } });
    const ids = idsOf(rows);
    expect(ids).toContain(priyaId);
    expect(ids).not.toContain(chenId);
    expect(ids).not.toContain(samId);
    expect(ids).not.toContain(wangId);
  });

  it("cv_updated_after filter excludes older profiles", async () => {
    const { priyaId, chenId, samId, wangId } = await seedFixture();
    const rows = await search({
      filters: { cv_updated_after: "2026-06-01T00:00:00.000Z" },
    });
    const ids = idsOf(rows);
    expect(ids).toContain(chenId);
    expect(ids).toContain(wangId);
    expect(ids).not.toContain(priyaId);
    expect(ids).not.toContain(samId);
  });

  it("AC4: a Simplified Chinese keyword finds the Chinese profile via PGroonga", async () => {
    const { wangId, priyaId } = await seedFixture();
    const rows = await search({ keyword: "会计" });
    const ids = idsOf(rows);
    expect(ids).toContain(wangId);
    expect(ids).not.toContain(priyaId);
    const hit = rows.find((row) => row.candidate_id === wangId);
    expect(hit?.headline).toBe("会计师");
    expect(hit?.keyword_score).not.toBeNull();
    expect(Number(hit?.keyword_score)).toBeGreaterThan(0);
  });

  it("AC3: search over the fixture set completes well under 3000ms", async () => {
    await seedFixture();
    const started = performance.now();
    const rows = await search({
      keyword: "accountant",
    });
    const elapsed = performance.now() - started;
    expect(rows.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(3000);
  });
});
