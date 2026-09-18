import { notFound } from "next/navigation";
import { z } from "zod";

import { FlagChecklist } from "@/components/features/gap-check/FlagChecklist";
import { cn } from "@/lib/utils";
import { getJobDetail, type JobRequirement } from "@/server/jobs/list";

export const dynamic = "force-dynamic";

const CJK_CHAR = /[\u3400-\u9FFF\uF900-\uFAFF]/;
const jobIdSchema = z.uuid();

const sgtDateFormatter = new Intl.DateTimeFormat("en-SG", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Singapore",
});

export default async function JobDetailPage({
  params,
}: PageProps<"/jobs/[id]">) {
  const { id } = await params;
  if (!jobIdSchema.safeParse(id).success) {
    notFound();
  }

  const job = await getJobDetail(id);
  if (!job) {
    notFound();
  }

  const titleLang = CJK_CHAR.test(job.title) ? "zh-Hans" : undefined;
  const clientLang = CJK_CHAR.test(job.clientName) ? "zh-Hans" : undefined;
  const requirements = [...job.mustHaves, ...job.niceToHaves];
  const versionCaption =
    job.versionCreatedAt == null
      ? "No version saved yet."
      : `Showing the version saved on ${formatSgtDate(job.versionCreatedAt)}`;

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-6">
      <header className="flex min-w-0 flex-col gap-2">
        <h1
          className="font-heading text-title font-semibold break-words"
          lang={titleLang}
        >
          {job.title}
        </h1>
        <p
          className="text-body text-muted-foreground break-words"
          lang={clientLang}
        >
          {job.clientName}
        </p>
        <p className="text-caption text-muted-foreground">{versionCaption}</p>
      </header>

      {job.openFlagCount > 0 ? (
        <p className="rounded-md bg-status-due-soon px-3 py-3 text-label text-status-due-soon-foreground">
          {job.openFlagCount === 1
            ? "1 open gap flag needs a recruiter answer — matching is not blocked while it's open."
            : `${job.openFlagCount} open gap flags need a recruiter answer — matching is not blocked while they're open.`}
        </p>
      ) : null}

      <div className="grid min-w-0 gap-6 lg:grid-cols-2">
        <section
          aria-labelledby="requirements-heading"
          className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-card p-4"
        >
          <h2
            id="requirements-heading"
            className="font-heading text-heading font-semibold"
          >
            Requirements
          </h2>
          {requirements.length === 0 ? (
            <p className="text-body text-muted-foreground">
              No requirements on this version.
            </p>
          ) : (
            <ul className="flex min-w-0 flex-col">
              {requirements.map((requirement, index) => (
                <RequirementRow
                  key={`${requirement.marking}-${index}`}
                  requirement={requirement}
                />
              ))}
            </ul>
          )}
        </section>

        <FlagChecklist jobId={job.id} flags={job.openFlags} />
      </div>

      <PlaceholderSection
        headingId="ranked-matches-heading"
        title="Ranked matches"
        note="Coming in a later phase."
      />

      <PlaceholderSection
        headingId="pipeline-board-heading"
        title="Pipeline board"
        note="Coming in a later phase."
      />
    </section>
  );
}

function RequirementRow({ requirement }: { requirement: JobRequirement }) {
  const isMustHave = requirement.marking === "must_have";
  const lang = CJK_CHAR.test(requirement.text) ? "zh-Hans" : undefined;

  return (
    <li className="flex min-w-0 flex-wrap items-start gap-3 border-b border-border py-3 last:border-b-0 last:pb-0 first:pt-0">
      <span
        className={cn(
          "inline-flex shrink-0 items-center rounded-sm px-2 py-1 text-caption font-semibold",
          isMustHave
            ? "bg-destructive text-destructive-foreground"
            : "bg-muted text-muted-foreground",
        )}
      >
        {isMustHave ? "Must-have" : "Nice-to-have"}
      </span>
      <span className="min-w-0 flex-1 text-label break-words" lang={lang}>
        {requirement.text}
      </span>
    </li>
  );
}

function PlaceholderSection({
  headingId,
  title,
  note,
}: {
  headingId: string;
  title: string;
  note: string;
}) {
  return (
    <section
      aria-labelledby={headingId}
      className="flex min-w-0 flex-col gap-2 rounded-lg border border-border bg-card p-4"
    >
      <h2
        id={headingId}
        className="font-heading text-heading font-semibold"
      >
        {title}
      </h2>
      <p className="text-body text-muted-foreground">{note}</p>
    </section>
  );
}

function formatSgtDate(iso: string): string {
  return sgtDateFormatter.format(new Date(iso)).replace("Sept", "Sep");
}
