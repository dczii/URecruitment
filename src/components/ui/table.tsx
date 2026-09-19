import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

/**
 * Rows stay one line tall and scroll sideways rather than wrapping into
 * multi-line cells on a phone. The first cell of each row sticks to the left
 * edge so the name stays readable while the rest scrolls; it inherits the row
 * background so the hover tint covers the whole row.
 */
export function Table({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<"table">) {
  return (
    <div className="min-w-0 overflow-x-auto rounded-lg border border-border/20 bg-card shadow-sm">
      <table
        className={cn(
          "w-full border-collapse text-label",
          "[&_td]:px-4 [&_td]:py-3 [&_th]:px-4 [&_th]:py-3",
          "[&_tbody_tr>*:first-child]:sticky [&_tbody_tr>*:first-child]:left-0 [&_tbody_tr>*:first-child]:bg-inherit",
          "[&_tbody_td]:whitespace-nowrap [&_tbody_th]:whitespace-nowrap",
          className,
        )}
        {...props}
      >
        {children}
      </table>
    </div>
  );
}

export function TableHead({
  className,
  ...props
}: ComponentPropsWithoutRef<"thead">) {
  return (
    <thead
      className={cn(
        "bg-muted/60 text-caption tracking-wide text-muted-foreground",
        "[&_th]:py-2.5 [&_th]:text-left [&_th]:font-semibold",
        className,
      )}
      {...props}
    />
  );
}

export function TableBody({
  className,
  ...props
}: ComponentPropsWithoutRef<"tbody">) {
  return (
    <tbody
      className={cn(
        "[&_tr]:border-t [&_tr]:border-border/20 [&_tr]:bg-card [&_tr:hover]:bg-muted/50",
        className,
      )}
      {...props}
    />
  );
}
