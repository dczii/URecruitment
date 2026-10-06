// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AppHeader, DesktopNavigation } from "./AppNavigation";
vi.mock("@/app/login/actions", () => ({ logout: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard" }));
beforeEach(() => { localStorage.clear(); vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })); });
afterEach(cleanup);
it("AC1: desktop navigation names destinations visibly", () => {
  render(<DesktopNavigation />);
  expect(screen.getByRole("link", { name: "Jobs" })).toHaveTextContent("Jobs");
});
it("collapse retains accessible links and current page", () => {
  render(<DesktopNavigation />);
  fireEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }));
  expect(screen.getByRole("button", { name: "Expand sidebar" })).toHaveAttribute("aria-expanded", "false");
  expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");
  expect(screen.getByRole("link", { name: "Jobs" })).toHaveAttribute("href", "/jobs");
  fireEvent.click(screen.getByRole("button", { name: "Expand sidebar" }));
  expect(screen.getByRole("link", { name: "Jobs" })).toHaveTextContent("Jobs");
});
it("header no longer duplicates account controls", () => {
  render(<AppHeader />);
  expect(screen.queryByRole("button", { name: "Sign out" })).not.toBeInTheDocument();
});
