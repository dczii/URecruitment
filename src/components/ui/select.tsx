"use client";

import { Select as SelectPrimitive } from "@base-ui/react/select";
import { Check, ChevronDown } from "lucide-react";
import type { AriaAttributes, Ref } from "react";

import { cn } from "@/lib/utils";

type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type SelectFieldProps = Pick<AriaAttributes, "aria-invalid" | "aria-describedby"> & {
  id: string;
  options: readonly SelectOption[];
  value: string;
  onValueChange: (value: string) => void;
  name?: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  ref?: Ref<HTMLButtonElement>;
};

/** A single-value field. Empty string stays a real option unless a placeholder is supplied. */
export function SelectField({
  id, options, value, onValueChange, name, disabled, placeholder, className, ref,
  ...ariaProps
}: SelectFieldProps) {
  const items = placeholder
    ? [{ value: null, label: placeholder }, ...options]
    : options;

  return (
    <SelectPrimitive.Root
      items={items}
      value={placeholder && value === "" ? null : value}
      onValueChange={(next) => onValueChange(next ?? "")}
      name={name}
      disabled={disabled}
      modal={false}
    >
      <SelectPrimitive.Trigger
        id={id}
        ref={ref}
        data-slot="select-trigger"
        {...ariaProps}
        className={`${cn(
          "flex h-11 w-full min-w-0 items-center justify-between gap-2 rounded-md border border-input bg-card px-3 text-left text-foreground outline-none lg:h-10",
          "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "data-popup-open:border-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive",
          className,
        )} text-body lg:text-label`}
      >
        <SelectPrimitive.Value
          placeholder={placeholder}
          className="min-w-0 flex-1 truncate data-placeholder:text-muted-foreground"
        />
        <SelectPrimitive.Icon className="shrink-0 text-muted-foreground">
          <ChevronDown className="size-4" aria-hidden="true" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Positioner
          side="bottom"
          align="start"
          sideOffset={4}
          collisionPadding={8}
          alignItemWithTrigger={false}
          className="z-50 w-[max(var(--anchor-width),16rem)] max-w-[calc(100vw-1rem)]"
        >
          <SelectPrimitive.Popup
            data-slot="select-popup"
            className="w-full overflow-hidden rounded-lg border border-input bg-popover text-popover-foreground shadow-md outline-none"
          >
            <SelectPrimitive.List className="max-h-[min(20rem,calc(var(--available-height)-2px))] overflow-y-auto overscroll-contain p-1">
              {items.map((option) => (
                <SelectPrimitive.Item
                  key={option.value ?? "placeholder"}
                  value={option.value}
                  label={option.label}
                  disabled={"disabled" in option ? option.disabled : false}
                  className="flex min-h-11 cursor-default items-center gap-2 rounded-sm px-3 py-2 text-body outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:text-muted-foreground lg:min-h-10 lg:text-label"
                >
                  <SelectPrimitive.ItemText className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                    {option.label}
                  </SelectPrimitive.ItemText>
                  <span className="flex size-4 shrink-0 items-center justify-center" aria-hidden="true">
                    <SelectPrimitive.ItemIndicator>
                      <Check className="size-4" />
                    </SelectPrimitive.ItemIndicator>
                  </span>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.List>
          </SelectPrimitive.Popup>
        </SelectPrimitive.Positioner>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
