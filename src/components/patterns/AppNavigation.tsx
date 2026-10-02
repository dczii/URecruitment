"use client";

import { BadgeCheck, BriefcaseBusiness, LayoutDashboard, Menu, Search, Settings, UserRound, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { TypedNameDialog } from "@/components/patterns/TypedNameDialog";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { getStoredRecruiterName, setStoredRecruiterName } from "@/lib/recruiter-name";
import { cn } from "@/lib/utils";

const destinations = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Jobs", href: "/jobs", icon: BriefcaseBusiness },
  { name: "Candidates", href: "/search", icon: Search },
  { name: "Placements", href: "/placements", icon: BadgeCheck },
  { name: "Settings", href: "/settings", icon: Settings },
] as const;

function subscribeName(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("recruiter-name-changed", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("recruiter-name-changed", callback);
  };
}

function Brand() {
  return <span className="inline-flex rounded-sm bg-brand-surface p-2"><Image src="/user-logo.png" alt="USER Experience Researchers" width={848} height={145} className="h-auto w-48 max-w-full object-contain" unoptimized /></span>;
}

function NavigationLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav aria-label="Primary navigation" className="flex flex-col gap-1">
      {destinations.map(({ name, href, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined} onClick={onNavigate}
            className={cn("flex min-h-11 items-center gap-3 rounded-md px-3 text-label font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
            <Icon className="size-5 shrink-0" aria-hidden="true" />
            {name}
            {active && <span className="ml-auto size-1.5 rounded-full bg-primary" aria-hidden="true" />}
          </Link>
        );
      })}
    </nav>
  );
}

function PrototypeNotice() {
  return <div className="mt-auto border-t border-border/20 px-3 pt-4"><p className="text-caption font-semibold">MVP prototype</p><p className="mt-1 text-caption text-muted-foreground">Fictional data only</p></div>;
}

export function DesktopNavigation() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-8 border-r border-border/20 bg-card px-4 py-6 lg:flex">
      <div className="flex min-h-11 items-center px-2"><Brand /></div>
      <div className="flex flex-col gap-3"><p className="px-3 text-caption text-muted-foreground">Workspace</p><NavigationLinks pathname={pathname} /></div>
      <PrototypeNotice />
    </aside>
  );
}

export function AppHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [nameOpen, setNameOpen] = useState(false);
  const name = useSyncExternalStore(subscribeName, getStoredRecruiterName, () => null);
  const pageName = destinations.find(({ href }) => pathname.startsWith(href))?.name ?? "Dashboard";
  return (
    <header className="sticky top-0 z-40 flex min-h-16 flex-wrap items-center gap-2 border-b border-border/20 bg-card px-4 py-2 lg:gap-4 lg:px-10">
      <div className="flex h-9 w-full items-center lg:hidden"><Brand /></div>
      <div className="lg:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger render={<Button variant="ghost" className="size-11" aria-label="Open navigation" />}><Menu className="size-5" /></SheetTrigger>
          <SheetContent side="left" showCloseButton={false} className="w-[calc(100%-1rem)] max-w-86 gap-6 p-4">
            <SheetHeader className="flex-row items-center justify-between gap-3 p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle><SheetDescription className="sr-only">Primary portal navigation</SheetDescription><Brand />
              <SheetClose aria-label="Close navigation" className="flex size-11 shrink-0 items-center justify-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"><X className="size-5" /></SheetClose>
            </SheetHeader>
            <NavigationLinks pathname={pathname} onNavigate={() => setOpen(false)} /><PrototypeNotice />
          </SheetContent>
        </Sheet>
      </div>
      <p aria-label="Current page" className="min-w-0 flex-1 text-label font-semibold">{pageName}</p>
      <Button variant="outline" aria-label={name ? "Change recruiter name" : "Add name"} onClick={() => setNameOpen(true)} className="max-w-[60%] gap-2">
        <UserRound className="size-4 shrink-0" aria-hidden="true" />
        <span className="truncate">{name ?? "Add name"}</span>
        {name && <span className="hidden text-caption text-muted-foreground lg:inline">Change</span>}
      </Button>
      {nameOpen && <TypedNameDialog key={name ?? "unset"} open onOpenChange={setNameOpen} initialName={name ?? undefined} onSubmit={(value) => { setStoredRecruiterName(value); setNameOpen(false); }} />}
    </header>
  );
}
