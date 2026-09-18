"use client";

import { useState, useTransition } from "react";

import { getOriginalCvSignedUrl } from "@/app/candidates/[id]/actions";
import { Button } from "@/components/ui/button";

export function OriginalCvLink({ candidateId }: { candidateId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        aria-busy={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await getOriginalCvSignedUrl(candidateId);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            window.open(result.url, "_blank", "noopener,noreferrer");
          });
        }}
      >
        View original CV (signed link)
      </Button>
      {error ? (
        <p role="status" aria-live="polite" className="text-caption text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
