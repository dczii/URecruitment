"use client";

import { Asterisk, CircleX, Plus, Trash2, Upload } from "lucide-react";
import {
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type Ref,
} from "react";
import { z } from "zod";

import { createJob } from "@/app/jobs/actions";
import { AiSuggestion } from "@/components/patterns/AiSuggestion";
import { SourceQuote } from "@/components/patterns/SourceQuote";
import { Button } from "@/components/ui/button";
import {
  AI_FAILED_MESSAGE,
  aiFailureMessage,
} from "@/lib/ai-routes";
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

/**
 * Client copy of extract-jd's output schema. The prompt module is
 * `server-only`; this validates the route JSON at the browser boundary so a
 * malformed 200 never seeds the form.
 */
const extractJdClientSchema = z.object({
  title: z.string().nullable(),
  title_source_text: z.string().nullable(),
  requirements: z.array(
    z.object({
      text: z.string(),
      proposed_marking: z.enum(["must_have", "nice_to_have"]).nullable(),
      source_text: z.string(),
    }),
  ),
  requires_nationality: z.boolean(),
  nationality_reason_proposal: z.string().nullable(),
  nationality_source_text: z.string().nullable(),
  requires_language: z.boolean(),
  language_reason_proposal: z.string().nullable(),
  language_source_text: z.string().nullable(),
  prompt_injection_detected: z.boolean(),
  prompt_injection_note: z.string().nullable(),
});

type ExtractJdPrefill = z.infer<typeof extractJdClientSchema>;

type ExtractionReview = {
  filename: string;
  prefill: ExtractJdPrefill;
};

const CJK_CHAR = /[\u3400-\u9FFF\uF900-\uFAFF]/;
const JD_FILENAME = /\.(pdf|docx)$/i;
const UNSUPPORTED_JD_FILE =
  "This file type is not supported. Upload a PDF or DOCX job description.";

const inputClassName =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-label text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50";

