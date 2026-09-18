import { Sparkles } from "lucide-react";
import type { ReactNode } from "react";

type AiSuggestionProps = { children: ReactNode } & (
  | { variant: "value" }
  | { variant: "score"; modelVersion: string; generatedAt: Date | string }
);

const sgtDateFormatter = new Intl.DateTimeFormat("en-SG", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Singapore",
});

function formatGeneratedAt(generatedAt: Date | string): string {
  const date = typeof generatedAt === "string" ? new Date(generatedAt) : generatedAt;
  // en-SG's short month is "Sept"; the pattern spec and tests use "Sep".
  return sgtDateFormatter.format(date).replace("Sept", "Sep");
}

export function AiSuggestion(props: AiSuggestionProps) {
  const { children, variant } = props;

  return (
    <div className="flex flex-col gap-2 rounded-md border border-ai-suggestion-border bg-ai-suggestion-bg p-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 text-ai-suggestion-foreground">
          <Sparkles className="size-4 shrink-0" aria-hidden="true" />
          AI suggestion
        </span>
        <div>{children}</div>
      </div>
      {variant === "score" ? (
        <p className="text-caption text-muted-foreground">
          {props.modelVersion} · {formatGeneratedAt(props.generatedAt)}
        </p>
      ) : null}
    </div>
  );
}
