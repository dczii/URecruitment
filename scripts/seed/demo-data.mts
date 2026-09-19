/**
 * Fictional demo data for every URecruitment screen (`npm run seed:demo`).
 *
 * This is NOT the sample-data seed described in `supabase-db` → "Seed": that
 * one lists the Vercel Blob store and runs the real parser/matcher. This one
 * needs no AI provider and no Blob token — it writes ready-made rows so the
 * dashboard, jobs, candidates, search and placements screens all have
 * something to show.
 *
 * Every person, client and employer below is invented (CLAUDE.md hard rule 6).
 *
 * Pure and deterministic: ids are fixed literals so re-running upserts the
 * same rows, and every timestamp is derived from the `today` and `holidays`
 * passed in, so the three delay statuses and both guarantee flags hold
 * whichever day the seed runs.
 */

export type Uuid = string;

export type DemoRow = Record<string, unknown>;

export type DemoSeed = {
  clients: DemoRow[];
  jobs: DemoRow[];
  jobVersions: DemoRow[];
  jobCurrentVersions: Array<{ id: Uuid; current_version_id: Uuid }>;
  gapFlags: DemoRow[];
  stageLimits: DemoRow[];
  candidates: DemoRow[];
  cvFiles: DemoRow[];
  candidateProfiles: DemoRow[];
  candidateSkills: DemoRow[];
  aiRuns: DemoRow[];
  matchScores: DemoRow[];
  pipelineEntries: DemoRow[];
  stageEvents: DemoRow[];
  placements: DemoRow[];
  settingsLog: DemoRow[];
};

/** Insert order. Reversed, this is also the delete order for `--reset`. */
export const DEMO_TABLE_ORDER = [
  "clients",
  "jobs",
  "job_versions",
  "gap_flags",
  "stage_limits",
  "candidates",
  "cv_files",
  "candidate_profiles",
  "candidate_skills",
  "ai_runs",
  "match_scores",
  "pipeline_entries",
  "stage_events",
  "placements",
  "settings_log",
] as const;

/**
 * Demo stage limits in SG working days. The PRD's per-stage table is an open
 * item (ADR-0002 D3), so these are demo values only — they exist to make the
 * delay statuses visible, not to settle the question.
 */
export const DEMO_STAGE_LIMIT_DAYS: Record<string, number> = {
  Sourced: 3,
  Screening: 5,
  Shortlisted: 5,
  "Submitted to client": 7,
  "Client interview": 10,
  Offer: 5,
  Placed: 5,
};

const SGT_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function id(prefix: string, n: number): Uuid {
  return `${prefix}-0000-4000-8000-${String(n).padStart(12, "0")}`;
}

const CLIENT = (n: number) => id("11111111", n);
const JOB = (n: number) => id("22222222", n);
const VERSION = (n: number) => id("33333333", n);
const CANDIDATE = (n: number) => id("44444444", n);
const CV_FILE = (n: number) => id("55555555", n);
const PROFILE = (n: number) => id("66666666", n);
const SKILL = (n: number) => id("77777777", n);
const ENTRY = (n: number) => id("88888888", n);
const EVENT = (n: number) => id("99999999", n);
const PLACEMENT = (n: number) => id("aaaaaaaa", n);
const FLAG = (n: number) => id("bbbbbbbb", n);
const SCORE = (n: number) => id("cccccccc", n);
const AI_RUN = (n: number) => id("dddddddd", n);
const LIMIT = (n: number) => id("eeeeeeee", n);
const SETTING = (n: number) => id("ffffffff", n);

function sgtCalendarDate(instant: Date): Date {
  const shifted = new Date(instant.getTime() + SGT_OFFSET_MS);
  return new Date(
    Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()),
  );
}

function ymd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function isWorkingDay(date: Date, holidays: Set<string>): boolean {
  const weekday = date.getUTCDay();
  return weekday !== 0 && weekday !== 6 && !holidays.has(ymd(date));
}

/**
 * The UTC instant of SGT-local midday `days` working days before `today`.
 * Midday, not midnight, so the entry is unambiguously inside its SGT date
 * whichever side of the boundary the seed runs.
 */
export function workingDaysAgo(
  today: Date,
  days: number,
  holidays: Iterable<string>,
): Date {
  const holidaySet = new Set(holidays);
  let cursor = sgtCalendarDate(today);
  let remaining = days;
  while (remaining > 0) {
    cursor = new Date(cursor.getTime() - DAY_MS);
    if (isWorkingDay(cursor, holidaySet)) {
      remaining -= 1;
    }
  }
  return new Date(cursor.getTime() - SGT_OFFSET_MS + 12 * 60 * 60 * 1000);
}

/** SGT calendar date `days` calendar days from today, as YYYY-MM-DD. */
export function calendarDate(today: Date, days: number): string {
  return ymd(new Date(sgtCalendarDate(today).getTime() + days * DAY_MS));
}

