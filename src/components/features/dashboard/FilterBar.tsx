"use client";

import { useId } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldLabel } from "@/components/ui/field";
import { SelectField } from "@/components/ui/select";
import type { FilterOptions } from "@/server/dashboard/data";

function FilterSelect({
  label,
  param,
  options,
}: {
  label: string;
  param: "client" | "job" | "stage" | "owner";
  options: string[];
}) {
  const id = useId();
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get(param) ?? "";

  function onChange(value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (value) {
      next.set(param, value);
    } else {
      next.delete(param);
    }
    router.push(`/dashboard?${next.toString()}`);
  }

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <FieldLabel htmlFor={id} className="text-caption text-muted-foreground">
        {label}
      </FieldLabel>
      <SelectField
        id={id}
        value={current}
        onValueChange={onChange}
        options={[
          { value: "", label: "All" },
          ...(current && !options.includes(current)
            ? [{ value: current, label: `${current} (unavailable)`, disabled: true }]
            : []),
          ...options.map((option) => ({ value: option, label: option })),
        ]}
      />
    </div>
  );
}

export function FilterBar({ options }: { options: FilterOptions }) {
  const params = useSearchParams();
  const router = useRouter();
  const applied = ["client", "job", "stage", "owner"].filter((key) => params.get(key));
  return (
    <Card
      aria-label="Dashboard filters"
      className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4"
    >
      <div className="col-span-full flex flex-wrap items-center justify-between gap-2">
        <p className="text-label font-semibold">{applied.length ? `${applied.length} filters applied` : "All attention items"}</p>
        {applied.length > 0 && <Button variant="ghost" onClick={() => {
          const next = new URLSearchParams(params.toString());
          ["client", "job", "stage", "owner"].forEach((key) => next.delete(key));
          router.push(`/dashboard${next.size ? `?${next}` : ""}`);
        }}>Clear filters</Button>}
      </div>
      <FilterSelect label="Client" param="client" options={options.clients} />
      <FilterSelect label="Job" param="job" options={options.jobs} />
      <FilterSelect label="Stage" param="stage" options={options.stages} />
      <FilterSelect label="Owner" param="owner" options={options.owners} />
    </Card>
  );
}
