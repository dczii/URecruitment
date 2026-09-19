import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableHead } from "@/components/ui/table";
import { listJobs, type JobListItem } from "@/server/jobs/list";

export const dynamic = "force-dynamic";

const CJK_CHAR = /[\u3400-\u9FFF\uF900-\uFAFF]/;

export default async function JobsPage() {
  const jobs = await listJobs();

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-6">
      <header className="flex min-w-0 flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-heading text-title font-semibold">Browse jobs</h1>
        <Link href="/jobs/new" className={buttonVariants()}>
          New job
        </Link>
      </header>

      {jobs.length === 0 ? (
        <p className="text-body text-muted-foreground">No jobs yet.</p>
      ) : (
        <Table>
          <caption className="sr-only">
            Jobs with status, owner, open gap-flag count and candidates in
            pipeline. Open flags never block browsing.
          </caption>
          <TableHead>
            <tr>
              <th scope="col">Title</th>
              <th scope="col">Client</th>
              <th scope="col">Status</th>
              <th scope="col">Owner</th>
              <th scope="col">Open gap flags</th>
              <th scope="col">Pipeline</th>
            </tr>
          </TableHead>
          <TableBody>
            {jobs.map((job) => (
              <JobRow key={job.id} job={job} />
            ))}
          </TableBody>
        </Table>
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
    <tr>
      <th scope="row" className="text-left font-semibold">
        <Link
          href={`/jobs/${job.id}`}
          lang={titleLang}
          className="rounded-sm text-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
        >
          {job.title}
        </Link>
      </th>
      <td className="text-muted-foreground" lang={clientLang}>
        {job.clientName}
      </td>
      <td>
        <Badge tone="outline">{job.status}</Badge>
      </td>
      <td>{job.ownerName}</td>
      <td>
        <Badge
          tone={job.openFlagCount > 0 ? "due-soon" : "neutral"}
          aria-label={
            job.openFlagCount > 0
              ? `${flagLabel}. Matching is not blocked.`
              : flagLabel
          }
        >
          {flagLabel}
        </Badge>
      </td>
      <td className="tabular-nums text-muted-foreground">{pipelineLabel}</td>
    </tr>
  );
}