function iso(date: Date): string {
  return date.toISOString();
}

type CandidateSpec = {
  n: number;
  name: string;
  email: string;
  phone: string;
  location: string;
  headline: string;
  languages: string[];
  skills: Array<[skill: string, source: string]>;
  work: Array<{
    employer: string;
    title: string;
    start: string;
    end: string | null;
    source: string;
  }>;
  education: { institution: string; qualification: string; year: string };
  /** 'parsed' for the normal case; the other two drive the CV review queue. */
  parseStatus?: "parsed" | "error" | "rejected";
  parseError?: string;
};

/** Twelve invented candidates: eight English CVs, four Simplified Chinese. */
const CANDIDATE_SPECS: CandidateSpec[] = [
  {
    n: 1,
    name: "Jamie Tan",
    email: "jamie.tan.fictional@example.com",
    phone: "+65 9123 4567",
    location: "Singapore",
    headline: "Senior Accountant",
    languages: ["English", "Mandarin"],
    skills: [
      ["SAP FICO", "Skills: SAP FICO, SAP MM, Excel"],
      ["SAP MM", "Skills: SAP FICO, SAP MM, Excel"],
      ["Month-end close", "Led month-end close for a 12-person finance team"],
    ],
    work: [
      {
        employer: "Meridian Trading Pte Ltd",
        title: "Senior Accountant",
        start: "2021-01",
        end: null,
        source: "Senior Accountant, Meridian Trading Pte Ltd, Jan 2021 - Present",
      },
      {
        employer: "Northgate Logistics",
        title: "Accountant",
        start: "2018-03",
        end: "2020-12",
        source: "Accountant, Northgate Logistics, Mar 2018 - Dec 2020",
      },
    ],
    education: {
      institution: "Fictional National University",
      qualification: "Bachelor of Accountancy",
      year: "2017",
    },
  },
  {
    n: 2,
    name: "Rachel Ng",
    email: "rachel.ng.fictional@example.com",
    phone: "+65 9234 5678",
    location: "Singapore",
    headline: "Finance Manager",
    languages: ["English"],
    skills: [
      ["SAP FICO", "SAP FICO power user since 2016"],
      ["IFRS reporting", "Owned IFRS group reporting for three entities"],
      ["Team leadership", "Managed a team of five accountants"],
    ],
    work: [
      {
        employer: "Harbourline Shipping Pte Ltd",
        title: "Finance Manager",
        start: "2019-06",
        end: null,
        source: "Finance Manager, Harbourline Shipping Pte Ltd, Jun 2019 - Present",
      },
      {
        employer: "Crestpoint Advisory",
        title: "Senior Accountant",
        start: "2015-02",
        end: "2019-05",
        source: "Senior Accountant, Crestpoint Advisory, Feb 2015 - May 2019",
      },
    ],
    education: {
      institution: "Fictional Management University",
      qualification: "Bachelor of Business (Accountancy)",
      year: "2014",
    },
  },
  {
    n: 3,
    name: "Arun Balakrishnan",
    email: "arun.b.fictional@example.com",
    phone: "+65 9345 6789",
    location: "Singapore",
    headline: "Accounts Payable Lead",
    languages: ["English", "Tamil"],
    skills: [
      ["Accounts payable", "Ran a 4,000-invoice monthly AP cycle"],
      ["Excel", "Advanced Excel modelling"],
    ],
    work: [
      {
        employer: "Northgate Logistics",
        title: "Accounts Payable Lead",
        start: "2020-09",
        end: null,
        source: "Accounts Payable Lead, Northgate Logistics, Sep 2020 - Present",
      },
    ],
    education: {
      institution: "Fictional Polytechnic",
      qualification: "Diploma in Accountancy",
      year: "2019",
    },
  },
  {
    n: 4,
    name: "Siti Rahmah",
    email: "siti.rahmah.fictional@example.com",
    phone: "+65 9456 7890",
    location: "Singapore",
    headline: "Group Accountant",
    languages: ["English", "Malay"],
    skills: [
      ["SAP FICO", "SAP FICO consolidation"],
      ["Consolidation", "Consolidated 11 subsidiaries monthly"],
    ],
    work: [
      {
        employer: "Meridian Trading Pte Ltd",
        title: "Group Accountant",
        start: "2022-04",
        end: null,
        source: "Group Accountant, Meridian Trading Pte Ltd, Apr 2022 - Present",
      },
      {
        employer: "Bluerock Manufacturing",
        title: "Accountant",
        start: "2017-08",
        end: "2022-03",
        source: "Accountant, Bluerock Manufacturing, Aug 2017 - Mar 2022",
      },
    ],
    education: {
      institution: "Fictional National University",
      qualification: "Bachelor of Accountancy",
      year: "2017",
    },
  },
  {
    n: 5,
    name: "Marcus Ong",
    email: "marcus.ong.fictional@example.com",
    phone: "+65 9567 8901",
    location: "Singapore",
    headline: "Logistics Operations Manager",
    languages: ["English", "Mandarin"],
    skills: [
      ["Warehouse operations", "Ran a 9,000 sqm distribution centre"],
      ["WMS", "Rolled out a new WMS across two sites"],
      ["Team leadership", "Led 38 warehouse and transport staff"],
    ],
    work: [
      {
        employer: "Eastgate Supply Chain",
        title: "Operations Manager",
        start: "2018-11",
        end: null,
        source: "Operations Manager, Eastgate Supply Chain, Nov 2018 - Present",
      },
    ],
    education: {
      institution: "Fictional Polytechnic",
      qualification: "Diploma in Logistics and Supply Chain",
      year: "2011",
    },
  },
  {
    n: 6,
    name: "Grace Lim",
    email: "grace.lim.fictional@example.com",
    phone: "+65 9678 9012",
    location: "Singapore",
    headline: "Transport Planning Lead",
    languages: ["English"],
    skills: [
      ["Route planning", "Cut last-mile cost per drop by 12%"],
      ["WMS", "WMS and TMS superuser"],
    ],
    work: [
      {
        employer: "Northgate Logistics",
        title: "Transport Planning Lead",
        start: "2021-02",
        end: null,
        source: "Transport Planning Lead, Northgate Logistics, Feb 2021 - Present",
      },
      {
        employer: "Seabridge Freight",
        title: "Planner",
        start: "2016-05",
        end: "2021-01",
        source: "Planner, Seabridge Freight, May 2016 - Jan 2021",
      },
    ],
    education: {
      institution: "Fictional Management University",
      qualification: "Bachelor of Business",
      year: "2016",
    },
  },
  {
    n: 7,
    name: "Daniel Foo",
    email: "daniel.foo.fictional@example.com",
    phone: "+65 9789 0123",
    location: "Johor Bahru, Malaysia",
    headline: "Warehouse Supervisor",
    languages: ["English", "Mandarin"],
    skills: [["Warehouse operations", "Supervised inbound and outbound shifts"]],
    work: [
      {
        employer: "Bluerock Manufacturing",
        title: "Warehouse Supervisor",
        start: "2019-03",
        end: null,
        source: "Warehouse Supervisor, Bluerock Manufacturing, Mar 2019 - Present",
      },
    ],
    education: {
      institution: "Fictional Polytechnic",
      qualification: "Diploma in Logistics",
      year: "2015",
    },
  },
  {
    n: 8,
    name: "李明",
    email: "li.ming.fictional@example.com",
    phone: "+86 138 0013 8000",
    location: "上海",
    headline: "前端工程师",
    languages: ["普通话", "English"],
    skills: [
      ["React", "技能：React、TypeScript、Node.js"],
      ["TypeScript", "技能：React、TypeScript、Node.js"],
      ["Node.js", "技能：React、TypeScript、Node.js"],
    ],
    work: [
      {
        employer: "华辉科技有限公司",
        title: "前端工程师",
        start: "2020-07",
        end: null,
        source: "前端工程师，华辉科技有限公司，2020年7月至今",
      },
    ],
    education: {
      institution: "虚构理工大学",
      qualification: "计算机科学学士",
      year: "2020",
    },
  },
  {
    n: 9,
    name: "王小芸",
    email: "wang.xiaoyun.fictional@example.com",
    phone: "+86 139 0013 9000",
    location: "深圳",
    headline: "高级前端工程师",
    languages: ["普通话", "English"],
    skills: [
      ["React", "熟练使用 React 与 Next.js"],
      ["Next.js", "熟练使用 React 与 Next.js"],
      ["设计系统", "负责公司设计系统组件库"],
    ],
    work: [
      {
        employer: "星野网络科技",
        title: "高级前端工程师",
        start: "2019-04",
        end: null,
        source: "高级前端工程师，星野网络科技，2019年4月至今",
      },
      {
        employer: "华辉科技有限公司",
        title: "前端工程师",
        start: "2016-09",
        end: "2019-03",
        source: "前端工程师，华辉科技有限公司，2016年9月至2019年3月",
      },
    ],
    education: {
      institution: "虚构科技大学",
      qualification: "软件工程学士",
      year: "2016",
    },
  },
  {
    n: 10,
    name: "陈俊豪",
    email: "chen.junhao.fictional@example.com",
    phone: "+86 137 0013 7000",
    location: "北京",
    headline: "全栈工程师",
    languages: ["普通话"],
    skills: [
      ["Vue", "技能：Vue、Node.js"],
      ["Node.js", "技能：Vue、Node.js"],
    ],
    work: [
      {
        employer: "远山信息技术",
        title: "全栈工程师",
        start: "2021-01",
        end: null,
        source: "全栈工程师，远山信息技术，2021年1月至今",
      },
    ],
    education: {
      institution: "虚构理工大学",
      qualification: "信息工程学士",
      year: "2020",
    },
  },
  {
    n: 11,
    name: "Priya Sharma",
    email: "priya.sharma.fictional@example.com",
    phone: "+65 9890 1234",
    location: "Singapore",
    headline: "Finance Manager",
    languages: ["English", "Hindi"],
    skills: [
      ["IFRS reporting", "Prepared IFRS statutory accounts"],
      ["Team leadership", "Led a team of four"],
    ],
    work: [
      {
        employer: "Crestpoint Advisory",
        title: "Finance Manager",
        start: "2018-01",
        end: null,
        source: "Finance Manager, Crestpoint Advisory, Jan 2018 - Present",
      },
    ],
    education: {
      institution: "Fictional Management University",
      qualification: "Bachelor of Accountancy",
      year: "2013",
    },
  },
  {
    n: 12,
    name: "Kelvin Chua",
    email: "kelvin.chua.fictional@example.com",
    phone: "+65 9901 2345",
    location: "Singapore",
    headline: "Assistant Finance Manager",
    languages: ["English", "Mandarin"],
    skills: [["IFRS reporting", "IFRS 16 lease reporting"]],
    work: [
      {
        employer: "Harbourline Shipping Pte Ltd",
        title: "Assistant Finance Manager",
        start: "2020-02",
        end: null,
        source:
          "Assistant Finance Manager, Harbourline Shipping Pte Ltd, Feb 2020 - Present",
      },
    ],
    education: {
      institution: "Fictional National University",
      qualification: "Bachelor of Accountancy",
      year: "2019",
    },
  },
];

