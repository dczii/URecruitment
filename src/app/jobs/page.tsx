import Link from "next/link";

import { cn } from "@/lib/utils";
import { listJobs, type JobListItem } from "@/server/jobs/list";

export const dynamic = "force-dynamic";

const CJK_CHAR = /[\u3400-\u9FFF\uF900-\uFAFF]/;

export default async function JobsPage() {
  const jobs = await listJobs();

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-6">
      <header className="flex min-w-0 flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-heading text-title font-semibold">Browse jobs</h1>
        <Link
          href="/jobs/new"
          className="text-label font-semibold text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
        >
          New job
        </Link>
      </header>

      {jobs.length === 0 ? (
        <p className="text-body text-muted-foreground">No jobs yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border bg-card">
          <table className="w-full border-collapse text-label">
            <caption className="sr-only">
              Jobs with status, owner, open gap-flag count and candidates in
              pipeline. Open flags never block browsing.
            </caption>
            <thead>
              <tr className="border-b border-border text-caption text-muted-foreground">
                <th scope="col" className="px-4 py-3 text-left font-semibold">
                  Title
                </th>
                <th scope="col" className="px-4 py-3 text-left font-semibold">
                  Client
                </th>
                <th scope="col" className="px-4 py-3 text-left font-semibold">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 text-left font-semibold">
                  Owner
                </th>
                <th scope="col" className="px-4 py-3 text-left font-semibold">
                  Open gap flags
                </th>
                <th scope="col" className="px-4 py-3 text-left font-semibold">
                  Pipeline
                </th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <JobRow key={job.id} job={job} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function JobRow({ job }: { job: JobListItem }) {
  const titleLang = CJK_CHAR.test(job.title) ? "zh-Hans" : undefined;
  const clientLang = CJK_CHAR.test(job.clientName) ? "zh-Hans" : undefined;
  const flagLabel =
    job.openFlagCount === 1
      ? "1 open flag"
      : `${job.openFlagCount} open flags`;
  const pipelineLabel =
    job.pipelineCandidateCount === 1
      ? "1 candidate in pipeline"
      : `${job.pipelineCandidateCount} candidates in pipeline`;

  return (
    <tr className="border-b border-border last:border-b-0">
      <th scope="row" className="px-4 py-3 text-left font-semibold">
        <Link
          href={`/jobs/${job.id}`}
          lang={titleLang}
          className="text-foreground outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
        >
          {job.title}
        </Link>
      </th>
      <td className="px-4 py-3 text-muted-foreground" lang={clientLang}>
        {job.clientName}
      </td>
      <td className="px-4 py-3">{job.status}</td>
      <td className="px-4 py-3">{job.ownerName}</td>
      <td className="px-4 py-3">
        <span
          className={cn(
            "inline-flex items-center rounded-sm px-2 py-1 text-caption font-semibold",
            job.openFlagCount > 0
              ? "bg-status-due-soon text-status-due-soon-foreground"
              : "bg-muted text-muted-foreground",
          )}
          aria-label={
            job.openFlagCount > 0
              ? `${flagLabel}. Matching is not blocked.`
              : flagLabel
          }
        >
          {flagLabel}
        </span>
      </td>
      <td className="px-4 py-3 tabular-nums text-muted-foreground">
        {pipelineLabel}
      </td>
    </tr>
  );
}
