import * as Sentry from "@sentry/nextjs";
import { baseSentryOptions, parseSentryDsn } from "@/lib/sentry-config";

Sentry.init(baseSentryOptions(parseSentryDsn(process.env.SENTRY_DSN)));
