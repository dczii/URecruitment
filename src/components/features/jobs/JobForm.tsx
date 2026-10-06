"use client";

import { Asterisk, CircleX, Plus, Trash2 } from "lucide-react";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type Ref,
} from "react";

import { createJob } from "@/app/jobs/actions";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { FieldLabel, Input } from "@/components/ui/field";
import { SelectField } from "@/components/ui/select";
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

export function JobForm({ clients }: JobFormProps) {
  const formId = useId();
  const titleInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const [banner, setBanner] = useState<string | null>(null);
  const recoveryTarget = useRef<string | null>(null);
  useEffect(() => {
    if (!pending && banner && recoveryTarget.current) {
      formRef.current?.querySelector<HTMLElement>(recoveryTarget.current)?.focus();
      recoveryTarget.current = null;
    }
  }, [pending, banner]);

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
    if (pending) return;
    setBanner(null);
    const errors: Record<string, string> = {};
    if (!title.trim()) errors[`${formId}-title`] = "Enter a job title.";
    if (!ownerName.trim()) errors[`${formId}-owner`] = "Enter the owner name.";
    else if (ownerName.trim().length > 80) errors[`${formId}-owner`] = "Use 80 characters or fewer.";
    if (!clientId) errors[`${formId}-client`] = "Select a client.";
    setFieldErrors(errors);
    const first = Object.keys(errors)[0];
    if (first) {
      formRef.current?.querySelector<HTMLElement>(`[id="${first}"]`)?.focus();
      return;
    }

    startTransition(async () => {
      try {
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
          const unmarked = requirements.findIndex((row) => row.text.trim() && row.marking === null);
          recoveryTarget.current = unmarked >= 0
            ? `[aria-label="Marking for requirement ${unmarked + 1}"] button`
            : 'textarea[aria-required="true"]';
        }
      } catch {
        setBanner("The job could not be saved. Your entries are still here; try again.");
      }
    });
  }

  return (
    <section className="flex min-w-0 flex-col gap-4">
      <h1 className="font-heading text-title font-semibold break-words">
        {heading}
      </h1>

      <form
        ref={formRef}
        className="flex min-w-0 flex-col gap-4"
        onSubmit={handleSubmit}
        noValidate
      >
        <Card as="section" aria-labelledby={`${formId}-details-heading`}>
          <CardTitle id={`${formId}-details-heading`}>Job details</CardTitle>
          <Field
            id={`${formId}-title`}
            label="Job title"
            error={fieldErrors[`${formId}-title`]}
            value={title}
            disabled={pending}
            inputRef={titleInputRef}
            onChange={setTitle}
          />
          <Field
            id={`${formId}-owner`}
            label="Owner name"
            error={fieldErrors[`${formId}-owner`]}
            value={ownerName}
            disabled={pending}
            autoComplete="name"
            onChange={setOwnerName}
          />
          <div className="flex min-w-0 flex-col gap-2">
            <FieldLabel htmlFor={`${formId}-client`}>Client</FieldLabel>
            <SelectField
              id={`${formId}-client`}
              name="client_id"
              aria-invalid={Boolean(fieldErrors[`${formId}-client`])}
              aria-describedby={fieldErrors[`${formId}-client`] ? `${formId}-client-error` : undefined}
              value={clientId}
              disabled={pending || clients.length === 0}
              onValueChange={setClientId}
              placeholder={clients.length === 0 ? "No clients available" : "Select a client"}
              options={clients.map((client) => ({ value: client.id, label: client.name }))}
            />
            {fieldErrors[`${formId}-client`] && <p id={`${formId}-client-error`} role="alert" className="text-caption text-destructive">{fieldErrors[`${formId}-client`]}</p>}
          </div>
        </Card>

        <Card as="section" aria-labelledby={`${formId}-requirements-heading`} className="gap-3">
          <CardTitle id={`${formId}-requirements-heading`}>Requirements</CardTitle>
          {requirements.map((row, index) => (
            <RequirementRowFields
              key={row.id}
              index={index}
              row={row}
              errorId={banner && row.text.trim() && row.marking === null ? `${formId}-banner` : undefined}
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
        </Card>

        <Card as="section" aria-labelledby={`${formId}-protected-heading`} className="gap-3">
          <CardTitle id={`${formId}-protected-heading`}>
            Nationality and language
          </CardTitle>
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
        </Card>

        {banner ? (
          <div
            id={`${formId}-banner`}
            role="alert"
            className="flex items-center gap-2 rounded-md border-l-4 border-destructive bg-destructive/10 p-3 text-destructive"
          >
            <CircleX className="size-4 shrink-0" aria-hidden="true" />
            <p className="text-label font-semibold">{banner}</p>
          </div>
        ) : null}

        <div className="flex">
          <Button
            type="submit"
            disabled={pending}
            aria-busy={pending}
            className="w-full sm:w-auto"
          >
            {pending ? "Saving job…" : "Save job"}
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
  inputRef,
  error,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  disabled: boolean;
  autoComplete?: string;
  inputRef?: Ref<HTMLInputElement>;
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        ref={inputRef}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        type="text"
        name={id}
        autoComplete={autoComplete}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
      {error && <p id={`${id}-error`} role="alert" className="text-caption text-destructive">{error}</p>}
    </div>
  );
}

function RequirementRowFields({
  index,
  row,
  canRemove,
  errorId,
  disabled,
  onChange,
  onRemove,
}: {
  index: number;
  row: RequirementRow;
  canRemove: boolean;
  errorId?: string;
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
      <Input
        id={inputId}
        type="text"
        value={row.text}
        disabled={disabled}
        aria-label={`Requirement ${number}`}
        onChange={(event) => onChange(row.id, { text: event.target.value })}
        className="min-w-0 flex-1 basis-full sm:basis-auto"
      />
      <div
        role="group"
        aria-label={markingLabel}
        aria-describedby={errorId}
        className="inline-flex gap-0.5 rounded-md bg-muted p-0.5"
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
        "min-h-11 rounded-sm px-3 py-1.5 text-caption font-semibold outline-none transition-colors",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        selected
          ? "bg-card text-accent-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
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
            "relative inline-flex h-11 w-11 shrink-0 items-center rounded-full p-0.5 outline-none",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",

          )}
        >
          <span aria-hidden="true" className={cn("absolute inset-x-0 h-6 rounded-full border", checked ? "border-primary bg-primary" : "border-input bg-secondary")} />
          <span
            aria-hidden="true"
            className={cn(
              "relative size-4 rounded-full shadow-sm transition-transform",
              checked
                ? "translate-x-5 bg-primary-foreground"
                : "translate-x-0 bg-card",
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
            aria-invalid={reasonEmpty}
            aria-describedby={noteId}
            onChange={(event) => onReasonChange(event.target.value)}
            className="min-h-16 w-full resize-y rounded-sm border-0 bg-transparent text-caption text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
          <p id={noteId} className="text-caption text-destructive italic">
            {capitalized} will not be treated as a requirement until this reason is
            filled in.
          </p>
        </div>
      ) : null}
    </div>
  );
}

