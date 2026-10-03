// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ request: vi.fn(), verify: vi.fn() }));
vi.mock("@/app/login/actions", () => ({ requestCode: mocks.request, verifyCode: mocks.verify }));
import { LoginForm } from "./LoginForm";
afterEach(cleanup);
it("AC6 moves to code entry, keeps leading zeros and supports change email", async () => {
  mocks.request.mockResolvedValue({ ok: true }); mocks.verify.mockResolvedValue({ ok: false, error: "The code is invalid or expired." });
  render(<LoginForm />); fireEvent.change(screen.getByLabelText("Work email"), { target: { value: "recruiter@example.test" } });
  fireEvent.click(screen.getByRole("button", { name: "Send login code" }));
  const code = await screen.findByLabelText("Six-digit code"); await waitFor(() => expect(document.activeElement).toBe(code));
  fireEvent.change(code, { target: { value: "001234" } }); fireEvent.click(screen.getByRole("button", { name: "Verify and sign in" }));
  await waitFor(() => expect(mocks.verify).toHaveBeenCalledWith("recruiter@example.test", "001234"));
  expect(await screen.findByText("The code is invalid or expired.")).toBeDefined();
  await waitFor(() => expect(screen.getByRole("button", { name: "Change email" }).hasAttribute("disabled")).toBe(false));
  fireEvent.click(screen.getByRole("button", { name: "Change email" })); expect(await screen.findByLabelText("Work email")).toBeDefined();
});
