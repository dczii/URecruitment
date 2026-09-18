import "server-only";

import { getDb } from "../db";

export type MustHave = { text: string; marking: "must_have" };

export type GapCheckFields = {
  salary_range?: string | null;
  location?: string | null;
  work_arrangement?: string | null;
  employment_type?: string | null;
  headcount?: number | null;
  start_date?: string | null;
  interview_steps?: string | null;
};

export type GapCheckJobVersion = {
  fields: GapCheckFields;
  must_haves?: MustHave[];
};

export type MissingFieldId =
  | "salary_range"
  | "location_or_work_arrangement"
  | "employment_type"
  | "headcount"
  | "start_date"
  | "must_haves"
  | "interview_steps";

export type MissingFieldFlag = {
  flag_type: "missing";
  field: MissingFieldId;
  reason: string;
  suggested_question: string;
};

/** Recruiter/client language pinned by `missing-fields.test.ts`. */
const MISSING_FIELD_COPY: Record<
  MissingFieldId,
  { reason: string; suggested_question: string }
> = {
  salary_range: {
    reason:
      "Without a salary range, candidates cannot tell if the role is in reach, and recruiters cannot screen or set expectations.",
    suggested_question: "What is the salary range for this role?",
  },
  location_or_work_arrangement: {
    reason:
      "Without a location or work arrangement, candidates cannot tell whether they can take the role, and recruiters may spend time on people who cannot work there.",
    suggested_question:
      "Where is this role based, and is it on-site, hybrid or remote?",
  },
  employment_type: {
    reason:
      "Permanent, contract and part-time roles attract different people. Recruiters cannot search or brief candidates without the employment type.",
    suggested_question: "Is this a permanent, contract or part-time role?",
  },
  headcount: {
    reason:
      "Headcount tells recruiters how many people to source and when this search is filled.",
    suggested_question: "How many people are you looking to hire for this role?",
  },
  start_date: {
    reason:
      "A start date lets recruiters judge candidate availability and plan a realistic search timeline.",
    suggested_question: "When do you need this person to start?",
  },
  must_haves: {
    reason:
      "Without must-have skills, matching cannot tell a deal-breaker from a nice-to-have, and recruiters cannot screen with confidence.",
    suggested_question:
      "Which skills or experience are must-haves for this role?",
  },
  interview_steps: {
    reason:
      "Interview steps set candidate expectations and let recruiters plan the process and stage timings.",
    suggested_question: "What are the interview steps for this role?",
  },
};

function isPresentString(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function isPresentHeadcount(value: unknown): boolean {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

type MissingFieldRule = {
  field: MissingFieldId;
  isMissing: (jobVersion: GapCheckJobVersion) => boolean;
};

const RULES: MissingFieldRule[] = [
  {
    field: "salary_range",
    isMissing: ({ fields }) => !isPresentString(fields.salary_range),
  },
  {
    field: "location_or_work_arrangement",
    isMissing: ({ fields }) =>
      !isPresentString(fields.location) &&
      !isPresentString(fields.work_arrangement),
  },
  {
    field: "employment_type",
    isMissing: ({ fields }) => !isPresentString(fields.employment_type),
  },
  {
    field: "headcount",
    isMissing: ({ fields }) => !isPresentHeadcount(fields.headcount),
  },
  {
    field: "start_date",
    isMissing: ({ fields }) => !isPresentString(fields.start_date),
  },
  {
    field: "must_haves",
    isMissing: ({ must_haves }) =>
      must_haves == null || must_haves.length === 0,
  },
  {
    field: "interview_steps",
    isMissing: ({ fields }) => !isPresentString(fields.interview_steps),
  },
];

function flagFor(field: MissingFieldId): MissingFieldFlag {
  return {
    flag_type: "missing",
    field,
    ...MISSING_FIELD_COPY[field],
  };
}

export function checkMissingFields(
  jobVersion: GapCheckJobVersion,
): MissingFieldFlag[] {
  return RULES.filter((rule) => rule.isMissing(jobVersion)).map((rule) =>
    flagFor(rule.field),
  );
}

/**
 * Writes one `gap_flags` row per flag. The table has no `field` column —
 * persist `job_version_id`, `flag_type`, `reason`, `suggested_question`
 * and `resolution_state` only.
 */
export async function persistMissingFieldFlags(
  jobVersionId: string,
  flags: MissingFieldFlag[],
): Promise<void> {
  if (flags.length === 0) {
    return;
  }

  const { error } = await getDb()
    .from("gap_flags")
    .insert(
      flags.map((flag) => ({
        job_version_id: jobVersionId,
        flag_type: "missing" as const,
        reason: flag.reason,
        suggested_question: flag.suggested_question,
        resolution_state: "open",
      })),
    );

  if (error) {
    throw new Error(
      `Failed to persist missing-field flags for ${jobVersionId}: ${error.message}`,
    );
  }
}
