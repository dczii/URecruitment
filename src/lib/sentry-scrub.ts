export const REDACTED = "[redacted]";
const LONG_TEXT = "[redacted: long text]";
const CYCLE = "[redacted: cycle]";
const TOO_DEEP = "[redacted: too deep]";

const MAX_DEPTH = 12;

/**
 * Key segments that mark a value as personal or otherwise not for Sentry.
 *
 * Matching is per segment, so `candidateName`, `candidate_name` and
 * `CANDIDATE-NAME` all hit `name`, while `filename` and `hostname` do not:
 * they are single segments that happen to end in those letters.
 */
const PERSONAL_KEY_SEGMENTS: readonly string[] = [
  // identity and contact
  "name",
  "email",
  "phone",
  "mobile",
  "tel",
  "address",
  "postcode",
  "nric",
  "fin",
  "passport",
  "dob",
  "birthday",
  "birthdate",
  "age",
  "photo",
  "avatar",
  // protected attributes (CLAUDE.md hard rule 5 + compliance-review)
  "gender",
  "sex",
  "race",
  "ethnicity",
  "religion",
  "nationality",
  "marital",
  "pregnancy",
  "pregnant",
  "caregiving",
  "disability",
  // candidate content and AI payloads
  "cv",
  "resume",
  "candidate",
  "applicant",
  "prompt",
  "completion",
];

/** Matched against the key with every separator removed, e.g. `source_text` → `sourcetext`. */
const PERSONAL_KEY_PHRASES: readonly string[] = [
  "sourcetext",
  "dateofbirth",
  "maritalstatus",
  "mentalhealth",
  "fullname",
];

/** Kept for callers that want the vocabulary; the matcher uses the two lists above. */
export const PERSONAL_FIELD_NAMES: readonly string[] = [
  ...PERSONAL_KEY_SEGMENTS,
  ...PERSONAL_KEY_PHRASES,
];

const SECRET_SHAPE_SOURCE = [
  "sb_secret_\\S+",
  "sb_publishable_\\S+",
  "sk-[A-Za-z0-9]{10,}",
  "eyJ[A-Za-z0-9_-]{10,}(?:\\.[A-Za-z0-9_-]+)*",
  "vercel_blob_rw_\\S+",
  "Bearer\\s+\\S+",
  "https?:\\/\\/\\S*\\.public\\.blob\\.vercel-storage\\.com\\S*",
].join("|");

const EMAIL_PATTERN = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
/** Singapore NRIC / FIN, e.g. S1234567D. */
const NRIC_PATTERN = /\b[STFGM]\d{7}[A-Z]\b/g;
/** Singapore mobile / landline, with or without the +65 country code. */
const SG_PHONE_PATTERN = /(?:\+?65[\s-]?)?\b[689]\d{3}[\s-]?\d{4}\b/g;

export type ScrubbableEvent = {
  message?: unknown;
  logentry?: unknown;
  transaction?: unknown;
  server_name?: unknown;
  breadcrumbs?: unknown;
  request?: {
    url?: string;
    data?: unknown;
    cookies?: unknown;
    headers?: unknown;
    query_string?: unknown;
  };
  extra?: Record<string, unknown>;
  contexts?: Record<string, unknown>;
  tags?: Record<string, unknown>;
  user?: unknown;
  exception?: { values?: { value?: string; stacktrace?: unknown }[] };
};

export type ScrubbableBreadcrumb = {
  message?: unknown;
  data?: Record<string, unknown>;
};

/** Split a key into lower-case words: `candidateCvText` → ["candidate","cv","text"]. */
function keySegments(key: string): string[] {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .split(/[^A-Za-z0-9]+/)
    .filter((part) => part.length > 0)
    .map((part) => part.toLowerCase());
}

export function isPersonalFieldName(key: string): boolean {
  const segments = keySegments(key);
  if (segments.some((segment) => PERSONAL_KEY_SEGMENTS.includes(segment))) {
    return true;
  }
  const squashed = segments.join("");
  return PERSONAL_KEY_PHRASES.some((phrase) => squashed.includes(phrase));
}

function redactSecretsAndEmails(value: string): string {
  return value
    .replace(new RegExp(SECRET_SHAPE_SOURCE, "g"), REDACTED)
    .replace(EMAIL_PATTERN, "[email]")
    .replace(NRIC_PATTERN, "[id]")
    .replace(SG_PHONE_PATTERN, "[phone]");
}

