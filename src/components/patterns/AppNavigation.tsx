"use client";

import { BadgeCheck, BriefcaseBusiness, LayoutDashboard, Menu, Search, Settings, PanelLeftClose, PanelLeftOpen, Info, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect, useId, type MouseEvent } from "react";
import { SidebarAccount } from "./SidebarAccount";
import { Tooltip, TooltipProvider } from "@/components/ui/tooltip";
import { flushSync } from "react-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const destinations = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Jobs", href: "/jobs", icon: BriefcaseBusiness },
  { name: "Candidates", href: "/search", icon: Search },
  { name: "Placements", href: "/placements", icon: BadgeCheck },
  { name: "Settings", href: "/settings", icon: Settings },
] as const;

function Brand() {
  return <span className="inline-flex max-w-full rounded-sm bg-brand-surface p-2"><Image src="/user-logo.png" alt="USER Experience Researchers" width={848} height={145} className="h-auto w-48 max-w-full object-contain" unoptimized /></span>;
}

function NavigationLinks({ pathname, onNavigate, compact = false }: { pathname: string; onNavigate?: () => void; compact?: boolean }) {
  return (
    <nav aria-label="Primary navigation" className="flex flex-col gap-1">
      {destinations.map(({ name, href, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Tooltip key={href} label={name} disabled={!compact}><Link aria-label={name} href={href} aria-current={active ? "page" : undefined} onClick={onNavigate}
            className={cn("flex min-h-11 items-center gap-3 rounded-md px-3 text-label font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
            <Icon className="size-5 shrink-0" aria-hidden="true" />
            <span className={compact ? "sr-only" : "truncate"}>{name}</span>
            {!compact && active && <span className="ml-auto size-1.5 rounded-full bg-primary" aria-hidden="true" />}
          </Link></Tooltip>
        );
      })}
    </nav>
  );
}

function PrototypeNotice({ compact = false }: { compact?: boolean }) {
  return compact ? <Tooltip label="MVP prototype · Fictional data only"><button type="button" aria-label="MVP prototype · Fictional data only" className="flex size-11 items-center justify-center rounded-md text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"><Info className="size-4" aria-hidden="true" /></button></Tooltip> : <div className="px-2 pb-2"><p className="text-caption font-semibold">MVP prototype</p><p className="mt-1 text-caption text-muted-foreground">Fictional data only</p></div>;
}

export function DesktopNavigation() {
  const pathname = usePathname();
  const [compact, setCompact] = useState(false);
  const asideRef = useRef<HTMLElement>(null);
  const animationRef = useRef<Animation | null>(null);
  const id = useId();
  useEffect(() => {
    const stop = () => { animationRef.current?.cancel(); animationRef.current = null; };
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    window.addEventListener("keydown", stop);
    window.addEventListener("resize", stop);
    motion.addEventListener("change", stop);
    return () => { stop(); window.removeEventListener("keydown", stop); window.removeEventListener("resize", stop); motion.removeEventListener("change", stop); };
  }, []);
  function toggle(event: MouseEvent<HTMLButtonElement>) {
    const column = asideRef.current?.parentElement?.querySelector<HTMLElement>("[data-shell-column]");
    const animate = event.detail > 0 && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const before = column?.getBoundingClientRect().left;
    animationRef.current?.cancel();
    flushSync(() => setCompact(value => !value));
    if (animate && column && before !== undefined && column.animate) {
      const offset = before - column.getBoundingClientRect().left;
      animationRef.current = column.animate([{ transform: `translateX(${offset}px)` }, { transform: "translateX(0)" }], { duration: 200, easing: "cubic-bezier(0.645,0.045,0.355,1)" });
    }
  }
  return <TooltipProvider delay={350}>
    <aside ref={asideRef} aria-label="Workspace sidebar" data-compact={compact} className={cn("sidebar sticky top-0 isolate hidden h-dvh shrink-0 flex-col px-3 py-4 lg:flex", compact ? "w-18" : "w-60")}>
      <div aria-hidden="true" className="sidebar-surface pointer-events-none absolute inset-y-0 left-0 -z-10 w-60 border-r border-border/20 bg-card" />
      <div className="mb-6 flex min-h-11 shrink-0 items-center gap-2">
        <Tooltip label={compact ? "Expand sidebar" : "Collapse sidebar"}><Button data-navigation-trigger variant="ghost" aria-label={compact ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!compact} aria-controls={id} onClick={toggle} className="size-11 shrink-0">{compact ? <PanelLeftOpen className="size-5" /> : <PanelLeftClose className="size-5" />}</Button></Tooltip>
        {!compact && <div className="min-w-0 flex-1"><Brand /></div>}
      </div>
      <div id={id} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <p aria-hidden={compact} className={cn("mb-3 h-4 px-3 text-caption text-muted-foreground", compact && "invisible")}>Workspace</p>
        <NavigationLinks pathname={pathname} compact={compact} />
      </div>
      <div className="mt-4 shrink-0 border-t border-border/20 pt-3"><PrototypeNotice compact={compact} /><SidebarAccount compact={compact} /></div>
    </aside>
  </TooltipProvider>;
}

export function AppHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 64rem)");
    const resize = () => { if (desktop.matches) setOpen(false); };
    desktop.addEventListener("change", resize);
    return () => desktop.removeEventListener("change", resize);
  }, []);
  const pageName = destinations.find(({ href }) => pathname.startsWith(href))?.name ?? "Dashboard";
  return (
    <header className="sticky top-0 z-40 flex min-h-16 flex-wrap items-center gap-2 border-b border-border/20 bg-card px-4 py-2 lg:gap-4 lg:px-10">
      <div className="flex h-9 w-full items-center lg:hidden"><Brand /></div>
      <div className="lg:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger render={<Button variant="ghost" data-navigation-trigger className="size-11" aria-label="Open navigation" />}><Menu className="size-5" /></SheetTrigger>
          <SheetContent side="left" showCloseButton={false} className="w-[calc(100%-1rem)] max-w-86 gap-6 p-4">
            <SheetHeader className="flex-row items-center justify-between gap-3 p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle><SheetDescription className="sr-only">Primary portal navigation</SheetDescription><Brand />
              <SheetClose aria-label="Close navigation" className="flex size-11 shrink-0 items-center justify-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"><X className="size-5" /></SheetClose>
            </SheetHeader>
            <div className="min-h-0 flex-1 overflow-y-auto"><NavigationLinks pathname={pathname} onNavigate={() => setOpen(false)} /></div><div className="shrink-0 border-t border-border/20 pt-3"><PrototypeNotice /><SidebarAccount /></div>
          </SheetContent>
        </Sheet>
      </div>
      <p aria-label="Current page" className="min-w-0 flex-1 text-label font-semibold">{pageName}</p>
    </header>
  );
}
