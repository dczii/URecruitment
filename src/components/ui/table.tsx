import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

/**
 * Keep semantic tables on desktop and labelled card rows on small screens.
 * Callers supply data-label on cells; the same controls remain mounted at
 * either width so input and selection state survives viewport changes.
 */
export function Table({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<"table">) {
  return (
    <div className="responsive-table min-w-0 rounded-lg border border-border/20 bg-card shadow-sm">
      <table
        className={cn(
          "w-full border-collapse text-label",
          "[&_td]:px-4 [&_th]:px-4",
          "table-fixed [&_td]:break-words [&_th]:break-words",
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
        "[&_td]:py-3 [&_th]:py-3",
        "[&_tr]:border-t [&_tr]:border-border/20 [&_tr]:bg-card [&_tr:hover]:bg-muted/50",
        className,
      )}
      {...props}
    />
  );
}
