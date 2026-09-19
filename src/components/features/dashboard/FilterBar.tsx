"use client";

import { useId } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import type { FilterOptions } from "@/server/dashboard/data";

const selectClassName =
  "rounded-md border border-input bg-card px-3 py-2 text-label text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

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
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-caption font-semibold text-muted-foreground">
        {label}
      </label>
      <select
        id={id}
        value={current}
        onChange={(event) => onChange(event.target.value)}
        className={selectClassName}
      >
        <option value="">All</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

export function FilterBar({ options }: { options: FilterOptions }) {
  return (
    <div
      aria-label="Dashboard filters"
      className="flex flex-wrap items-end gap-3 rounded-md border border-border bg-card p-4"
    >
      <FilterSelect label="Client" param="client" options={options.clients} />
      <FilterSelect label="Job" param="job" options={options.jobs} />
      <FilterSelect label="Stage" param="stage" options={options.stages} />
      <FilterSelect label="Owner" param="owner" options={options.owners} />
    </div>
  );
}
