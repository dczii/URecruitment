import { CircleCheck, Clock, TriangleAlert, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type DelayStatusBadgeProps =
  | { status: "on-track" | "due-soon" }
  | { status: "overdue"; daysOverdue: number }
  | { status: "none" };

const badgeClassName =
  "inline-flex items-center gap-1 whitespace-nowrap rounded-sm px-2 py-1 text-label";

export function DelayStatusBadge(props: DelayStatusBadgeProps) {
  if (props.status === "none") {
    return null;
  }

  const { Icon, className, label, ariaLabel } = resolveBadge(props);

  return (
    <span className={cn(badgeClassName, className)} aria-label={ariaLabel}>
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      {label}
    </span>
  );
}

function resolveBadge(props: Exclude<DelayStatusBadgeProps, { status: "none" }>): {
  Icon: LucideIcon;
  className: string;
  label: string;
  ariaLabel: string;
} {
  switch (props.status) {
    case "on-track":
      return {
        Icon: CircleCheck,
        className: "bg-status-on-track text-status-on-track-foreground",
        label: "On track",
        ariaLabel: "On track",
      };
    case "due-soon":
      return {
        Icon: Clock,
        className: "bg-status-due-soon text-status-due-soon-foreground",
        label: "Due soon",
        ariaLabel: "Due soon",
      };
    case "overdue": {
      const { daysOverdue } = props;
      const dayWord = daysOverdue === 1 ? "day" : "days";
      return {
        Icon: TriangleAlert,
        className: "bg-status-overdue text-status-overdue-foreground tabular-nums",
        label: `Overdue · ${daysOverdue} ${dayWord}`,
        ariaLabel: `Overdue by ${daysOverdue} working ${dayWord}`,
      };
    }
  }
}
