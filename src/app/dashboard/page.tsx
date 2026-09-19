import { Dashboard } from "@/components/features/dashboard/Dashboard";
import {
  getDashboardData,
  getFilterOptions,
  type DashboardFilters,
} from "@/server/dashboard/data";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  client?: string;
  job?: string;
  stage?: string;
  owner?: string;
}>;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const filters: DashboardFilters = {
    clientName: params.client || undefined,
    jobTitle: params.job || undefined,
    stage: params.stage || undefined,
    ownerName: params.owner || undefined,
  };

  const [data, filterOptions] = await Promise.all([
    getDashboardData(filters),
    getFilterOptions(),
  ]);

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-6">
      <h1 className="font-heading text-title font-semibold">
        What needs attention today
      </h1>
      <Dashboard data={data} filterOptions={filterOptions} />
    </section>
  );
}
