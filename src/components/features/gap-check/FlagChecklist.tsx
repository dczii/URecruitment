"use client";

import { useId, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { closeGapFlag } from "@/app/jobs/[id]/gap-flag-actions";
import { AiSuggestion } from "@/components/patterns/AiSuggestion";
import { SourceQuote } from "@/components/patterns/SourceQuote";
import { TypedNameDialog } from "@/components/patterns/TypedNameDialog";
import { Button } from "@/components/ui/button";
import {
  getStoredRecruiterName,
  setStoredRecruiterName,
} from "@/lib/recruiter-name";

const CJK_CHAR = /[\u3400-\u9FFF\uF900-\uFAFF]/;

const FLAG_KIND_ORDER = [
  "missing",
  "uncertain",
  "conflicting",
  "fair-employment",
] as const;

type FlagKind = (typeof FLAG_KIND_ORDER)[number];

const FLAG_KIND_LABELS: Record<FlagKind, string> = {
  missing: "Missing",
  uncertain: "Uncertain",
  conflicting: "Conflicting",
  "fair-employment": "Fair-employment",
};

export type FlagChecklistItem = {
  id: string;
  flagType: FlagKind;
  reason: string;
  suggestedQuestion: string | null;
};

type ResolutionState = "resolved" | "dismissed";

type PendingClose = {
  flagId: string;
  resolutionState: ResolutionState;
  note: string;
};

type FlagChecklistProps = {
  jobId: string;
  flags: FlagChecklistItem[];
};

export function FlagChecklist({ jobId, flags }: FlagChecklistProps) {
  const router = useRouter();
  const [closedIds, setClosedIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [nameDialogOpen, setNameDialogOpen] = useState(false);
  const [pendingClose, setPendingClose] = useState<PendingClose | null>(null);
  const [pending, startTransition] = useTransition();

  const visibleFlags = useMemo(
    () => flags.filter((flag) => !closedIds.has(flag.id)),
    [flags, closedIds],
  );
  const groups = useMemo(() => groupFlags(visibleFlags), [visibleFlags]);

  function performClose(
    flagId: string,
    resolutionState: ResolutionState,
    note: string,
    typedName: string,
  ) {
    startTransition(async () => {
      const result = await closeGapFlag(
        flagId,
        jobId,
        resolutionState,
        note,
        typedName,
      );
      if (!result.ok) {
        setRowError(flagId, result.error);
        return;
      }
      setClosedIds((current) => new Set(current).add(flagId));
      clearRowError(flagId);
      router.refresh();
    });
  }

  function setRowError(flagId: string, error: string) {
    setRowErrors((current) => ({ ...current, [flagId]: error }));
  }

  function clearRowError(flagId: string) {
    setRowErrors((current) => {
      if (!(flagId in current)) {
        return current;
      }
      const next = { ...current };
      delete next[flagId];
      return next;
    });
  }

  function requestClose(
    flagId: string,
    resolutionState: ResolutionState,
    note: string,
  ): boolean {
    const trimmed = note.trim();
    if (trimmed.length === 0) {
      setRowError(flagId, "A short note is required.");
      return false;
    }
    clearRowError(flagId);
    const stored = getStoredRecruiterName();
    if (stored === null) {
      setPendingClose({ flagId, resolutionState, note: trimmed });
      setNameDialogOpen(true);
      return true;
    }
    performClose(flagId, resolutionState, trimmed, stored);
    return true;
  }

  return (
    <section
      aria-labelledby="open-gap-flags-heading"
      className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-card p-4"
    >
      <h2
        id="open-gap-flags-heading"
        className="font-heading text-heading font-semibold"
      >
        Open gap flags
      </h2>
      {groups.length === 0 ? (
        <p className="text-body text-muted-foreground">No open gap flags.</p>
      ) : (
        <div className="flex min-w-0 flex-col gap-6">
          {groups.map((group) => (
            <section
              key={group.kind}
              aria-labelledby={`${group.kind}-flags-heading`}
              className="flex min-w-0 flex-col gap-3"
            >
              <h3
                id={`${group.kind}-flags-heading`}
                className="text-label font-semibold"
              >
                {FLAG_KIND_LABELS[group.kind]}
              </h3>
              <ul className="flex min-w-0 flex-col">
                {group.flags.map((flag) => (
                  <FlagRow
                    key={flag.id}
                    flag={flag}
                    error={rowErrors[flag.id] ?? null}
                    pending={pending}
                    onRequestClose={(resolutionState, note) =>
                      requestClose(flag.id, resolutionState, note)
                    }
                    onClearError={() => clearRowError(flag.id)}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
      <TypedNameDialog
        open={nameDialogOpen}
        onOpenChange={setNameDialogOpen}
        onSubmit={(name) => {
          setStoredRecruiterName(name);
          setNameDialogOpen(false);
          if (pendingClose === null) {
            return;
          }
          const { flagId, resolutionState, note } = pendingClose;
          setPendingClose(null);
          performClose(flagId, resolutionState, note, name);
        }}
      />
    </section>
  );
}

function FlagRow({
  flag,
  error,
  pending,
  onRequestClose,
  onClearError,
}: {
  flag: FlagChecklistItem;
  error: string | null;
  pending: boolean;
  onRequestClose: (resolutionState: ResolutionState, note: string) => boolean;
  onClearError: () => void;
}) {
  const noteId = useId();
  const errorId = useId();
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const [draftAction, setDraftAction] = useState<ResolutionState | null>(null);
  const [note, setNote] = useState("");
  const isModelDerived = flag.flagType !== "missing";
  const quotes = isModelDerived ? sourceQuotes(flag) : [];
  const reasonLang = sourceLang(flag.reason);
  const questionLang = flag.suggestedQuestion
    ? sourceLang(flag.suggestedQuestion)
    : "en";

  function handleConfirm() {
    if (draftAction === null) {
      return;
    }
    const accepted = onRequestClose(draftAction, note);
    if (!accepted) {
      noteRef.current?.focus();
    }
  }

  function handleCancel() {
    setDraftAction(null);
    setNote("");
    onClearError();
  }

  const reasonBody = (
    <p
      className="text-body whitespace-pre-line break-words"
      lang={reasonLang === "zh-Hans" ? "zh-Hans" : undefined}
    >
      {flag.reason}
    </p>
  );

  return (
    <li className="flex min-w-0 flex-col gap-3 border-b border-border py-3 last:border-b-0 last:pb-0 first:pt-0">
      {isModelDerived ? (
        <AiSuggestion variant="value">{reasonBody}</AiSuggestion>
      ) : (
        reasonBody
      )}
      {quotes.map((quote) => (
        <SourceQuote
          key={`${flag.id}-${quote.label ?? "source"}-${quote.text}`}
          text={quote.text}
          lang={sourceLang(quote.text)}
          label={quote.label}
        />
      ))}
      {flag.suggestedQuestion ? (
        <p
          className="text-label break-words"
          lang={questionLang === "zh-Hans" ? "zh-Hans" : undefined}
        >
          {`Ask the client: "${flag.suggestedQuestion}"`}
        </p>
      ) : null}
      {draftAction === null ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={pending}
            onClick={() => {
              setDraftAction("resolved");
              onClearError();
            }}
          >
            Resolve
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => {
              setDraftAction("dismissed");
              onClearError();
            }}
          >
            Dismiss
          </Button>
        </div>
      ) : (
        <form
          className="flex min-w-0 flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            handleConfirm();
          }}
        >
          <div className="flex min-w-0 flex-col gap-2">
            <label htmlFor={noteId} className="text-label text-foreground">
              Note
            </label>
            <textarea
              ref={noteRef}
              id={noteId}
              name="resolution-note"
              rows={3}
              value={note}
              disabled={pending}
              aria-invalid={error != null}
              aria-describedby={error ? errorId : undefined}
              onChange={(event) => {
                setNote(event.target.value);
                if (error) {
                  onClearError();
                }
              }}
              className="min-h-20 rounded-md border border-input bg-background px-3 py-2 text-body text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
            />
          </div>
          {error ? (
            <p
              id={errorId}
              role="alert"
              aria-live="polite"
              className="text-caption text-destructive"
            >
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending} aria-busy={pending}>
              {draftAction === "dismissed"
                ? "Confirm dismiss"
                : "Confirm resolve"}
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
      )}
    </li>
  );
}

function groupFlags(
  flags: FlagChecklistItem[],
): { kind: FlagKind; flags: FlagChecklistItem[] }[] {
  const groups: { kind: FlagKind; flags: FlagChecklistItem[] }[] = [];
  for (const kind of FLAG_KIND_ORDER) {
    const items = flags.filter((flag) => flag.flagType === kind);
    if (items.length > 0) {
      groups.push({ kind, flags: items });
    }
  }
  return groups;
}

function sourceQuotes(
  flag: FlagChecklistItem,
): { text: string; label?: string }[] {
  const quotes = quotedEvidence(flag.reason);
  if (quotes.length === 0) {
    return [];
  }
  if (flag.flagType === "conflicting" && quotes.length >= 2) {
    return [
      { text: quotes[0] ?? "", label: "Show form source text" },
      { text: quotes[1] ?? "", label: "Show JD source text" },
    ].filter((quote) => quote.text.length > 0);
  }
  return quotes.map((text) => ({ text }));
}

function quotedEvidence(reason: string): string[] {
  const quotes: string[] = [];
  const pattern = /"([^"]+)"/g;
  let match = pattern.exec(reason);
  while (match) {
    const text = match[1]?.trim();
    if (text) {
      quotes.push(text);
    }
    match = pattern.exec(reason);
  }
  return quotes;
}

function sourceLang(text: string): "en" | "zh-Hans" {
  return CJK_CHAR.test(text) ? "zh-Hans" : "en";
}
