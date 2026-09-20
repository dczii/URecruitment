"use client";

import {
  BadgeCheck,
  BriefcaseBusiness,
  LayoutDashboard,
  Menu,
  Search,
  Settings,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const destinations = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Jobs", href: "/jobs", icon: BriefcaseBusiness },
  { name: "Candidates", href: "/search", icon: Search },
  { name: "Placements", href: "/placements", icon: BadgeCheck },
  { name: "Settings", href: "/settings", icon: Settings },
] as const;

function currentPage(pathname: string) {
  return (
    destinations.find(({ href }) => pathname.startsWith(href))?.name ??
    "Dashboard"
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex h-12 items-center gap-3 px-2">
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm",
          compact ? "size-8" : "size-9",
        )}
        aria-hidden="true"
      >
        <BriefcaseBusiness className="size-5" />
      </span>
      <span className="font-heading text-heading font-semibold tracking-tight">
        URecruitment
      </span>
    </div>
  );
}

/**
 * `rail` renders icon-only links, so each one carries its name as its
 * accessible label instead of visible text. The name, href and focus ring stay
 * identical in both layouts.
 */
function NavigationLinks({
  pathname,
  onNavigate,
  rail = false,
}: {
  pathname: string;
  onNavigate?: () => void;
  rail?: boolean;
}) {
  return (
    <nav
      aria-label="Primary navigation"
      className={cn("flex flex-col gap-1", rail && "items-center")}
    >
      {destinations.map(({ name, href, icon: Icon }) => {
        const isCurrent = pathname.startsWith(href);

        return (
          <Link
            key={href}
            href={href}
            aria-current={isCurrent ? "page" : undefined}
            aria-label={rail ? name : undefined}
            title={rail ? name : undefined}
            onClick={onNavigate}
            className={cn(
              "relative flex items-center rounded-md outline-none transition-colors",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              rail
                ? "size-10 justify-center"
                : "h-11 gap-3 px-3 text-label font-semibold",
              isCurrent
                ? "bg-accent text-accent-foreground before:absolute before:top-2 before:bottom-2 before:-left-1 before:w-1 before:rounded-full before:bg-primary before:content-['']"
                : "text-foreground hover:bg-muted",
            )}
          >
            <Icon
              className={cn(
                "size-5 shrink-0",
                isCurrent ? "text-accent-foreground" : "text-muted-foreground",
              )}
              aria-hidden="true"
            />
            {rail ? null : name}
          </Link>
        );
      })}
    </nav>
  );
}

function PrototypeNotice() {
  return (
    <div className="mt-auto rounded-md border border-border/20 bg-muted p-3">
      <p className="text-caption font-semibold">MVP prototype</p>
      <p className="text-caption text-muted-foreground">Fictional data only</p>
    </div>
  );
}

export function DesktopNavigation() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-14 shrink-0 flex-col items-center gap-1 border-r border-border/20 bg-card px-2 py-3 lg:flex">
      {/* Not a link: Dashboard already is one, and a focus stop here would sit
          between the skip link and the first destination. */}
      <p className="mb-3 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <BriefcaseBusiness className="size-5" aria-hidden="true" />
        <span className="sr-only">URecruitment</span>
      </p>
      <NavigationLinks pathname={pathname} rail />
      <p
        title="MVP prototype — fictional data only"
        className="mt-auto rounded-md bg-muted px-2 py-1 text-caption font-semibold text-muted-foreground"
      >
        MVP<span className="sr-only"> prototype — fictional data only</span>
      </p>
    </aside>
  );
}

export function AppHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const pageName = currentPage(pathname);

  return (
    <header className="sticky top-0 z-40 flex min-h-16 items-center gap-2 border-b border-border/20 bg-card/85 px-3 backdrop-blur lg:min-h-18 lg:px-10">
      <div className="lg:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={
              <Button
                variant="ghost"
                className="size-11"
                aria-label="Open navigation"
              />
            }
          >
            <Menu className="size-5" />
          </SheetTrigger>
          <SheetContent
            side="left"
            showCloseButton={false}
            className="w-[calc(100%-1rem)] max-w-86 gap-5 p-4"
          >
            <SheetHeader className="flex-row items-center justify-between p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <SheetDescription className="sr-only">
                Primary portal navigation
              </SheetDescription>
              <Brand compact />
              <SheetClose
                className="flex size-11 items-center justify-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="Close navigation"
              >
                <X className="size-5" />
              </SheetClose>
            </SheetHeader>
            <div className="rounded-md border border-border/20 bg-muted p-3">
              <p className="text-label font-semibold">Recording as Maya Tan</p>
              <span className="text-caption font-semibold text-primary underline">
                Change recruiter name
              </span>
            </div>
            <NavigationLinks
              pathname={pathname}
              onNavigate={() => setOpen(false)}
            />
            <PrototypeNotice />
          </SheetContent>
        </Sheet>
      </div>

      <p
        aria-label="Current page"
        className="min-w-0 flex-1 font-heading text-heading font-semibold tracking-tight"
      >
        {pageName}
      </p>

      <div
        aria-label="Recruiter name"
        className="flex min-h-11 shrink-0 items-center gap-2 rounded-md border border-border/20 bg-muted/60 px-3"
      >
        <UserRound className="size-4 text-muted-foreground" aria-hidden="true" />
        <span className="max-w-40 truncate text-caption font-semibold lg:max-w-none lg:text-label">
          Recording as Maya Tan
        </span>
        <span className="hidden text-label font-semibold text-primary underline lg:inline">
          Change
        </span>
      </div>
    </header>
  );
}
