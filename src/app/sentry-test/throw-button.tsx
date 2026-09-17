"use client";

export function ThrowButton() {
  return (
    <button
      type="button"
      className="bg-primary text-primary-foreground inline-flex h-8 items-center rounded-lg px-2.5 text-sm font-medium"
      onClick={() => {
        throw new Error("Sentry client test error (deliberate)");
      }}
    >
      Throw a client error
    </button>
  );
}
