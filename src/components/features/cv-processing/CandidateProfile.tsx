import { AiSuggestion } from "@/components/patterns/AiSuggestion";
import { SourceQuote } from "@/components/patterns/SourceQuote";

import { OriginalCvLink } from "./OriginalCvLink";

const CJK_CHAR = /[\u3400-\u9FFF\uF900-\uFAFF]/;

const sgtDateTimeFormatter = new Intl.DateTimeFormat("en-SG", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Singapore",
});

const SCALAR_FIELDS = [
  { key: "name", sourceKey: "name_source_text", label: "Name" },
  { key: "email", sourceKey: "email_source_text", label: "Email" },
  { key: "phone", sourceKey: "phone_source_text", label: "Phone" },
  { key: "location", sourceKey: "location_source_text", label: "Location" },
] as const;

type ProfileRecord = Record<string, unknown>;

type StageEvent = {
  recruiter_name: string;
  from_stage: string | null;
  to_stage: string;
  created_at: string;
};

type CandidateProfileProps = {
  candidateId: string;
  data: {
    parseStatus: "ready" | "not_yet_parsed";
    identity: {
      name: unknown;
      email: unknown;
      phone: unknown;
      location: unknown;
    } | null;
    profile: { effective: ProfileRecord; parsed: ProfileRecord } | null;
    skills: { skill: string; source_text: string }[];
    stageHistory: StageEvent[];
  };
};

