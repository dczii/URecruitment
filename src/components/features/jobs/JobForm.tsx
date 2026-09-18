"use client";

import { Asterisk, CircleX, Plus, Trash2 } from "lucide-react";
import {
  useId,
  useMemo,
  useState,
  useTransition,
  type FormEvent,
} from "react";

import { createJob } from "@/app/jobs/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ClientOption = {
  id: string;
  name: string;
};

type RequirementMarking = "must_have" | "nice_to_have";

type RequirementRow = {
  id: string;
  text: string;
  marking: RequirementMarking | null;
};

type JobFormProps = {
  clients: ClientOption[];
};

const inputClassName =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-label text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50";

export function JobForm({ clients }: JobFormProps) {
  const formId = useId();
  const [pending, startTransition] = useTransition();
  const [banner, setBanner] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [clientId, setClientId] = useState("");
  const [requirements, setRequirements] = useState<RequirementRow[]>(() => [
    { id: "initial", text: "", marking: null },
  ]);
  const [requiresNationality, setRequiresNationality] = useState(false);
  const [nationalityReason, setNationalityReason] = useState("");
  const [requiresLanguage, setRequiresLanguage] = useState(false);
  const [languageReason, setLanguageReason] = useState("");

  const heading = useMemo(() => {
    const trimmed = title.trim();
    return trimmed ? `Create job — ${trimmed}` : "Create job";
  }, [title]);

  function updateRequirement(
    id: string,
    patch: Partial<Pick<RequirementRow, "text" | "marking">>,
  ) {
    setRequirements((rows) =>
      rows.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  }

  function addRequirement() {
    setRequirements((rows) => [
      ...rows,
      { id: crypto.randomUUID(), text: "", marking: null },
    ]);
  }

  function removeRequirement(id: string) {
    setRequirements((rows) =>
      rows.length === 1 ? rows : rows.filter((row) => row.id !== id),
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBanner(null);

    startTransition(async () => {
      const result = await createJob({
        owner_name: ownerName,
        client_id: clientId,
        title,
        requirements: requirements.map((row) => ({
          text: row.text,
          marking: row.marking,
        })),
        requires_nationality: requiresNationality,
        nationality_reason: requiresNationality ? nationalityReason : null,
        requires_language: requiresLanguage,
        language_reason: requiresLanguage ? languageReason : null,
      });

      if (result && !result.ok) {
        setBanner(result.error);
      }
    });
  }

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-4">
      <h1 className="font-heading text-title font-semibold break-words">
        {heading}
      </h1>

      <form
        className="flex min-w-0 flex-col gap-4"
        onSubmit={handleSubmit}
        noValidate
      >
        <section
          aria-labelledby={`${formId}-details-heading`}
          className="flex min-w-0 flex-col gap-4 rounded-lg border border-border bg-card p-4"
        >
          <h2
            id={`${formId}-details-heading`}
            className="font-heading text-heading font-semibold"
          >
            Job details
          </h2>
          <Field
            id={`${formId}-title`}
            label="Job title"
            value={title}
            disabled={pending}
            onChange={setTitle}
          />
          <Field
            id={`${formId}-owner`}
            label="Owner name"
            value={ownerName}
            disabled={pending}
            autoComplete="name"
            onChange={setOwnerName}
          />
          <div className="flex min-w-0 flex-col gap-2">
            <label
              htmlFor={`${formId}-client`}
              className="text-label font-semibold"
            >
              Client
            </label>
            <select
              id={`${formId}-client`}
              name="client_id"
              value={clientId}
              disabled={pending || clients.length === 0}
              onChange={(event) => setClientId(event.target.value)}
              className={inputClassName}
            >
              <option value="">
                {clients.length === 0
                  ? "No clients available"
                  : "Select a client"}
              </option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section
          aria-labelledby={`${formId}-requirements-heading`}
          className="flex min-w-0 flex-col gap-2 rounded-lg border border-border bg-card p-4"
        >
          <h2
            id={`${formId}-requirements-heading`}
            className="font-heading text-heading font-semibold"
          >
            Requirements
          </h2>
          {requirements.map((row, index) => (
            <RequirementRowFields
              key={row.id}
              index={index}
              row={row}
              canRemove={requirements.length > 1}
              disabled={pending}
              onChange={updateRequirement}
              onRemove={removeRequirement}
            />
          ))}
          <div>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={addRequirement}
            >
              <Plus />
              Add requirement
            </Button>
          </div>
        </section>

        <section
          aria-labelledby={`${formId}-protected-heading`}
          className="flex min-w-0 flex-col gap-2 rounded-lg border border-border bg-card p-4"
        >
          <h2
            id={`${formId}-protected-heading`}
            className="font-heading text-heading font-semibold"
          >
            Nationality and language
          </h2>
          <AttributeRequirement
            attribute="nationality"
            checked={requiresNationality}
            reason={nationalityReason}
            disabled={pending}
            onCheckedChange={setRequiresNationality}
            onReasonChange={setNationalityReason}
          />
          <AttributeRequirement
            attribute="language"
            checked={requiresLanguage}
            reason={languageReason}
            disabled={pending}
            onCheckedChange={setRequiresLanguage}
            onReasonChange={setLanguageReason}
          />
        </section>

        {banner ? (
          <div
            role="alert"
            className="flex items-center gap-1.5 rounded-md bg-destructive p-3 text-destructive-foreground"
          >
            <CircleX className="size-4 shrink-0" aria-hidden="true" />
            <p className="text-label font-semibold">{banner}</p>
          </div>
        ) : null}

        <div>
          <Button type="submit" disabled={pending} aria-busy={pending}>
            Save job
          </Button>
        </div>
      </form>
    </section>
  );
}

function Field({
  id,
  label,
  value,
  disabled,
  autoComplete = "off",
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  disabled: boolean;
  autoComplete?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <label htmlFor={id} className="text-label font-semibold">
        {label}
      </label>
      <input
        id={id}
        type="text"
        name={id}
        autoComplete={autoComplete}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={inputClassName}
      />
    </div>
  );
}

function RequirementRowFields({
  index,
  row,
  canRemove,
  disabled,
  onChange,
  onRemove,
}: {
  index: number;
  row: RequirementRow;
  canRemove: boolean;
  disabled: boolean;
  onChange: (
    id: string,
    patch: Partial<Pick<RequirementRow, "text" | "marking">>,
  ) => void;
  onRemove: (id: string) => void;
}) {
  const number = index + 1;
  const inputId = `requirement-${row.id}`;
  const markingLabel = `Marking for requirement ${number}`;

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-3">
      <input
        id={inputId}
        type="text"
        value={row.text}
        disabled={disabled}
        aria-label={`Requirement ${number}`}
        onChange={(event) => onChange(row.id, { text: event.target.value })}
        className={cn(inputClassName, "min-w-0 flex-1")}
      />
      <div
        role="group"
        aria-label={markingLabel}
        className="inline-flex overflow-hidden rounded-md border border-border"
      >
        <MarkingOption
          label="Must-have"
          selected={row.marking === "must_have"}
          disabled={disabled}
          onSelect={() =>
            onChange(row.id, {
              marking: row.marking === "must_have" ? null : "must_have",
            })
          }
        />
        <MarkingOption
          label="Nice-to-have"
          selected={row.marking === "nice_to_have"}
          disabled={disabled}
          onSelect={() =>
            onChange(row.id, {
              marking: row.marking === "nice_to_have" ? null : "nice_to_have",
            })
          }
        />
      </div>
      {canRemove ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          aria-label={`Remove requirement ${number}`}
          onClick={() => onRemove(row.id)}
        >
          <Trash2 />
        </Button>
      ) : null}
    </div>
  );
}

