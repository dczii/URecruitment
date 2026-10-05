"use client";
import { Menu } from "@base-ui/react/menu";
import { cn } from "@/lib/utils";

export const DropdownMenu = Menu.Root;
export const DropdownMenuTrigger = Menu.Trigger;
export function DropdownMenuContent({ className, children, ...props }: Menu.Popup.Props) {
  return <Menu.Portal><Menu.Positioner side="top" align="start" sideOffset={8} className="z-60">
    <Menu.Popup data-slot="account-menu" className={cn("w-60 max-w-[calc(100vw-2rem)] origin-[var(--transform-origin)] rounded-lg border border-border/20 bg-popover p-1 text-popover-foreground shadow-md outline-none transition-[transform,opacity] duration-150 data-starting-style:scale-97 data-starting-style:opacity-0 data-ending-style:scale-97 data-ending-style:opacity-0", className)} {...props}>{children}</Menu.Popup>
  </Menu.Positioner></Menu.Portal>;
}
export function DropdownMenuItem({ className, ...props }: Menu.Item.Props) {
  return <Menu.Item className={cn("flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-label outline-none data-highlighted:bg-muted data-highlighted:text-foreground data-highlighted:ring-2 data-highlighted:ring-inset data-highlighted:ring-ring", className)} {...props} />;
}