type EntrySpec = {
  n: number;
  candidate: number;
  job: number;
  stage: string;
  /** SG working days back-dated from today, so the delay status is stable. */
  workingDaysAgo: number;
  owner: string;
  history: Array<{ from: string | null; to: string }>;
};

/**
 * Back-dating is chosen against DEMO_STAGE_LIMIT_DAYS so that every delay
 * status (on-track, due-soon, overdue) and every stage appears at least once.
 * `demo-data.test.ts` asserts that, so a limit change can't quietly flatten
 * the dashboard.
 */
const ENTRY_SPECS: EntrySpec[] = [
  // Senior Accountant @ Meridian
  { n: 1, candidate: 1, job: 1, stage: "Screening", workingDaysAgo: 7, owner: "Priya Menon", history: [{ from: null, to: "Sourced" }, { from: "Sourced", to: "Screening" }] },
  { n: 2, candidate: 2, job: 1, stage: "Submitted to client", workingDaysAgo: 6, owner: "Priya Menon", history: [{ from: null, to: "Sourced" }, { from: "Sourced", to: "Screening" }, { from: "Screening", to: "Shortlisted" }, { from: "Shortlisted", to: "Submitted to client" }] },
  { n: 3, candidate: 3, job: 1, stage: "Sourced", workingDaysAgo: 1, owner: "Priya Menon", history: [{ from: null, to: "Sourced" }] },
  { n: 4, candidate: 4, job: 1, stage: "Placed", workingDaysAgo: 20, owner: "Priya Menon", history: [{ from: null, to: "Sourced" }, { from: "Sourced", to: "Screening" }, { from: "Screening", to: "Shortlisted" }, { from: "Shortlisted", to: "Submitted to client" }, { from: "Submitted to client", to: "Client interview" }, { from: "Client interview", to: "Offer" }, { from: "Offer", to: "Placed" }] },
  // Logistics Operations Manager @ Northgate
  { n: 5, candidate: 5, job: 2, stage: "Client interview", workingDaysAgo: 13, owner: "Daniel Lim", history: [{ from: null, to: "Sourced" }, { from: "Sourced", to: "Screening" }, { from: "Screening", to: "Shortlisted" }, { from: "Shortlisted", to: "Submitted to client" }, { from: "Submitted to client", to: "Client interview" }] },
  { n: 6, candidate: 6, job: 2, stage: "Offer", workingDaysAgo: 4, owner: "Daniel Lim", history: [{ from: null, to: "Sourced" }, { from: "Sourced", to: "Screening" }, { from: "Screening", to: "Shortlisted" }, { from: "Shortlisted", to: "Submitted to client" }, { from: "Submitted to client", to: "Client interview" }, { from: "Client interview", to: "Offer" }] },
  { n: 7, candidate: 7, job: 2, stage: "Rejected by client", workingDaysAgo: 9, owner: "Daniel Lim", history: [{ from: null, to: "Sourced" }, { from: "Sourced", to: "Screening" }, { from: "Screening", to: "Submitted to client" }, { from: "Submitted to client", to: "Rejected by client" }] },
  // 前端工程师 @ 华辉科技
  { n: 8, candidate: 8, job: 3, stage: "Shortlisted", workingDaysAgo: 1, owner: "Wei Ling Chua", history: [{ from: null, to: "Sourced" }, { from: "Sourced", to: "Screening" }, { from: "Screening", to: "Shortlisted" }] },
  { n: 9, candidate: 9, job: 3, stage: "Screening", workingDaysAgo: 4, owner: "Wei Ling Chua", history: [{ from: null, to: "Sourced" }, { from: "Sourced", to: "Screening" }] },
  { n: 10, candidate: 10, job: 3, stage: "Withdrawn", workingDaysAgo: 6, owner: "Wei Ling Chua", history: [{ from: null, to: "Sourced" }, { from: "Sourced", to: "Withdrawn" }] },
  // Finance Manager @ Meridian
  { n: 11, candidate: 11, job: 4, stage: "Placed", workingDaysAgo: 45, owner: "Daniel Lim", history: [{ from: null, to: "Sourced" }, { from: "Sourced", to: "Screening" }, { from: "Screening", to: "Shortlisted" }, { from: "Shortlisted", to: "Submitted to client" }, { from: "Submitted to client", to: "Client interview" }, { from: "Client interview", to: "Offer" }, { from: "Offer", to: "Placed" }] },
  { n: 12, candidate: 12, job: 4, stage: "Sourced", workingDaysAgo: 5, owner: "Daniel Lim", history: [{ from: null, to: "Sourced" }] },
  { n: 13, candidate: 7, job: 3, stage: "Rejected by agency", workingDaysAgo: 8, owner: "Wei Ling Chua", history: [{ from: null, to: "Sourced" }, { from: "Sourced", to: "Screening" }, { from: "Screening", to: "Rejected by agency" }] },
];

