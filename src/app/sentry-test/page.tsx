import { notFound } from "next/navigation";
import { ThrowButton } from "./throw-button";

export default function SentryTestPage() {
  if (process.env.VERCEL_ENV === "production") {
    notFound();
  }

  return (
    <main className="bg-background text-foreground flex flex-1 flex-col gap-4 p-8">
      <h1 className="text-2xl font-semibold tracking-tight">Sentry test</h1>
      <p className="text-muted-foreground">
        Throws a client error so Preview can confirm Sentry is wired. Disabled
        when VERCEL_ENV is production.
      </p>
      <ThrowButton />
    </main>
  );
}
