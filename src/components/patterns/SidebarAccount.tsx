"use client";
import { ChevronsUpDown, LogOut, Pencil, UserRound } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { logout } from "@/app/login/actions";
import { TypedNameDialog } from "./TypedNameDialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getStoredRecruiterName, setStoredRecruiterName } from "@/lib/recruiter-name";
import { cn } from "@/lib/utils";

function subscribeName(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("recruiter-name-changed", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("recruiter-name-changed", callback);
  };
}
function restoreAccountFocus(trigger: HTMLButtonElement | null) {
  if (trigger?.getClientRects().length) { trigger.focus(); return; }
  const navigation = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-navigation-trigger]"))
    .find(element => element.getClientRects().length > 0);
  navigation?.focus();
}
export function SidebarAccount({ compact = false }: { compact?: boolean }) {
  const name = useSyncExternalStore(subscribeName, getStoredRecruiterName, () => null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [nameOpen, setNameOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const resize = () => {
      if (!triggerRef.current?.getClientRects().length) {
        setMenuOpen(false);
        requestAnimationFrame(() => restoreAccountFocus(triggerRef.current));
      }
    };
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [menuOpen]);
  function closeName(open: boolean) {
    setNameOpen(open);
    if (!open) requestAnimationFrame(() => restoreAccountFocus(triggerRef.current));
  }
  return <>
    <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
      <DropdownMenuTrigger ref={triggerRef} aria-label={`Account: ${name ?? "Add name"}`} title={name ?? "Add name"}
        className={cn("flex min-h-11 w-full items-center gap-3 rounded-md p-2 text-left outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring", compact && "justify-center")}>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted"><UserRound className="size-5" aria-hidden="true" /></span>
        {!compact && <><span className="min-w-0 flex-1"><span className="block truncate text-label font-semibold">{name ?? "Add name"}</span><span className="block text-caption text-muted-foreground">Recording name</span></span><ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /></>}
      </DropdownMenuTrigger>
      <DropdownMenuContent finalFocus={nameOpen ? false : triggerRef}>
        <p className="break-words border-b border-border/20 px-3 py-2 text-caption text-muted-foreground">{name ?? "Set your recording name"}</p>
        <DropdownMenuItem nativeButton render={<button type="button" />} onClick={() => { setMenuOpen(false); setNameOpen(true); }}><Pencil className="size-4" aria-hidden="true" />{name ? "Change name" : "Add name"}</DropdownMenuItem>
        <form action={logout}><DropdownMenuItem nativeButton closeOnClick={false} render={<button type="submit" />}><LogOut className="size-4" aria-hidden="true" />Sign out</DropdownMenuItem></form>
      </DropdownMenuContent>
    </DropdownMenu>
    {nameOpen && <TypedNameDialog key={name ?? "unset"} open onOpenChange={closeName} initialName={name ?? undefined} onSubmit={(value) => { setStoredRecruiterName(value); closeName(false); }} />}
  </>;
}
