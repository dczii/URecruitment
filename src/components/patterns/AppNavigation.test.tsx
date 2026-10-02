// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AppHeader, DesktopNavigation } from "./AppNavigation";
import { RECRUITER_NAME_KEY } from "@/lib/recruiter-name";
vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard" }));
beforeEach(() => localStorage.clear());
afterEach(cleanup);
it("AC1: desktop navigation names destinations visibly", () => {
  render(<DesktopNavigation />);
  expect(screen.getByRole("link", { name: "Jobs" })).toHaveTextContent("Jobs");
});
it("AC3: unset identity offers Add name instead of a fabricated recruiter", async () => {
  render(<AppHeader />);
  const add = await screen.findByRole("button", { name: "Add name" });
  expect(screen.queryByText(/Recording as Maya Tan/)).not.toBeInTheDocument();
  fireEvent.click(add);
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Fictional Recruiter" } });
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  await waitFor(() => expect(localStorage.getItem(RECRUITER_NAME_KEY)).toBe("Fictional Recruiter"));
  expect(screen.getByRole("button", { name: /Change recruiter name/ })).toHaveTextContent("Fictional Recruiter");
});
it("AC3: stored identity is displayed and can be changed", async () => {
  localStorage.setItem(RECRUITER_NAME_KEY, "Fictional Recruiter");
  render(<AppHeader />);
  expect(await screen.findByRole("button", { name: /Change recruiter name/ })).toHaveTextContent("Fictional Recruiter");
});
