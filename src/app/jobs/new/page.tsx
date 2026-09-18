import { JobForm } from "@/components/features/jobs/JobForm";
import { listClients } from "@/server/jobs/clients";

export const dynamic = "force-dynamic";

export default async function NewJobPage() {
  const clients = await listClients();

  return <JobForm clients={clients} />;
}
