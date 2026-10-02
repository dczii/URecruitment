// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, expect, it, vi } from "vitest";
import { Dashboard } from "./Dashboard";
import type { DashboardData } from "@/server/dashboard/data";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), useSearchParams: () => new URLSearchParams() }));
vi.mock("@/app/dashboard/actions", () => ({ moveSelectedToNextStage: vi.fn() }));
afterEach(cleanup);
const options = { clients: [], jobs: [], stages: [], owners: [] };
const data: DashboardData = { overdue: [{ pipelineEntryId: "fixture-1", candidateName: "Fictional Candidate", jobTitle: "Engineer", clientName: "Fictional Client", stage: "Screening", ownerName: "Fictional Recruiter", daysOver: 3, waitingOn: "Recruiter" }], dueSoon: [], guarantee: [] };
it("AC4: every selectable row has a corresponding selection header", () => {
  render(<Dashboard data={data} filterOptions={options} />);
  const table = screen.getByRole("table");
  expect(within(table).getAllByRole("columnheader")).toHaveLength(6);
  expect(within(table).getByRole("columnheader", { name: "Selection" })).toBeInTheDocument();
});
it("AC5: the action preview appears only for visible selected entries", () => {
  const { rerender } = render(<Dashboard data={data} filterOptions={options} />);
  expect(screen.queryByRole("complementary", { name: "Selection" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("checkbox", { name: "Select Fictional Candidate" }));
  expect(screen.getByRole("complementary", { name: "Selection" })).toHaveTextContent("1 candidate selected");
  rerender(<Dashboard data={{ ...data, overdue: [{ ...data.overdue[0], pipelineEntryId: "fixture-2" }] }} filterOptions={options} />);
  expect(screen.queryByRole("complementary", { name: "Selection" })).not.toBeInTheDocument();
  rerender(<Dashboard data={data} filterOptions={options} />);
  expect(screen.queryByRole("complementary", { name: "Selection" })).not.toBeInTheDocument();
});
