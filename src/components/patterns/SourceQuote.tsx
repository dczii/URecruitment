"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

type SourceQuoteProps = {
  text: string;
  lang: "en" | "zh-Hans";
  label?: string;
};

export function SourceQuote({
  text,
  lang,
  label = "Show source text",
}: SourceQuoteProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <button
        type="button"
        className="inline-flex items-center gap-1 text-caption text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        aria-expanded={expanded}
        onClick={() => setExpanded((current) => !current)}
      >
        {expanded ? (
          <ChevronUp className="size-4 shrink-0" aria-hidden="true" />
        ) : (
          <ChevronDown className="size-4 shrink-0" aria-hidden="true" />
        )}
        {expanded ? "Hide source text" : label}
      </button>
      {expanded ? (
        <div className="mt-2 rounded-md bg-source-quote-bg p-3 text-source-quote-foreground">
          <p
            className="line-clamp-4"
            lang={lang === "zh-Hans" ? "zh-Hans" : undefined}
          >
            {text}
          </p>
        </div>
      ) : null}
    </div>
  );
}
