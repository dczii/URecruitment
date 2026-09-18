import * as Sentry from "@sentry/nextjs";
import { baseSentryOptions, parseSentryDsn } from "./lib/sentry-config";

Sentry.init(
  baseSentryOptions(parseSentryDsn(
    process.env.NEXT_PUBLIC_SENTRY_DSN,
    "NEXT_PUBLIC_SENTRY_DSN",
  )),
);

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
