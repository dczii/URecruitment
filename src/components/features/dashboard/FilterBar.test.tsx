// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { cleanupSelectDOM, mockSelectDOM } from "../../../../test/stubs/select-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { FilterBar } from "./FilterBar";

const navigation = vi.hoisted(() => ({ push: vi.fn(), query: "view=attention" }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navigation.push }),
  useSearchParams: () => new URLSearchParams(navigation.query),
}));
beforeEach(mockSelectDOM);

afterEach(async () => { await cleanupSelectDOM(); navigation.push.mockClear(); navigation.query = "view=attention"; });
const options = { clients: ["Fictional Client"], jobs: ["Engineer"], stages: ["Screening"], owners: ["Fictional Recruiter"] };

it.each([
  ["Client", "client", options.clients[0]], ["Job", "job", options.jobs[0]],
  ["Stage", "stage", options.stages[0]], ["Owner", "owner", options.owners[0]],
])("commits %s without losing unrelated URL parameters", async (label, param, value) => {
  render(<FilterBar options={options} />);
  fireEvent.click(screen.getByRole("combobox", { name: label }));
  const option = await screen.findByRole("option", { name: value });
  fireEvent.pointerDown(option);
  fireEvent.click(option);
  await waitFor(() => expect(navigation.push).toHaveBeenCalledTimes(1));
  const url = new URL(navigation.push.mock.calls[0][0], "http://localhost");
  expect(url.searchParams.get(param)).toBe(value);
  expect(url.searchParams.get("view")).toBe("attention");
});

it("clears only its own filter with All, and restores values from navigation", async () => {
  navigation.query = "view=attention&client=Fictional+Client&job=Engineer";
  const { rerender } = render(<FilterBar options={options} />);
  const client = screen.getByRole("combobox", { name: "Client" });
  expect(client).toHaveTextContent("Fictional Client");
  fireEvent.click(client);
  const all = await screen.findByRole("option", { name: "All" });
  fireEvent.pointerDown(all);
  fireEvent.click(all);
  await waitFor(() => expect(navigation.push).toHaveBeenCalledWith("/dashboard?view=attention&job=Engineer"));
  navigation.query = "view=attention";
  rerender(<FilterBar options={options} />);
  expect(client).toHaveTextContent("All");
  navigation.query = "view=attention&client=Fictional+Client";
  rerender(<FilterBar options={options} />);
  expect(client).toHaveTextContent("Fictional Client");
});

it("clears all filters without losing unrelated parameters", () => {
  navigation.query = "view=attention&client=Fictional+Client&job=Engineer&stage=Screening&owner=Fictional+Recruiter";
  render(<FilterBar options={options} />);
  fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
  expect(navigation.push).toHaveBeenCalledWith("/dashboard?view=attention");
});

it("shows unavailable values without silently changing the URL and permits clearing", async () => {
  navigation.query = "view=attention&client=Former+Client";
  render(<FilterBar options={options} />);
  const client = screen.getByRole("combobox", { name: "Client" });
  expect(client).toHaveTextContent("Former Client (unavailable)");
  expect(navigation.push).not.toHaveBeenCalled();
  fireEvent.click(client);
  expect(await screen.findByRole("option", { name: "Former Client (unavailable)" })).toHaveAttribute("aria-disabled", "true");
  const all = screen.getByRole("option", { name: "All" });
  fireEvent.pointerDown(all);
  fireEvent.click(all);
  await waitFor(() => expect(navigation.push).toHaveBeenCalledWith("/dashboard?view=attention"));
});
