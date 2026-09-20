import { CircleCheck, Clock, TriangleAlert, type LucideIcon } from "lucide-react";

import { Badge, type badgeVariants } from "@/components/ui/badge";
import type { VariantProps } from "class-variance-authority";

type DelayStatusBadgeProps =
  | { status: "on-track" | "due-soon" }
  | { status: "overdue"; daysOverdue: number }
  | { status: "none" };

export function DelayStatusBadge(props: DelayStatusBadgeProps) {
  if (props.status === "none") {
    return null;
  }

  const { Icon, tone, label, ariaLabel } = resolveBadge(props);

  return (
    <Badge tone={tone} aria-label={ariaLabel}>
      <Icon aria-hidden="true" />
      {label}
    </Badge>
  );
}

function resolveBadge(props: Exclude<DelayStatusBadgeProps, { status: "none" }>): {
  Icon: LucideIcon;
  tone: VariantProps<typeof badgeVariants>["tone"];
  label: string;
  ariaLabel: string;
} {
  switch (props.status) {
    case "on-track":
      return {
        Icon: CircleCheck,
        tone: "on-track",
        label: "On track",
        ariaLabel: "On track",
      };
    case "due-soon":
      return {
        Icon: Clock,
        tone: "due-soon",
        label: "Due soon",
        ariaLabel: "Due soon",
      };
    case "overdue": {
      const { daysOverdue } = props;
      const dayWord = daysOverdue === 1 ? "day" : "days";
      return {
        Icon: TriangleAlert,
        tone: "overdue",
        label: `Overdue · ${daysOverdue} ${dayWord}`,
        ariaLabel: `Overdue by ${daysOverdue} working ${dayWord}`,
      };
    }
  }
}
