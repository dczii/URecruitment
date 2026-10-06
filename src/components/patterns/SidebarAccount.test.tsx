// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SidebarAccount } from "./SidebarAccount";
import { RECRUITER_NAME_KEY } from "@/lib/recruiter-name";
vi.mock("@/app/login/actions", () => ({ logout: vi.fn() }));
// Keep real menu state/items but replace floating geometry, which jsdom cannot lay out.
// Real positioning, focus and dismissal are covered in e2e/sidebar-account.spec.ts.
vi.mock("@/components/ui/dropdown-menu", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/components/ui/dropdown-menu")>();
  const { Menu } = await import("@base-ui/react/menu");
  return { ...actual, DropdownMenuContent: ({ children }: { children: import("react").ReactNode }) => <Menu.Portal><div role="menu">{children}</div></Menu.Portal> };
});
beforeEach(() => localStorage.clear());
afterEach(cleanup);
it("adds a recording name through the account menu", async () => {
  render(<SidebarAccount />);
  fireEvent.click(screen.getByRole("button", { name: "Account: Add name" }));
  fireEvent.click(await screen.findByRole("menuitem", { name: "Add name" }));
  fireEvent.change(await screen.findByLabelText("Name"), { target: { value: "Fictional Recruiter" } });
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  await waitFor(() => expect(localStorage.getItem(RECRUITER_NAME_KEY)).toBe("Fictional Recruiter"));
  expect(screen.getByRole("button", { name: "Account: Fictional Recruiter" })).toHaveTextContent("Fictional Recruiter");
});
it("compact account retains the full name and explicit sign-out submit", async () => {
  const name = "虚构招聘顾问 " + "Long name ".repeat(20);
  localStorage.setItem(RECRUITER_NAME_KEY, name.trim());
  render(<SidebarAccount compact />);
  fireEvent.click(screen.getByRole("button", { name: `Account: ${name.trim()}` }));
  expect(await screen.findByRole("menuitem", { name: "Change name" })).toBeVisible();
  expect(screen.getByRole("menuitem", { name: "Sign out" })).toHaveAttribute("type", "submit");
});
