export const REDACTED = "[redacted]";
const LONG_TEXT = "[redacted: long text]";

export const PERSONAL_FIELD_NAMES: readonly string[] = [
  "name",
  "full_name",
  "first_name",
  "last_name",
  "email",
  "phone",
  "mobile",
  "address",
  "nric",
  "passport",
  "dob",
  "date_of_birth",
  "age",
  "gender",
  "nationality",
  "marital_status",
  "photo",
  "cv",
  "cv_text",
  "resume",
  "source_text",
  "prompt",
  "completion",
  "candidate",
];

const PERSONAL_FIELD_PATTERN = new RegExp(
  `\\b(?:${PERSONAL_FIELD_NAMES.join("|")})\\b`,
  "i",
);

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

export type ScrubbableEvent = {
  message?: unknown;
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
  exception?: { values?: { value?: string }[] };
};

export type ScrubbableBreadcrumb = {
  message?: unknown;
  data?: Record<string, unknown>;
};

function isPersonalFieldName(key: string): boolean {
  return PERSONAL_FIELD_PATTERN.test(key);
}

function redactSecretsAndEmails(value: string): string {
  const withoutSecrets = value.replace(
    new RegExp(SECRET_SHAPE_SOURCE, "g"),
    REDACTED,
  );
  return withoutSecrets.replace(EMAIL_PATTERN, "[email]");
}

export function scrubValue(value: unknown, key?: string): unknown {
  if (key !== undefined && isPersonalFieldName(key)) {
    return REDACTED;
  }

  if (typeof value === "string") {
    const redacted = redactSecretsAndEmails(value);
    if (redacted.length > 500) {
      return LONG_TEXT;
    }
    return redacted;
  }

  if (Array.isArray(value)) {
    return value.map((item) => scrubValue(item));
  }

  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [childKey, childValue] of Object.entries(value)) {
      result[childKey] = scrubValue(childValue, childKey);
    }
    return result;
  }

  return value;
}

function stripQueryFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    const queryIndex = url.indexOf("?");
    return queryIndex === -1 ? url : url.slice(0, queryIndex);
  }
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
      if (item.value === undefined) {
        return { ...item };
      }
      return {
        ...item,
        value: scrubValue(item.value) as string,
      };
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
