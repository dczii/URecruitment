export type DocumentKind = "cv" | "job_description" | "unclassified";

export type ClassifyResult = {
  kind: DocumentKind;
  confidence: number;
  reason: string;
};

/** Same bar the tests assert: below this, never guess `cv` or `job_description`. */
const CONFIDENT_THRESHOLD = 0.6;

const TOP_CONTACT_LINES = 10;

const CV_EXPERIENCE_HEADERS = [
  /^experience$/,
  /^work\s+experience$/,
  /^professional\s+experience$/,
  /^employment(\s+history)?$/,
  /^工作经历$/,
  /^工作经验$/,
  /^职业经历$/,
];

const CV_EDUCATION_HEADERS = [
  /^education$/,
  /^educational\s+background$/,
  /^academic\s+background$/,
  /^教育背景$/,
  /^教育经历$/,
  /^学历$/,
];

const CV_OBJECTIVE_HEADERS = [
  /^(career\s+)?objective$/,
  /^(professional\s+)?summary$/,
  /^profile$/,
  /^personal\s+(profile|statement|summary)$/,
  /^个人简介$/,
  /^个人概况$/,
  /^求职意向$/,
  /^自我评价$/,
];

const JD_RESPONSIBILITY_HEADERS = [
  /^responsibilities$/,
  /^key\s+responsibilities$/,
  /^duties$/,
  /^role\s+responsibilities$/,
  /^(?:岗位|工作)?职责$/,
];

const JD_REQUIREMENT_HEADERS = [
  /^requirements$/,
  /^key\s+requirements$/,
  /^qualifications$/,
  /^(?:任职|岗位|职位)?要求$/,
  /^任职资格$/,
];

