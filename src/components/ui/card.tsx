import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

import { cn } from "@/lib/utils";

type CardProps<T extends ElementType> = {
  as?: T;
  children: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children">;

export function Card<T extends ElementType = "div">({
  as,
  className,
  children,
  ...props
}: CardProps<T>) {
  const Component = (as ?? "div") as ElementType;

  return (
    <Component
      className={cn(
        "flex min-w-0 flex-col gap-4 rounded-lg border border-border/20 bg-card p-5 shadow-sm lg:p-6",
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

export function CardHeader({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-wrap items-center justify-between gap-3",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<"h2">) {
  return (
    <h2
      className={cn("font-heading text-heading font-semibold", className)}
      {...props}
    >
      {children}
    </h2>
  );
}
