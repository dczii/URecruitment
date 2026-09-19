import type { ReactNode } from "react";

import {
  AppHeader,
  DesktopNavigation,
} from "@/components/patterns/AppNavigation";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only fixed top-2 left-2 z-100 rounded-md bg-card px-3 py-2 text-label font-semibold text-primary shadow-md outline-none focus:not-sr-only focus-visible:not-sr-only focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        Skip to content
      </a>
      <div className="flex min-h-screen bg-background text-foreground">
        <DesktopNavigation />
        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader />
          <main
            id="main-content"
            tabIndex={-1}
            className="flex min-w-0 flex-1 flex-col gap-6 px-4 py-6 outline-none lg:px-10 lg:py-8"
          >
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