function MarkingOption({
  label,
  selected,
  disabled,
  onSelect,
}: {
  label: string;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "px-2.5 py-1.5 text-caption font-semibold outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        selected
          ? "bg-accent text-accent-foreground"
          : "bg-card text-muted-foreground",
      )}
    >
      {label}
    </button>
  );
}

function AttributeRequirement({
  attribute,
  checked,
  reason,
  disabled,
  onCheckedChange,
  onReasonChange,
}: {
  attribute: "nationality" | "language";
  checked: boolean;
  reason: string;
  disabled: boolean;
  onCheckedChange: (checked: boolean) => void;
  onReasonChange: (value: string) => void;
}) {
  const switchId = useId();
  const reasonId = useId();
  const noteId = useId();
  const labelId = useId();
  const capitalized = attribute === "nationality" ? "Nationality" : "Language";
  const reasonEmpty = reason.trim().length === 0;
  const placeholder =
    attribute === "nationality"
      ? "e.g. the role requires an existing Singapore work pass under a client-mandated headcount quota"
      : "e.g. daily stand-ups with the client's Shanghai team are held in Mandarin";

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex items-center gap-3">
        <button
          id={switchId}
          type="button"
          role="switch"
          aria-checked={checked}
          aria-labelledby={labelId}
          disabled={disabled}
          onClick={() => onCheckedChange(!checked)}
          className={cn(
            "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 outline-none",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            checked ? "bg-primary" : "bg-muted",
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              "size-4 rounded-full bg-primary-foreground transition-transform",
              checked ? "translate-x-4" : "translate-x-0",
            )}
          />
        </button>
        <label
          id={labelId}
          htmlFor={switchId}
          className="text-label"
        >
          Count {attribute} as a real requirement for this job
        </label>
      </div>

      {checked ? (
        <div
          className={cn(
            "flex min-w-0 flex-col gap-1 rounded-md border bg-background p-3",
            reasonEmpty ? "border-destructive" : "border-input",
          )}
        >
          <div className="flex items-center gap-1.5">
            <Asterisk
              className="size-3 shrink-0 text-destructive"
              aria-hidden="true"
            />
            <label
              htmlFor={reasonId}
              className="text-caption font-semibold text-destructive"
            >
              Required — write why {attribute} is a real requirement before it
              can count
            </label>
          </div>
          <textarea
            id={reasonId}
            value={reason}
            disabled={disabled}
            rows={3}
            placeholder={placeholder}
            aria-required="true"
            aria-describedby={noteId}
            onChange={(event) => onReasonChange(event.target.value)}
            className="min-h-16 w-full resize-y rounded-md border-0 bg-transparent text-caption text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
          <p id={noteId} className="text-caption text-destructive italic">
            {capitalized} will not count toward the score until this reason is
            filled in.
          </p>
        </div>
      ) : null}
    </div>
  );
}
