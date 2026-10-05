"use client";
import { Tooltip as Primitive } from "@base-ui/react/tooltip";
import type { ReactElement } from "react";
export const TooltipProvider = Primitive.Provider;
export function Tooltip({ label, children, disabled = false }: { label: string; children: ReactElement; disabled?: boolean }) {
  return <Primitive.Root><Primitive.Trigger disabled={disabled} render={children} />
    <Primitive.Portal><Primitive.Positioner side="right" sideOffset={8} className="z-60">
      <Primitive.Popup role="tooltip" aria-label={label} data-slot="sidebar-tooltip" className="max-w-64 rounded-md bg-foreground px-3 py-2 text-caption text-background shadow-sm">{label}</Primitive.Popup>
    </Primitive.Positioner></Primitive.Portal>
  </Primitive.Root>;
}