const PARSE_MODEL = "demo-parse-model";

export type BuildDemoSeedOptions = {
  /** "Now". Every relative date is derived from it. */
  today: Date;
  /** SG public holidays as YYYY-MM-DD, from `sg_public_holidays`. */
  holidays: Iterable<string>;
  /**
   * `match_scores.model_version`. Must equal `AI_MODEL_MATCH`, or the app
   * reads every score as stale (src/server/matching/read.ts).
   */
  matchModelVersion: string;
};

export function buildDemoSeed({
  today,
  holidays,
  matchModelVersion,
}: BuildDemoSeedOptions): DemoSeed {
  const createdAt = iso(workingDaysAgo(today, 30, holidays));

  const clients: DemoRow[] = [
    { id: CLIENT(1), name: "Meridian Trading Pte Ltd", guarantee_period_days: 30 },
    { id: CLIENT(2), name: "Northgate Logistics", guarantee_period_days: 60 },
    { id: CLIENT(3), name: "华辉科技有限公司", guarantee_period_days: 30 },
  ];

  const jobs: DemoRow[] = [
    { id: JOB(1), client_id: CLIENT(1), owner_name: "Priya Menon", status: "open", created_at: createdAt },
    { id: JOB(2), client_id: CLIENT(2), owner_name: "Daniel Lim", status: "open", created_at: createdAt },
    { id: JOB(3), client_id: CLIENT(3), owner_name: "Wei Ling Chua", status: "open", created_at: createdAt },
    { id: JOB(4), client_id: CLIENT(1), owner_name: "Daniel Lim", status: "closed", created_at: createdAt },
  ];

  const jobVersions: DemoRow[] = [
    {
      id: VERSION(1),
      job_id: JOB(1),
      created_at: createdAt,
      fields: {
        title: "Senior Accountant",
        location: "Singapore (Tuas)",
        work_arrangement: "On-site, 5 days",
        employment_type: "Permanent",
        headcount: 1,
        start_date: calendarDate(today, 30),
        interview_steps: "One recruiter screen, then two client rounds.",
        // salary_range deliberately absent — it drives the open gap flag below.
      },
      must_haves: [
        { text: "5+ years in a similar accounting role", marking: "must_have" },
        { text: "Hands-on SAP FICO", marking: "must_have" },
      ],
      nice_to_haves: [
        { text: "Group consolidation experience", marking: "nice_to_have" },
        { text: "Manufacturing or trading industry", marking: "nice_to_have" },
      ],
      requires_nationality: false,
      requires_language: false,
    },
    {
      id: VERSION(2),
      job_id: JOB(2),
      created_at: createdAt,
      fields: {
        title: "Logistics Operations Manager",
        location: "Singapore (Jurong)",
        work_arrangement: "On-site",
        employment_type: "Permanent",
        headcount: 1,
        salary_range: "SGD 7,000 - 9,000 per month",
        start_date: calendarDate(today, 45),
        interview_steps: "Recruiter screen, site visit, hiring manager interview.",
      },
      must_haves: [
        { text: "8+ years in warehouse or distribution operations", marking: "must_have" },
        { text: "Managed a team of 20 or more", marking: "must_have" },
      ],
      nice_to_haves: [{ text: "WMS implementation experience", marking: "nice_to_have" }],
      requires_nationality: false,
      requires_language: false,
    },
    {
      id: VERSION(3),
      job_id: JOB(3),
      created_at: createdAt,
      fields: {
        title: "前端工程师",
        location: "Singapore / 上海",
        work_arrangement: "Hybrid, 3 days in office",
        employment_type: "Permanent",
        headcount: 2,
        salary_range: "SGD 6,000 - 8,500 per month",
        start_date: calendarDate(today, 60),
        interview_steps: "Recruiter screen, technical round, team round.",
      },
      must_haves: [
        { text: "4+ years building production React applications", marking: "must_have" },
        { text: "TypeScript", marking: "must_have" },
      ],
      nice_to_haves: [{ text: "Next.js App Router", marking: "nice_to_have" }],
      requires_nationality: false,
      requires_language: true,
      language_reason:
        "The team's product documentation and daily standups with the Shanghai engineering team are conducted in Mandarin, so day-to-day work cannot be done without it.",
    },
    {
      id: VERSION(4),
      job_id: JOB(4),
      created_at: createdAt,
      fields: {
        title: "Finance Manager",
        location: "Singapore (CBD)",
        work_arrangement: "Hybrid, 2 days from home",
        employment_type: "Permanent",
        headcount: 1,
        salary_range: "SGD 9,000 - 11,000 per month",
        start_date: calendarDate(today, 14),
        interview_steps: "Recruiter screen, CFO interview.",
      },
      must_haves: [{ text: "IFRS statutory reporting", marking: "must_have" }],
      nice_to_haves: [{ text: "Shipping or logistics industry", marking: "nice_to_have" }],
      requires_nationality: false,
      requires_language: false,
    },
  ];

  const jobCurrentVersions = [
    { id: JOB(1), current_version_id: VERSION(1) },
    { id: JOB(2), current_version_id: VERSION(2) },
    { id: JOB(3), current_version_id: VERSION(3) },
    { id: JOB(4), current_version_id: VERSION(4) },
  ];

  const gapFlags: DemoRow[] = [
    {
      id: FLAG(1),
      job_version_id: VERSION(1),
      flag_type: "missing",
      reason:
        "Without a salary range, candidates cannot tell if the role is in reach, and recruiters cannot screen or set expectations.",
      suggested_question: "What is the salary range for this role?",
      resolution_state: "open",
    },
    {
      id: FLAG(2),
      job_version_id: VERSION(1),
      flag_type: "uncertain",
      reason:
        "The job description says \"some overseas travel\" without saying how often, so candidates cannot judge whether they can take the role.",
      suggested_question: "How many days of overseas travel per quarter should the candidate expect?",
      resolution_state: "resolved",
      resolution_note: "Client confirmed: roughly one week per quarter to Malaysia.",
      resolved_by: "Priya Menon",
      resolved_at: iso(workingDaysAgo(today, 4, holidays)),
    },
    {
      id: FLAG(3),
      job_version_id: VERSION(2),
      flag_type: "missing",
      reason:
        "No interview steps are recorded, so neither the recruiter nor the candidate knows what the process looks like.",
      suggested_question: "What are the interview steps and who is involved at each one?",
      resolution_state: "open",
    },
    {
      id: FLAG(4),
      job_version_id: VERSION(3),
      flag_type: "fair-employment",
      reason:
        "Mandarin is marked as a real requirement. The written reason must describe the work itself, not a preference, before this job is advertised.",
      suggested_question:
        "Which specific duties require Mandarin, and is a written reason recorded on the job?",
      resolution_state: "open",
    },
  ];

  const stageLimits: DemoRow[] = Object.entries(DEMO_STAGE_LIMIT_DAYS).map(
    ([stage, limitDays], index) => ({
      id: LIMIT(index + 1),
      scope: "default",
      client_id: null,
      job_id: null,
      stage,
      limit_days: limitDays,
    }),
  );
  // One client override, so the resolver's job > client > default order is visible.
  stageLimits.push({
    id: LIMIT(90),
    scope: "client",
    client_id: CLIENT(2),
    job_id: null,
    stage: "Client interview",
    limit_days: 12,
  });

  const candidates: DemoRow[] = [];
  const cvFiles: DemoRow[] = [];
  const candidateProfiles: DemoRow[] = [];
  const candidateSkills: DemoRow[] = [];
  const aiRuns: DemoRow[] = [];
  let skillSeq = 0;

  for (const spec of CANDIDATE_SPECS) {
    const parsedAt = iso(workingDaysAgo(today, 10 + spec.n, holidays));
    const parseStatus = spec.parseStatus ?? "parsed";
    const runId = AI_RUN(spec.n);

    candidates.push({
      id: CANDIDATE(spec.n),
      full_name: spec.name,
      email: spec.email,
      phone: spec.phone,
      last_activity_at: parsedAt,
      created_at: parsedAt,
    });

    aiRuns.push({
      id: runId,
      step: "parse-cv",
      provider: "demo",
      model_id: PARSE_MODEL,
      model_version: PARSE_MODEL,
      prompt_version: "v1",
      input_ref: `cv_files:${CV_FILE(spec.n)}`,
      output: { fields_filled: 6 + spec.skills.length },
      status: "succeeded",
      input_tokens: 1800,
      output_tokens: 420,
      cost_usd: 0.0031,
      duration_ms: 2400,
      created_at: parsedAt,
      completed_at: parsedAt,
    });

    cvFiles.push({
      id: CV_FILE(spec.n),
      candidate_id: CANDIDATE(spec.n),
      source: "demo-seed",
      source_ref: `demo/${spec.name}.pdf`,
      source_hash: `demo-hash-${spec.n}`,
      storage_path: `demo/${CANDIDATE(spec.n)}.pdf`,
      doc_kind: "cv",
      language: /[㐀-鿿]/.test(spec.name) ? "zh" : "en",
      parse_status: parseStatus,
      parse_error: spec.parseError ?? null,
      attempt_count: parseStatus === "parsed" ? 1 : 2,
      last_attempted_at: parsedAt,
      created_at: parsedAt,
    });

    candidateProfiles.push({
      id: PROFILE(spec.n),
      candidate_id: CANDIDATE(spec.n),
      cv_file_id: CV_FILE(spec.n),
      ai_run_id: runId,
      created_at: parsedAt,
      updated_at: parsedAt,
      parsed: {
        name: spec.name,
        name_source_text: spec.name,
        email: spec.email,
        email_source_text: spec.email,
        phone: spec.phone,
        phone_source_text: spec.phone,
        location: spec.location,
        location_source_text: spec.location,
        headline: spec.headline,
        work_history: spec.work.map((role) => ({
          employer: role.employer,
          employer_source_text: role.employer,
          job_title: role.title,
          job_title_source_text: role.title,
          start: role.start,
          end: role.end,
          current: role.end === null,
          source_text: role.source,
        })),
        education: [
          {
            institution: spec.education.institution,
            qualification: spec.education.qualification,
            year: spec.education.year,
            source_text: `${spec.education.qualification}, ${spec.education.institution}, ${spec.education.year}`,
          },
        ],
        certifications: [],
        skills: spec.skills.map(([skill, source]) => ({ skill, source_text: source })),
        languages_spoken: spec.languages,
        prompt_injection_detected: false,
        prompt_injection_note: null,
      },
      overrides: {},
    });

    for (const [skill, source] of spec.skills) {
      skillSeq += 1;
      candidateSkills.push({
        id: SKILL(skillSeq),
        candidate_id: CANDIDATE(spec.n),
        skill,
        source_text: source,
        ai_run_id: runId,
        created_at: parsedAt,
      });
    }
  }

  // Two files for the CV review queue: one retryable error, one definitive rejection.
  const failedAt = iso(workingDaysAgo(today, 2, holidays));
  cvFiles.push(
    {
      id: CV_FILE(91),
      candidate_id: null,
      source: "demo-seed",
      source_ref: "demo/Unreadable Scan.pdf",
      source_hash: "demo-hash-91",
      storage_path: "demo/unreadable-scan.pdf",
      doc_kind: "cv",
      language: null,
      parse_status: "rejected",
      parse_error: "The file is a scanned image with no selectable text.",
      attempt_count: 1,
      last_attempted_at: failedAt,
      created_at: failedAt,
    },
    {
      id: CV_FILE(92),
      candidate_id: CANDIDATE(3),
      source: "demo-seed",
      source_ref: "demo/Arun Balakrishnan (v2).docx",
      source_hash: "demo-hash-92",
      storage_path: "demo/arun-balakrishnan-v2.docx",
      doc_kind: "cv",
      language: "en",
      parse_status: "error",
      parse_error: "Extraction timed out. Retry from the review queue.",
      attempt_count: 2,
      last_attempted_at: failedAt,
      created_at: failedAt,
    },
  );

  // Scores for the two jobs whose ranked list the demo shows. Capped scores
  // carry raw_score above the cap, the way a missing must-have is recorded.
  const scoredAt = iso(workingDaysAgo(today, 3, holidays));
  const scoreSpecs: Array<{
    n: number;
    candidate: number;
    version: Uuid;
    score: number;
    raw?: number;
    matched: string[];
    missing: string[];
    uncertain: string[];
  }> = [
    { n: 1, candidate: 1, version: VERSION(1), score: 88, matched: ["Hands-on SAP FICO", "5+ years in a similar accounting role"], missing: [], uncertain: ["Group consolidation experience"] },
    { n: 2, candidate: 2, version: VERSION(1), score: 81, matched: ["Hands-on SAP FICO", "5+ years in a similar accounting role"], missing: [], uncertain: [] },
    { n: 3, candidate: 4, version: VERSION(1), score: 74, matched: ["Hands-on SAP FICO", "Group consolidation experience"], missing: [], uncertain: ["5+ years in a similar accounting role"] },
    { n: 4, candidate: 3, version: VERSION(1), score: 50, raw: 68, matched: ["Accounts payable depth"], missing: ["Hands-on SAP FICO"], uncertain: [] },
    { n: 5, candidate: 9, version: VERSION(3), score: 91, matched: ["4+ years building production React applications", "TypeScript"], missing: [], uncertain: [] },
    { n: 6, candidate: 8, version: VERSION(3), score: 79, matched: ["4+ years building production React applications", "TypeScript"], missing: [], uncertain: ["Next.js App Router"] },
    { n: 7, candidate: 10, version: VERSION(3), score: 50, raw: 61, matched: ["Node.js"], missing: ["4+ years building production React applications"], uncertain: [] },
  ];

  const matchScores: DemoRow[] = scoreSpecs.map((spec) => ({
    id: SCORE(spec.n),
    candidate_id: CANDIDATE(spec.candidate),
    job_version_id: spec.version,
    model_version: matchModelVersion,
    score: spec.score,
    raw_score: spec.raw ?? spec.score,
    matched: spec.matched,
    missing: spec.missing,
    uncertain: spec.uncertain,
    ai_run_id: AI_RUN(50 + spec.n),
    created_at: scoredAt,
  }));

  for (const spec of scoreSpecs) {
    aiRuns.push({
      id: AI_RUN(50 + spec.n),
      step: "match-score",
      provider: "demo",
      model_id: matchModelVersion,
      model_version: matchModelVersion,
      prompt_version: "v1",
      input_ref: `candidate:${CANDIDATE(spec.candidate)} job_version:${spec.version}`,
      output: { score: spec.score },
      status: "succeeded",
      input_tokens: 2600,
      output_tokens: 300,
      cost_usd: 0.0042,
      duration_ms: 3100,
      created_at: scoredAt,
      completed_at: scoredAt,
    });
  }

  const pipelineEntries: DemoRow[] = [];
  const stageEvents: DemoRow[] = [];
  let eventSeq = 0;

  for (const spec of ENTRY_SPECS) {
    const enteredAt = workingDaysAgo(today, spec.workingDaysAgo, holidays);
    pipelineEntries.push({
      id: ENTRY(spec.n),
      candidate_id: CANDIDATE(spec.candidate),
      job_id: JOB(spec.job),
      stage: spec.stage,
      entered_at: iso(enteredAt),
      owner_name: spec.owner,
      created_at: iso(enteredAt),
    });

    // History runs backwards from entered_at, one working day per step.
    const steps = spec.history.length;
    spec.history.forEach((step, index) => {
      eventSeq += 1;
      const at = workingDaysAgo(
        today,
        spec.workingDaysAgo + (steps - 1 - index),
        holidays,
      );
      stageEvents.push({
        id: EVENT(eventSeq),
        pipeline_entry_id: ENTRY(spec.n),
        from_stage: step.from,
        to_stage: step.to,
        recruiter_name: spec.owner,
        created_at: iso(at),
      });
    });
  }

  // One guarantee ending soon (3 calendar days out) and one already ended.
  const placements: DemoRow[] = [
    {
      id: PLACEMENT(1),
      pipeline_entry_id: ENTRY(4),
      start_date: calendarDate(today, -27),
      guarantee_period_days: 30,
      guarantee_end_date: calendarDate(today, 3),
      recruiter_name: "Priya Menon",
    },
    {
      id: PLACEMENT(2),
      pipeline_entry_id: ENTRY(11),
      start_date: calendarDate(today, -75),
      guarantee_period_days: 60,
      guarantee_end_date: calendarDate(today, -15),
      recruiter_name: "Daniel Lim",
    },
  ];

  const settingsLog: DemoRow[] = [
    {
      id: SETTING(1),
      setting_key: "stage_limits.default.Screening",
      old_value: 4,
      new_value: DEMO_STAGE_LIMIT_DAYS.Screening,
      recruiter_name: "Priya Menon",
      created_at: iso(workingDaysAgo(today, 12, holidays)),
    },
    {
      id: SETTING(2),
      setting_key: "stage_limits.client.Client interview",
      old_value: 10,
      new_value: 12,
      recruiter_name: "Daniel Lim",
      created_at: iso(workingDaysAgo(today, 6, holidays)),
    },
  ];

  return {
    clients,
    jobs,
    jobVersions,
    jobCurrentVersions,
    gapFlags,
    stageLimits,
    candidates,
    cvFiles,
    candidateProfiles,
    candidateSkills,
    aiRuns,
    matchScores,
    pipelineEntries,
    stageEvents,
    placements,
    settingsLog,
  };
}
