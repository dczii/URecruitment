import type { ComponentPropsWithRef } from "react";

import { cn } from "@/lib/utils";

/**
 * Shared control surface. Phone sizing is 44px tall and 16px text, which is
 * the touch target minimum and the size below which iOS zooms on focus.
 */
const fieldClassName =
  "w-full min-w-0 rounded-md border border-input bg-card px-3 text-body text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 lg:text-label";

const controlHeight = "h-11 lg:h-10";

export function Input({ className, ...props }: ComponentPropsWithRef<"input">) {
  return (
    <input
      className={cn(fieldClassName, controlHeight, className)}
      {...props}
    />
  );
}

export function Select({
  className,
  ...props
}: ComponentPropsWithRef<"select">) {
  return (
    <select
      className={cn(fieldClassName, controlHeight, "pr-8", className)}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: ComponentPropsWithRef<"textarea">) {
  return (
    <textarea className={cn(fieldClassName, "py-2.5", className)} {...props} />
  );
}

export function FieldLabel({
  className,
  ...props
}: ComponentPropsWithRef<"label">) {
  return (
    <label
      className={cn("text-label font-semibold text-foreground", className)}
      {...props}
    />
  );
}
