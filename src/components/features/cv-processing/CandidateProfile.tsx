"use client";

import { useId, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { saveFieldOverride } from "@/app/candidates/[id]/actions";
import { TypedNameDialog } from "@/components/patterns/TypedNameDialog";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import {
  getStoredRecruiterName,
  setStoredRecruiterName,
} from "@/lib/recruiter-name";

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
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "location", label: "Location" },
] as const;

type ProfileRecord = Record<string, unknown>;

type StageEvent = {
  recruiter_name: string;
  from_stage: string | null;
  to_stage: string;
  created_at: string;
};

type EditableFieldKey = (typeof SCALAR_FIELDS)[number]["key"];

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
    overriddenBy: string | null;
    skills: { skill: string; source_text: string }[];
    stageHistory: StageEvent[];
  };
};

export function CandidateProfile({ candidateId, data }: CandidateProfileProps) {
  const { parseStatus, identity, profile, skills, stageHistory, overriddenBy } =
    data;
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
          This candidate profile has not been filled in yet.
        </p>
      ) : (
        <div className="grid min-w-0 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)]">
          <div className="flex min-w-0 flex-col gap-6">
            {SCALAR_FIELDS.map((field) => {
              const value = stringValue(effective[field.key]);
              if (!value) {
                return null;
              }
              return (
                <EditableFieldCard
                  key={field.key}
                  candidateId={candidateId}
                  field={field.key}
                  label={field.label}
                  value={value}
                  parsedValue={stringValue(parsed[field.key])}
                  overriddenBy={overriddenBy}
                />
              );
            })}

            <TotalYearsCard
              effective={effective}
              parsed={parsed}
              overriddenBy={overriddenBy}
            />

            <EntrySection
              title="Work history"
              itemLabel="Role"
              entries={asObjectArray(effective.work_history)}
              parsedEntries={asObjectArray(parsed.work_history)}
              renderValue={formatWorkHistory}
              overriddenBy={overriddenBy}
            />

            <EntrySection
              title="Education"
              itemLabel="Education"
              entries={asObjectArray(effective.education)}
              parsedEntries={asObjectArray(parsed.education)}
              renderValue={formatEducation}
              overriddenBy={overriddenBy}
            />

            <EntrySection
              title="Certifications"
              itemLabel="Certification"
              entries={asObjectArray(effective.certifications)}
              parsedEntries={asObjectArray(parsed.certifications)}
              renderValue={formatCertification}
              overriddenBy={overriddenBy}
            />

            <LanguagesCard
              languages={asStringArray(effective.languages_spoken)}
              parsedLanguages={asStringArray(parsed.languages_spoken)}
              overriddenBy={overriddenBy}
            />

            {skills.length > 0 ? (
              <section className="flex min-w-0 flex-col gap-3">
                <h2 className="font-heading text-heading font-semibold tracking-tight">
                  Skills
                </h2>
                <ul className="flex min-w-0 flex-col gap-3">
                  {skills.map((skill, index) => (
                    <li key={`${skill.skill}-${index}`}>
                      <FieldCard
                        label="Skill"
                        value={skill.skill}
                        parsedValue={skill.skill}
                        overriddenBy={null}
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
  overriddenBy,
}: {
  effective: ProfileRecord;
  parsed: ProfileRecord;
  overriddenBy: string | null;
}) {
  const value = formatTotalYears(effective.total_years ?? parsed.total_years);
  if (!value) {
    return null;
  }
  return (
    <FieldCard
      label="Total experience"
      value={value}
      parsedValue={formatTotalYears(parsed.total_years)}
      overriddenBy={overriddenBy}
    />
  );
}

function LanguagesCard({
  languages,
  parsedLanguages,
  overriddenBy,
}: {
  languages: string[];
  parsedLanguages: string[];
  overriddenBy: string | null;
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
      overriddenBy={overriddenBy}
    />
  );
}

function EntrySection({
  title,
  itemLabel,
  entries,
  parsedEntries,
  renderValue,
  overriddenBy,
}: {
  title: string;
  itemLabel: string;
  entries: ProfileRecord[];
  parsedEntries: ProfileRecord[];
  renderValue: (entry: ProfileRecord) => string | null;
  overriddenBy: string | null;
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
                overriddenBy={overriddenBy}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function EditableFieldCard({
  candidateId,
  field,
  label,
  value,
  parsedValue,
  overriddenBy,
}: {
  candidateId: string;
  field: EditableFieldKey;
  label: string;
  value: string;
  parsedValue: string | null;
  overriddenBy: string | null;
}) {
  const router = useRouter();
  const inputId = useId();
  const errorId = useId();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [nameDialogOpen, setNameDialogOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function beginSave(typedName: string) {
    startTransition(async () => {
      const result = await saveFieldOverride(
        candidateId,
        field,
        draft,
        typedName,
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
      setEditing(false);
      router.refresh();
    });
  }

  function handleSave() {
    setError(null);
    const stored = getStoredRecruiterName();
    if (stored === null) {
      setNameDialogOpen(true);
      return;
    }
    beginSave(stored);
  }

  function handleCancel() {
    setDraft(value);
    setError(null);
    setEditing(false);
  }

  const dialog = (
    <TypedNameDialog
      open={nameDialogOpen}
      onOpenChange={setNameDialogOpen}
      onSubmit={(name) => {
        setStoredRecruiterName(name);
        setNameDialogOpen(false);
        beginSave(name);
      }}
    />
  );

  if (editing) {
    return (
      <Card as="article" className="gap-3 p-4 lg:p-5">
        <h3 className="text-label text-muted-foreground">
          <label htmlFor={inputId}>{label}</label>
        </h3>
        <form
          className="flex min-w-0 flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            handleSave();
          }}
        >
          <Input
            id={inputId}
            type="text"
            name={field}
            autoComplete="off"
            value={draft}
            disabled={pending}
            aria-invalid={error != null}
            aria-describedby={error ? errorId : undefined}
            onChange={(event) => {
              setDraft(event.target.value);
              if (error) {
                setError(null);
              }
            }}
          />
          {error ? (
            <p
              id={errorId}
              role="status"
              aria-live="polite"
              className="text-caption text-destructive"
            >
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending} aria-busy={pending}>
              Save
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={handleCancel}
            >
              Cancel
            </Button>
          </div>
        </form>
        {dialog}
      </Card>
    );
  }

  return (
    <>
      <FieldCard
        label={label}
        value={value}
        parsedValue={parsedValue}
        overriddenBy={overriddenBy}
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label={`Edit ${label}`}
            onClick={() => {
              setDraft(value);
              setError(null);
              setEditing(true);
            }}
          >
            Edit
          </Button>
        }
      />
      {dialog}
    </>
  );
}

function FieldCard({
  label,
  value,
  parsedValue,
  overriddenBy = null,
  action = null,
}: {
  label: string;
  value: string;
  parsedValue: string | null;
  overriddenBy?: string | null;
  action?: ReactNode;
}) {
  const edited = parsedValue !== null && parsedValue !== value;
  const valueLang = sourceLang(value);

  return (
    <Card as="article" className="gap-3 p-4 lg:p-5">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <h3 className="text-label text-muted-foreground">{label}</h3>
        {action}
      </div>
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
            {overriddenBy ? `Edited by ${overriddenBy}` : "Edited"}
          </p>
        </div>
      ) : (
        <p
          className="text-body whitespace-pre-line break-words"
          lang={valueLang === "zh-Hans" ? "zh-Hans" : undefined}
        >
          {value}
        </p>
      )}
    </Card>
  );
}

function StageHistory({ events }: { events: StageEvent[] }) {
  return (
    <Card as="section" aria-labelledby="stage-history-heading" className="lg:sticky lg:top-24">
      <CardTitle id="stage-history-heading">Stage history</CardTitle>
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
    </Card>
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
