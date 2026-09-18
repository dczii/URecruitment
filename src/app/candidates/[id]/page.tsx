import { notFound } from "next/navigation";
import { z } from "zod";

import { CandidateProfile } from "@/components/features/cv-processing/CandidateProfile";
import { getCandidateProfile } from "@/server/cv/candidate-profile";

export const dynamic = "force-dynamic";

const candidateIdSchema = z.uuid();

export default async function CandidatePage({
  params,
}: PageProps<"/candidates/[id]">) {
  const { id } = await params;
  if (!candidateIdSchema.safeParse(id).success) {
    notFound();
  }

  let data;
  try {
    data = await getCandidateProfile(id);
  } catch (error) {
    if (error instanceof Error && error.message.includes("was not found")) {
      notFound();
    }
    throw error;
  }

  return <CandidateProfile candidateId={id} data={data} />;
}
