"use client";

import { Inbox, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

type ErrorStateProps = {
  title?: string;
  description?: string;
  onRetry?: () => void;
};

const centeredStackClassName =
  "flex flex-col items-center justify-center gap-4 px-4 py-8 text-center";

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className={centeredStackClassName}>
      <Inbox className="size-8 text-muted-foreground" aria-hidden="true" />
      <StateCopy title={title} description={description} />
      {action}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description,
  onRetry,
}: ErrorStateProps) {
  return (
    <div role="alert" className={centeredStackClassName}>
      <TriangleAlert className="size-8 text-destructive" aria-hidden="true" />
      <StateCopy title={title} description={description} />
      {onRetry ? (
        <Button type="button" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}

function StateCopy({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <h2 className="text-heading text-foreground">{title}</h2>
      {description ? (
        <p className="text-body text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}

type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-muted", className)}
    />
  );
}

const SKELETON_ROW_WIDTHS = ["w-full", "w-5/6", "w-2/3"] as const;

export function SkeletonRows({ count = 3 }: { count?: number }) {
  return (
    <div className="flex w-full flex-col gap-3" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <Skeleton
          key={index}
          className={cn(
            "h-4",
            SKELETON_ROW_WIDTHS[index % SKELETON_ROW_WIDTHS.length],
          )}
        />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return <Skeleton className="h-16 w-full rounded-lg" />;
}
