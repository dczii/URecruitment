import { notFound } from "next/navigation";
import { ThrowButton } from "./throw-button";

export default function SentryTestPage() {
  if (process.env.VERCEL_ENV === "production") {
    notFound();
  }

  return (
    <main className="flex flex-1 flex-col gap-4 bg-background p-8 text-foreground">
      <h1 className="font-heading text-title font-semibold">Sentry test</h1>
      <p className="text-body text-muted-foreground">
        Throws a client error so Preview can confirm Sentry is wired. Disabled
        when VERCEL_ENV is production.
      </p>
      <ThrowButton />
    </main>
  );
}