const JD_LOOKING_FOR = /we(?:['’]re| are) looking for|we are hiring|我们正在寻找|我们诚聘/i;

const JD_REPORTING_TO = /reporting to|reports to|汇报对象|向\S{1,20}汇报/i;

const JOB_TITLE_LINE =
  /^(job\s*title|position(?:\s*title)?|role|职位(?:名称)?|岗位(?:名称)?)\s*[:：]\s*\S/i;

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const EMAIL_LABEL_RE = /(?:e-?mail|邮箱)\s*[:：]/i;
const PHONE_LABEL_RE = /(?:phone|tel(?:ephone)?|mobile|电话|手机)\s*[:：]/i;
const PHONE_NUMBER_RE = /\+\d{1,3}[\s.-]?\d/;

const DATE_RANGE_WITH_ORG =
  /\b(?:19|20)\d{2}\s*[–—−-]\s*(?:(?:19|20)\d{2}|present|now|current|至今)\s+[^\s\d].+/u;

const CV_WEIGHTS = {
  experienceHeader: 0.32,
  educationHeader: 0.32,
  objectiveHeader: 0.18,
  contactEmail: 0.18,
  contactPhone: 0.14,
  dateRanges: 0.22,
} as const;

const JD_WEIGHTS = {
  responsibilitiesHeader: 0.32,
  requirementsHeader: 0.32,
  lookingFor: 0.22,
  reportingTo: 0.18,
  jobTitleLine: 0.22,
} as const;

type MarkerScore = {
  score: number;
  markers: string[];
};

function clampConfidence(value: number): number {
  return Math.min(1, Math.max(0, Math.round(value * 100) / 100));
}

function matchesAny(value: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(value));
}

function headerLines(text: string): string[] {
  return text.split(/\r?\n/).map((line) =>
    line
      .trim()
      .replace(/^[-*•·]\s+/, "")
      .replace(/[:：]\s*$/, "")
      .toLowerCase(),
  );
}

function topBlock(text: string): string {
  return text.split(/\r?\n/).slice(0, TOP_CONTACT_LINES).join("\n");
}

function scoreCv(text: string): MarkerScore {
  const headers = headerLines(text);
  const top = topBlock(text);
  const markers: string[] = [];
  let score = 0;

  if (headers.some((line) => matchesAny(line, CV_EXPERIENCE_HEADERS))) {
    score += CV_WEIGHTS.experienceHeader;
    markers.push("experience section header");
  }
  if (headers.some((line) => matchesAny(line, CV_EDUCATION_HEADERS))) {
    score += CV_WEIGHTS.educationHeader;
    markers.push("education section header");
  }
  if (headers.some((line) => matchesAny(line, CV_OBJECTIVE_HEADERS))) {
    score += CV_WEIGHTS.objectiveHeader;
    markers.push("objective/summary section header");
  }
  if (EMAIL_RE.test(top) || EMAIL_LABEL_RE.test(top)) {
    score += CV_WEIGHTS.contactEmail;
    markers.push("email in the top contact block");
  }
  if (PHONE_LABEL_RE.test(top) || PHONE_NUMBER_RE.test(top)) {
    score += CV_WEIGHTS.contactPhone;
    markers.push("phone in the top contact block");
  }

  const dateRangeLines = text
    .split(/\r?\n/)
    .filter((line) => DATE_RANGE_WITH_ORG.test(line.trim()));
  if (dateRangeLines.length >= 2) {
    score += CV_WEIGHTS.dateRanges;
    markers.push("date ranges next to organisation names");
  } else if (dateRangeLines.length === 1) {
    score += CV_WEIGHTS.dateRanges / 2;
    markers.push("a date range next to an organisation name");
  }

  return { score: clampConfidence(score), markers };
}

function scoreJobDescription(text: string): MarkerScore {
  const headers = headerLines(text);
  const markers: string[] = [];
  let score = 0;

  if (headers.some((line) => matchesAny(line, JD_RESPONSIBILITY_HEADERS))) {
    score += JD_WEIGHTS.responsibilitiesHeader;
    markers.push("responsibilities section header");
  }
  if (headers.some((line) => matchesAny(line, JD_REQUIREMENT_HEADERS))) {
    score += JD_WEIGHTS.requirementsHeader;
    markers.push("requirements section header");
  }
  if (JD_LOOKING_FOR.test(text)) {
    score += JD_WEIGHTS.lookingFor;
    markers.push('"we are looking for" phrasing');
  }
  if (JD_REPORTING_TO.test(text)) {
    score += JD_WEIGHTS.reportingTo;
    markers.push('"reporting to" phrasing');
  }
  if (text.split(/\r?\n/).some((line) => JOB_TITLE_LINE.test(line.trim()))) {
    score += JD_WEIGHTS.jobTitleLine;
    markers.push("job title line");
  }

  return { score: clampConfidence(score), markers };
}

function unclassifiedReason(cv: MarkerScore, jd: MarkerScore): string {
  if (cv.markers.length === 0 && jd.markers.length === 0) {
    return "no CV or job-description markers found";
  }
  return "markers for both were weak/ambiguous";
}

export function classifyDocument(text: string): ClassifyResult {
  const cv = scoreCv(text);
  const jd = scoreJobDescription(text);

  const cvConfident = cv.score >= CONFIDENT_THRESHOLD;
  const jdConfident = jd.score >= CONFIDENT_THRESHOLD;

  if (cvConfident && !jdConfident) {
    return {
      kind: "cv",
      confidence: cv.score,
      reason: `Matched CV markers: ${cv.markers.join(", ")}.`,
    };
  }

  if (jdConfident && !cvConfident) {
    return {
      kind: "job_description",
      confidence: jd.score,
      reason: `Matched job-description markers: ${jd.markers.join(", ")}.`,
    };
  }

  if (cvConfident && jdConfident) {
    return {
      kind: "unclassified",
      confidence: clampConfidence(Math.abs(cv.score - jd.score)),
      reason: "markers for both were weak/ambiguous",
    };
  }

  return {
    kind: "unclassified",
    confidence: Math.max(cv.score, jd.score),
    reason: unclassifiedReason(cv, jd),
  };
}
