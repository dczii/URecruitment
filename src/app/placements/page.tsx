import { Placements } from "@/components/features/placements/Placements";
import { listPlacements } from "@/server/placements/list";

export const dynamic = "force-dynamic";

export default async function PlacementsPage() {
  const items = await listPlacements();

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-6">
      <h1 className="font-heading text-title font-semibold">
        Follow up after placement
      </h1>
      <Placements items={items} />
    </section>
  );
}