export function JobForm({ clients }: JobFormProps) {
  const formId = useId();
  const titleInputRef = useRef<HTMLInputElement>(null);
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

  const [jdFile, setJdFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extraction, setExtraction] = useState<ExtractionReview | null>(null);
  const [prefillApplied, setPrefillApplied] = useState(false);

  const heading = useMemo(() => {
    const trimmed = title.trim();
    return trimmed ? `Create job — ${trimmed}` : "Create job";
  }, [title]);

  const busy = pending || extracting;

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

  function seedFormFromPrefill(prefill: ExtractJdPrefill) {
    if (prefill.title != null && prefill.title.trim().length > 0) {
      setTitle(prefill.title);
    }
    if (prefill.requirements.length > 0) {
      setRequirements(
        prefill.requirements.map((row) => ({
          id: crypto.randomUUID(),
          text: row.text,
          marking: row.proposed_marking,
        })),
      );
    }
    setRequiresNationality(prefill.requires_nationality);
    setNationalityReason(prefill.nationality_reason_proposal ?? "");
    setRequiresLanguage(prefill.requires_language);
    setLanguageReason(prefill.language_reason_proposal ?? "");
  }

  /**
   * Both actions seed the same existing form state. Confirm leaves the
   * recruiter on the form to finish owner/client and save. Edit does the
   * same seed and focuses the title field so they are immediately in the
   * normal edit flow. Neither writes a job — Save job is unchanged from #43.
   */
  function applyPrefill(focusTitle: boolean) {
    if (!extraction) {
      return;
    }
    seedFormFromPrefill(extraction.prefill);
    setPrefillApplied(true);
    if (focusTitle) {
      requestAnimationFrame(() => {
        titleInputRef.current?.focus();
      });
    }
  }

  async function handleUpload() {
    if (!jdFile) {
      setExtractError("Choose a PDF or DOCX job description first.");
      return;
    }

    setExtractError(null);
    setExtraction(null);
    setPrefillApplied(false);

    if (!JD_FILENAME.test(jdFile.name)) {
      setExtractError(UNSUPPORTED_JD_FILE);
      return;
    }

    setExtracting(true);
    try {
      const body = new FormData();
      body.append("file", jdFile);
      const response = await fetch("/api/ai/extract-jd", {
        method: "POST",
        body,
      });

      const statusMessage = aiFailureMessage(response.status);
      if (statusMessage) {
        setExtractError(
          await recruiterExtractError(response, statusMessage),
        );
        return;
      }

      let json: unknown;
      try {
        json = await response.json();
      } catch {
        setExtractError(AI_FAILED_MESSAGE);
        return;
      }

      const parsed = extractJdClientSchema.safeParse(json);
      if (!parsed.success) {
        setExtractError(AI_FAILED_MESSAGE);
        return;
      }

      setExtraction({ filename: jdFile.name, prefill: parsed.data });
    } catch {
      setExtractError(AI_FAILED_MESSAGE);
    } finally {
      setExtracting(false);
    }
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

      <section
        aria-labelledby={`${formId}-upload-heading`}
        className="flex min-w-0 flex-col gap-4 rounded-lg border border-border bg-card p-4"
      >
        <h2
          id={`${formId}-upload-heading`}
          className="font-heading text-heading font-semibold"
        >
          Job description
        </h2>
        <div className="flex min-w-0 flex-wrap items-end gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <label
              htmlFor={`${formId}-jd-file`}
              className="text-label font-semibold"
            >
              Job description file
            </label>
            <input
              id={`${formId}-jd-file`}
              type="file"
              name="jd_file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              disabled={busy}
              onChange={(event) => {
                setJdFile(event.target.files?.[0] ?? null);
                setExtractError(null);
              }}
              className={inputClassName}
            />
          </div>
          <Button
            type="button"
            disabled={busy || !jdFile}
            aria-busy={extracting}
            onClick={() => {
              void handleUpload();
            }}
          >
            <Upload />
            Upload job description
          </Button>
        </div>
        {extracting ? (
          <p aria-live="polite" className="text-caption text-muted-foreground">
            Reading job description…
          </p>
        ) : null}
        {extractError ? (
          <div
            role="alert"
            className="flex items-center gap-1.5 rounded-md bg-destructive p-3 text-destructive-foreground"
          >
            <CircleX className="size-4 shrink-0" aria-hidden="true" />
            <p className="text-label font-semibold">{extractError}</p>
          </div>
        ) : null}
      </section>

      {extraction ? (
        <PrefillCard
          filename={extraction.filename}
          prefill={extraction.prefill}
          applied={prefillApplied}
          disabled={busy}
          onConfirm={() => applyPrefill(false)}
          onEdit={() => applyPrefill(true)}
        />
      ) : null}

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
            inputRef={titleInputRef}
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

function PrefillCard({
  filename,
  prefill,
  applied,
  disabled,
  onConfirm,
  onEdit,
}: {
  filename: string;
  prefill: ExtractJdPrefill;
  applied: boolean;
  disabled: boolean;
  onConfirm: () => void;
  onEdit: () => void;
}) {
  return (
    <section
      aria-labelledby="jd-prefill-heading"
      aria-live="polite"
      className="flex min-w-0 flex-col gap-4 rounded-lg border border-ai-suggestion-border bg-ai-suggestion-bg p-4"
    >
      <div className="flex min-w-0 flex-col gap-1">
        <h2
          id="jd-prefill-heading"
          className="font-heading text-heading font-semibold"
        >
          Review AI suggestions
        </h2>
        <p className="text-label text-muted-foreground">
          Read from {filename}
        </p>
      </div>

      {prefill.title ? (
        <PrefillProposal
          label="Job title"
          value={prefill.title}
          sourceText={prefill.title_source_text}
        />
      ) : null}

      {prefill.requirements.map((row, index) => (
        <PrefillProposal
          key={`${row.text}-${index}`}
          label={`Requirement ${index + 1}`}
          value={requirementProposalValue(row)}
          sourceText={row.source_text}
        />
      ))}

      {showAttributeProposal(
        prefill.requires_nationality,
        prefill.nationality_reason_proposal,
        prefill.nationality_source_text,
      ) ? (
        <PrefillProposal
          label="Nationality"
          value={attributeProposalValue(
            prefill.requires_nationality,
            prefill.nationality_reason_proposal,
          )}
          sourceText={prefill.nationality_source_text}
        />
      ) : null}

      {showAttributeProposal(
        prefill.requires_language,
        prefill.language_reason_proposal,
        prefill.language_source_text,
      ) ? (
        <PrefillProposal
          label="Language"
          value={attributeProposalValue(
            prefill.requires_language,
            prefill.language_reason_proposal,
          )}
          sourceText={prefill.language_source_text}
        />
      ) : null}

      {applied ? (
        <p className="text-caption text-muted-foreground">
          These suggestions are now in the form below. You can still change
          any field before saving.
        </p>
      ) : (
        <div className="flex min-w-0 flex-wrap gap-2">
          <Button type="button" disabled={disabled} onClick={onConfirm}>
            Confirm pre-filled values
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={onEdit}
          >
            Edit before saving
          </Button>
        </div>
      )}
    </section>
  );
}

function PrefillProposal({
  label,
  value,
  sourceText,
}: {
  label: string;
  value: string;
  sourceText: string | null;
}) {
  const valueLang = sourceLang(value);
  const quoteLang = sourceText ? sourceLang(sourceText) : "en";

  return (
    <div
      role="group"
      aria-label={label}
      className="flex min-w-0 flex-col gap-2"
    >
      <h3 className="text-label font-semibold">{label}</h3>
      <AiSuggestion variant="value">
        <p
          className="text-label break-words"
          lang={valueLang === "zh-Hans" ? "zh-Hans" : undefined}
        >
          {value}
        </p>
      </AiSuggestion>
      {sourceText ? (
        <SourceQuote text={sourceText} lang={quoteLang} />
      ) : null}
    </div>
  );
}

function Field({
  id,
  label,
  value,
  disabled,
  autoComplete = "off",
  inputRef,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  disabled: boolean;
  autoComplete?: string;
  inputRef?: Ref<HTMLInputElement>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <label htmlFor={id} className="text-label font-semibold">
        {label}
      </label>
      <input
        id={id}
        ref={inputRef}
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

function sourceLang(text: string): "en" | "zh-Hans" {
  return CJK_CHAR.test(text) ? "zh-Hans" : "en";
}

function markingLabel(marking: RequirementMarking | null): string {
  if (marking === "must_have") {
    return "Must-have";
  }
  if (marking === "nice_to_have") {
    return "Nice-to-have";
  }
  return "No marking proposed";
}

function requirementProposalValue(row: ExtractJdPrefill["requirements"][number]) {
  return `${row.text} · ${markingLabel(row.proposed_marking)}`;
}

function showAttributeProposal(
  required: boolean,
  reason: string | null,
  sourceText: string | null,
): boolean {
  return required || Boolean(reason) || Boolean(sourceText);
}

function attributeProposalValue(
  required: boolean,
  reason: string | null,
): string {
  if (!required) {
    return "Not proposed as a real requirement";
  }
  return reason && reason.trim().length > 0
    ? reason
    : "Proposed as a real requirement";
}

async function recruiterExtractError(
  response: Response,
  fallback: string,
): Promise<string> {
  if (response.status === 429) {
    return fallback;
  }
  try {
    const json: unknown = await response.json();
    if (
      json !== null &&
      typeof json === "object" &&
      "error" in json &&
      typeof json.error === "string" &&
      json.error.trim().length > 0
    ) {
      return json.error;
    }
  } catch {
    // Firewall/HTML body — keep the generic status message.
  }
  return fallback;
}
