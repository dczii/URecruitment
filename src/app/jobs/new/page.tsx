import type { Metadata } from "next";
import { JobForm } from "@/components/features/jobs/JobForm";
import { listClients } from "@/server/jobs/clients";

export const metadata: Metadata = { title: "Create job" };

export const dynamic = "force-dynamic";

export default async function NewJobPage() {
  const clients = await listClients();

  return <JobForm clients={clients} />;
}