export function CandidateProfile({ candidateId, data }: CandidateProfileProps) {
  const { parseStatus, identity, profile, skills, stageHistory } = data;
  const effective = asRecord(profile?.effective);
  const parsed = asRecord(profile?.parsed);
  const displayName =
    stringValue(identity?.name) ?? stringValue(effective.name) ?? "Candidate";
  const role = currentRole(effective);
  const nameLang = sourceLang(displayName);

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-6">
      <header className="flex min-w-0 flex-col gap-3">
        <h1
          className="font-heading text-title font-semibold break-words"
          lang={nameLang === "zh-Hans" ? "zh-Hans" : undefined}
        >
          {displayName}
        </h1>
        {role ? (
          <p
            className="text-body text-muted-foreground break-words"
            lang={sourceLang(role) === "zh-Hans" ? "zh-Hans" : undefined}
          >
            {role}
          </p>
        ) : null}
        <OriginalCvLink candidateId={candidateId} />
      </header>

      {parseStatus === "not_yet_parsed" ? (
        <p className="text-body text-muted-foreground">
          This candidate has not been parsed yet.
        </p>
      ) : (
        <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)]">
          <div className="flex min-w-0 flex-col gap-6">
            {SCALAR_FIELDS.map((field) => {
              const value = stringValue(effective[field.key]);
              if (!value) {
                return null;
              }
              return (
                <FieldCard
                  key={field.key}
                  label={field.label}
                  value={value}
                  parsedValue={stringValue(parsed[field.key])}
                  sourceText={stringValue(parsed[field.sourceKey])}
                />
              );
            })}

            <TotalYearsCard effective={effective} parsed={parsed} />

            <EntrySection
              title="Work history"
              itemLabel="Role"
              entries={asObjectArray(effective.work_history)}
              parsedEntries={asObjectArray(parsed.work_history)}
              renderValue={formatWorkHistory}
              sourceTextOf={entrySourceText}
            />

            <EntrySection
              title="Education"
              itemLabel="Education"
              entries={asObjectArray(effective.education)}
              parsedEntries={asObjectArray(parsed.education)}
              renderValue={formatEducation}
              sourceTextOf={entrySourceText}
            />

            <EntrySection
              title="Certifications"
              itemLabel="Certification"
              entries={asObjectArray(effective.certifications)}
              parsedEntries={asObjectArray(parsed.certifications)}
              renderValue={formatCertification}
              sourceTextOf={entrySourceText}
            />

            <LanguagesCard
              languages={asStringArray(effective.languages_spoken)}
              parsedLanguages={asStringArray(parsed.languages_spoken)}
            />

            {skills.length > 0 ? (
              <section className="flex min-w-0 flex-col gap-3">
                <h2 className="font-heading text-heading font-semibold">
                  Skills
                </h2>
                <ul className="flex min-w-0 flex-col gap-3">
                  {skills.map((skill, index) => (
                    <li key={`${skill.skill}-${index}`}>
                      <FieldCard
                        label="Skill"
                        value={skill.skill}
                        parsedValue={skill.skill}
                        sourceText={skill.source_text}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>

          <StageHistory events={stageHistory} />
        </div>
      )}

      {parseStatus === "not_yet_parsed" ? (
        <StageHistory events={stageHistory} />
      ) : null}
    </section>
  );
}

function TotalYearsCard({
  effective,
  parsed,
}: {
  effective: ProfileRecord;
  parsed: ProfileRecord;
}) {
  const value = formatTotalYears(effective.total_years ?? parsed.total_years);
  if (!value) {
    return null;
  }
  const workHistorySources = asObjectArray(parsed.work_history)
    .map(entrySourceText)
    .filter((text): text is string => text !== null);
  return (
    <FieldCard
      label="Total experience"
      value={value}
      parsedValue={formatTotalYears(parsed.total_years)}
      sourceText={
        workHistorySources.length > 0 ? workHistorySources.join(" · ") : null
      }
    />
  );
}

function LanguagesCard({
  languages,
  parsedLanguages,
}: {
  languages: string[];
  parsedLanguages: string[];
}) {
  if (languages.length === 0) {
    return null;
  }
  return (
    <FieldCard
      label="Languages"
      value={languages.join(", ")}
      parsedValue={
        parsedLanguages.length > 0 ? parsedLanguages.join(", ") : null
      }
      sourceText={null}
    />
  );
}

function EntrySection({
  title,
  itemLabel,
  entries,
  parsedEntries,
  renderValue,
  sourceTextOf,
}: {
  title: string;
  itemLabel: string;
  entries: ProfileRecord[];
  parsedEntries: ProfileRecord[];
  renderValue: (entry: ProfileRecord) => string | null;
  sourceTextOf: (entry: ProfileRecord) => string | null;
}) {
  if (entries.length === 0) {
    return null;
  }
  return (
    <section className="flex min-w-0 flex-col gap-3">
      <h2 className="font-heading text-heading font-semibold">{title}</h2>
      <ul className="flex min-w-0 flex-col gap-3">
        {entries.map((entry, index) => {
          const value = renderValue(entry);
          if (!value) {
            return null;
          }
          const parsedEntry = parsedEntries[index] ?? {};
          return (
            <li key={`${title}-${index}`}>
              <FieldCard
                label={itemLabel}
                value={value}
                parsedValue={renderValue(parsedEntry)}
                sourceText={sourceTextOf(parsedEntry) ?? sourceTextOf(entry)}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function FieldCard({
  label,
  value,
  parsedValue,
  sourceText,
}: {
  label: string;
  value: string;
  parsedValue: string | null;
  sourceText: string | null;
}) {
  const edited = parsedValue !== null && parsedValue !== value;
  const valueLang = sourceLang(value);

  return (
    <article className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <h3 className="text-label text-muted-foreground">{label}</h3>
      {edited ? (
        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-body whitespace-pre-line break-words">
            <span className="text-muted-foreground line-through">
              {parsedValue}
            </span>
            <span aria-hidden="true"> → </span>
            <span lang={valueLang === "zh-Hans" ? "zh-Hans" : undefined}>
              {value}
            </span>
          </p>
          <p className="w-fit rounded-md bg-accent px-2 py-1 text-caption text-accent-foreground">
            Edited
          </p>
        </div>
      ) : (
        <AiSuggestion variant="value">
          <p
            className="text-body whitespace-pre-line break-words"
            lang={valueLang === "zh-Hans" ? "zh-Hans" : undefined}
          >
            {value}
          </p>
        </AiSuggestion>
      )}
      {sourceText ? (
        <SourceQuote text={sourceText} lang={sourceLang(sourceText)} />
      ) : null}
    </article>
  );
}

function StageHistory({ events }: { events: StageEvent[] }) {
  return (
    <section
      aria-labelledby="stage-history-heading"
      className="flex min-w-0 flex-col gap-4 rounded-lg border border-border bg-card p-4"
    >
      <h2
        id="stage-history-heading"
        className="font-heading text-heading font-semibold"
      >
        Stage history
      </h2>
      {events.length === 0 ? (
        <p className="text-body text-muted-foreground">No stage moves yet.</p>
      ) : (
        <ol className="flex min-w-0 flex-col gap-4">
          {events.map((event, index) => (
            <li key={`${event.created_at}-${event.recruiter_name}-${index}`}>
              <time
                className="text-caption text-muted-foreground"
                dateTime={event.created_at}
              >
                {formatSgtDateTime(event.created_at)}
              </time>
              <p className="text-body break-words">
                {event.recruiter_name} · {formatStageMove(event.from_stage, event.to_stage)}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function formatStageMove(fromStage: string | null, toStage: string): string {
  if (fromStage === null || fromStage.trim().length === 0) {
    return toStage;
  }
  return `${fromStage} → ${toStage}`;
}

function formatSgtDateTime(iso: string): string {
  return sgtDateTimeFormatter.format(new Date(iso)).replace("Sept", "Sep");
}

function sourceLang(text: string): "en" | "zh-Hans" {
  return CJK_CHAR.test(text) ? "zh-Hans" : "en";
}

function asRecord(value: unknown): ProfileRecord {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return value as ProfileRecord;
  }
  return {};
}

function stringValue(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asObjectArray(value: unknown): ProfileRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(
    (item): item is ProfileRecord =>
      item !== null && typeof item === "object" && !Array.isArray(item),
  );
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0,
  );
}

function entrySourceText(entry: ProfileRecord): string | null {
  return stringValue(entry.source_text);
}

function formatWorkHistory(entry: ProfileRecord): string | null {
  const title = stringValue(entry.job_title);
  const employer = stringValue(entry.employer);
  const start = stringValue(entry.start);
  const end = stringValue(entry.end);
  const current = entry.current === true;
  const headline = [title, employer].filter(Boolean).join(" · ");
  const startLabel = start ? formatYearMonth(start) : null;
  const endLabel = current ? "Present" : end ? formatYearMonth(end) : null;
  const dates =
    startLabel && endLabel
      ? `${startLabel} – ${endLabel}`
      : startLabel ?? endLabel;
  const parts = [headline, dates].filter(Boolean);
  return parts.length > 0 ? parts.join("\n") : null;
}

function formatEducation(entry: ProfileRecord): string | null {
  const parts = [
    stringValue(entry.qualification),
    stringValue(entry.institution),
    stringValue(entry.year),
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}

function formatCertification(entry: ProfileRecord): string | null {
  const name = stringValue(entry.name);
  const issuer = stringValue(entry.issuer);
  if (!name && !issuer) {
    return null;
  }
  return [name, issuer].filter(Boolean).join(" · ");
}

function formatTotalYears(value: unknown): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  const rounded = Number.isInteger(value)
    ? String(value)
    : value.toFixed(1).replace(/\.0$/, "");
  return Number(rounded) === 1 ? "1 year" : `${rounded} years`;
}

function formatYearMonth(value: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) {
    return value;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) {
    return value;
  }
  return new Intl.DateTimeFormat("en-SG", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  })
    .format(new Date(Date.UTC(year, month - 1, 1)))
    .replace("Sept", "Sep");
}

function currentRole(effective: ProfileRecord): string | null {
  const history = asObjectArray(effective.work_history);
  if (history.length === 0) {
    return null;
  }
  return stringValue(history[0]?.job_title);
}
