"use client";

import { useId } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Card } from "@/components/ui/card";
import { FieldLabel, Select } from "@/components/ui/field";
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
      <Select
        id={id}
        value={current}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">All</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </Select>
    </div>
  );
}

export function FilterBar({ options }: { options: FilterOptions }) {
  return (
    <Card
      aria-label="Dashboard filters"
      className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4"
    >
      <FilterSelect label="Client" param="client" options={options.clients} />
      <FilterSelect label="Job" param="job" options={options.jobs} />
      <FilterSelect label="Stage" param="stage" options={options.stages} />
      <FilterSelect label="Owner" param="owner" options={options.owners} />
    </Card>
  );
}
