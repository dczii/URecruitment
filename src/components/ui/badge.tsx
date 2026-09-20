import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

export const badgeVariants = cva(
  "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-caption font-semibold whitespace-nowrap [&_svg]:size-3.5 [&_svg]:shrink-0",
  {
    variants: {
      tone: {
        neutral: "bg-muted text-muted-foreground",
        accent: "bg-primary text-primary-foreground",
        outline: "border border-input text-foreground",
        "on-track": "bg-status-on-track text-status-on-track-foreground",
        "due-soon": "bg-status-due-soon text-status-due-soon-foreground",
        overdue:
          "bg-status-overdue text-status-overdue-foreground tabular-nums",
        ended: "bg-status-ended text-status-ended-foreground",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export function Badge({
  className,
  tone,
  ...props
}: ComponentPropsWithoutRef<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
