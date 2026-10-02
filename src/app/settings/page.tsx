import type { Metadata } from "next";
export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <section className="flex min-w-0 flex-1 flex-col gap-6">
      <h1 className="font-heading text-title font-semibold">
        Adjust portal rules
      </h1>
      <div className="rounded-lg border border-dashed border-border/40 bg-muted/40 p-6">
        <p className="text-body text-muted-foreground">
          Stage limits and public holiday settings are not available in this prototype yet. No rules can be changed here.
        </p>
      </div>
    </section>
  );
}
