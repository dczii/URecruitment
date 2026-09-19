import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { TriangleAlert } from "lucide-react";

import { FlagChecklist } from "@/components/features/gap-check/FlagChecklist";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
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
      <header className="flex min-w-0 flex-wrap items-baseline justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-2">
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
        </div>
        <Link
          href={`/search?jobId=${job.id}`}
          className={buttonVariants({ variant: "outline" })}
        >
          Search for more candidates
        </Link>
      </header>

      {job.openFlagCount > 0 ? (
        <p className="flex items-center gap-2 rounded-md border-l-4 border-status-due-soon-foreground bg-status-due-soon px-3 py-3 text-label text-status-due-soon-foreground">
          <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
          {job.openFlagCount === 1
            ? "1 open gap flag needs a recruiter answer."
            : `${job.openFlagCount} open gap flags need a recruiter answer.`}
        </p>
      ) : null}

      <div className="grid min-w-0 items-start gap-6 lg:grid-cols-2">
        <Card as="section" aria-labelledby="requirements-heading" className="gap-3">
          <CardTitle id="requirements-heading">Requirements</CardTitle>
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
        </Card>

        <FlagChecklist jobId={job.id} flags={job.openFlags} />
      </div>

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
    <li className="flex min-w-0 flex-wrap items-start gap-3 border-b border-border/20 py-3 last:border-b-0 last:pb-0 first:pt-0">
      <Badge tone={isMustHave ? "accent" : "outline"}>
        {isMustHave ? "Must-have" : "Nice-to-have"}
      </Badge>
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
    <Card
      as="section"
      aria-labelledby={headingId}
      className="gap-2 border-dashed bg-muted/40 shadow-none"
    >
      <CardTitle id={headingId}>{title}</CardTitle>
      <p className="text-body text-muted-foreground">{note}</p>
    </Card>
  );
}

function formatSgtDate(iso: string): string {
  return sgtDateFormatter.format(new Date(iso)).replace("Sept", "Sep");
}