function scrubInner(
  value: unknown,
  key: string | undefined,
  depth: number,
  seen: WeakSet<object>,
): unknown {
  if (key !== undefined && isPersonalFieldName(key)) {
    return REDACTED;
  }

  if (typeof value === "string") {
    const redacted = redactSecretsAndEmails(value);
    return redacted.length > 500 ? LONG_TEXT : redacted;
  }

  if (value === null || typeof value !== "object") {
    return value;
  }

  if (depth >= MAX_DEPTH) {
    return TOO_DEEP;
  }
  if (seen.has(value)) {
    return CYCLE;
  }
  seen.add(value);

  try {
    if (Array.isArray(value)) {
      return value.map((item) => scrubInner(item, undefined, depth + 1, seen));
    }

    const result: Record<string, unknown> = {};
    for (const [childKey, childValue] of Object.entries(value)) {
      result[childKey] = scrubInner(childValue, childKey, depth + 1, seen);
    }
    return result;
  } finally {
    seen.delete(value);
  }
}

export function scrubValue(value: unknown, key?: string): unknown {
  return scrubInner(value, key, 0, new WeakSet());
}

function stripQueryFromUrl(url: string): string {
  let withoutQuery: string;
  try {
    const parsed = new URL(url);
    withoutQuery = `${parsed.origin}${parsed.pathname}`;
  } catch {
    const queryIndex = url.indexOf("?");
    withoutQuery = queryIndex === -1 ? url : url.slice(0, queryIndex);
  }
  // The path itself can carry an email, an NRIC or a token.
  return redactSecretsAndEmails(withoutQuery);
}

function scrubRequest(
  request: NonNullable<ScrubbableEvent["request"]>,
): NonNullable<ScrubbableEvent["request"]> {
  const next: NonNullable<ScrubbableEvent["request"]> = { ...request };
  delete next.data;
  delete next.cookies;
  delete next.headers;
  delete next.query_string;
  if (typeof next.url === "string") {
    next.url = stripQueryFromUrl(next.url);
  }
  return next;
}

function scrubException(
  exception: NonNullable<ScrubbableEvent["exception"]>,
): NonNullable<ScrubbableEvent["exception"]> {
  if (!Array.isArray(exception.values)) {
    return { ...exception };
  }

  return {
    ...exception,
    values: exception.values.map((item) => {
      if (item === undefined || item === null || typeof item !== "object") {
        return item;
      }
      const next = { ...item };
      if (next.value !== undefined) {
        next.value = scrubValue(next.value) as string;
      }
      // Local variables are off today (`includeLocalVariables` is unset), but if
      // they are ever turned on every local in a failing frame ships to Sentry.
      if (next.stacktrace !== undefined) {
        next.stacktrace = scrubStacktrace(next.stacktrace);
      }
      return next;
    }),
  };
}

function scrubStacktrace(stacktrace: unknown): unknown {
  if (stacktrace === null || typeof stacktrace !== "object") {
    return stacktrace;
  }
  const frames = (stacktrace as { frames?: unknown }).frames;
  if (!Array.isArray(frames)) {
    return stacktrace;
  }
  return {
    ...stacktrace,
    frames: frames.map((frame) => {
      if (frame === null || typeof frame !== "object") {
        return frame;
      }
      const vars = (frame as { vars?: unknown }).vars;
      if (vars === undefined) {
        return frame;
      }
      return { ...frame, vars: scrubValue(vars) };
    }),
  };
}

export function scrubEvent<T extends ScrubbableEvent>(event: T): T {
  const next: ScrubbableEvent = { ...event };

  if (event.request !== undefined && event.request !== null) {
    if (typeof event.request === "object") {
      next.request = scrubRequest(event.request);
    }
  }

  if (event.extra !== undefined) {
    next.extra = scrubValue(event.extra) as Record<string, unknown>;
  }
  if (event.contexts !== undefined) {
    next.contexts = scrubValue(event.contexts) as Record<string, unknown>;
  }
  if (event.tags !== undefined) {
    next.tags = scrubValue(event.tags) as Record<string, unknown>;
  }
  if (event.message !== undefined) {
    next.message = scrubValue(event.message);
  }
  if (event.logentry !== undefined) {
    next.logentry = scrubValue(event.logentry);
  }
  if (event.transaction !== undefined) {
    next.transaction = scrubValue(event.transaction);
  }
  if (event.server_name !== undefined) {
    next.server_name = scrubValue(event.server_name);
  }
  if (event.breadcrumbs !== undefined) {
    next.breadcrumbs = scrubValue(event.breadcrumbs);
  }
  if (event.exception !== undefined && event.exception !== null) {
    if (typeof event.exception === "object") {
      next.exception = scrubException(event.exception);
    }
  }

  next.user = undefined;
  return next as T;
}

export function scrubBreadcrumb<T extends ScrubbableBreadcrumb>(
  breadcrumb: T,
): T {
  const next: ScrubbableBreadcrumb = { ...breadcrumb };
  if (breadcrumb.message !== undefined) {
    next.message = scrubValue(breadcrumb.message);
  }
  if (breadcrumb.data !== undefined) {
    next.data = scrubValue(breadcrumb.data) as Record<string, unknown>;
  }
  return next as T;
}
