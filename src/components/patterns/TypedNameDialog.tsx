"use client";

import { useId, useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { isValidRecruiterName } from "@/lib/recruiter-name";

type TypedNameDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialName?: string;
  onSubmit: (name: string) => void;
};

export function TypedNameDialog({
  open,
  onOpenChange,
  initialName,
  onSubmit,
}: TypedNameDialogProps) {
  const isChanging = initialName !== undefined;
  const [name, setName] = useState(initialName ?? "");
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();
  const errorId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isValidRecruiterName(name)) {
      setError("Enter your name to continue.");
      inputRef.current?.focus();
      return;
    }

    setError(null);
    onSubmit(name.trim());
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isChanging ? "Change your name" : "What's your name?"}
          </DialogTitle>
          <DialogDescription>
            {
              "We'll remember this on your device and use it to record who made each change."
            }
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <label htmlFor={inputId} className="text-label text-foreground">
              Name
            </label>
            <input
              ref={inputRef}
              id={inputId}
              type="text"
              name="name"
              autoComplete="name"
              value={name}
              aria-invalid={error != null}
              aria-describedby={error ? errorId : undefined}
              onChange={(event) => {
                setName(event.target.value);
                if (error) {
                  setError(null);
                }
              }}
              className="h-11 rounded-md border border-input bg-background px-3 text-body text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            {error ? (
              <p
                id={errorId}
                className="text-caption text-destructive"
                role="alert"
              >
                {error}
              </p>
            ) : null}
          </div>
          <Button type="submit" className="h-11">
            {isChanging ? "Save" : "Continue"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
