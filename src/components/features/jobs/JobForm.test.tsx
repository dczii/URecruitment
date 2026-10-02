// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, expect, it, vi } from "vitest";
import { JobForm } from "./JobForm";
const save = vi.hoisted(() => vi.fn());
vi.mock("@/app/jobs/actions", () => ({ createJob: save }));
afterEach(() => { cleanup(); save.mockReset(); });
it("AC9: blank submission focuses the first invalid field without losing input", () => {
  render(<JobForm clients={[]} />);
  fireEvent.change(screen.getByLabelText("Owner name"), {target:{value:"Fictional Recruiter"}});
  fireEvent.click(screen.getByRole("button", {name:"Save job"}));
  expect(screen.getByLabelText("Job title")).toHaveFocus();
  expect(screen.getByLabelText("Job title")).toHaveAttribute("aria-invalid","true");
  expect(screen.getByLabelText("Owner name")).toHaveValue("Fictional Recruiter");
  expect(save).not.toHaveBeenCalled();
});
it("keeps the server's itemized validation and focuses the missing marking", async () => {
  save.mockResolvedValue({ok:false,error:"2 requirement rows are missing a must-have/nice-to-have choice, and the nationality reason is empty."});
  render(<JobForm clients={[{id:"fictional-client",name:"Fictional Client"}]} />);
  fireEvent.change(screen.getByLabelText("Job title"),{target:{value:"Fictional Engineer"}});
  fireEvent.change(screen.getByLabelText("Owner name"),{target:{value:"Fictional Recruiter"}});
  fireEvent.change(screen.getByLabelText("Client"),{target:{value:"fictional-client"}});
  fireEvent.change(screen.getByLabelText("Requirement 1",{exact:true}),{target:{value:"Engineering"}});
  fireEvent.click(screen.getByRole("button",{name:"Save job"}));
  await waitFor(()=>expect(screen.getByRole("alert")).toHaveTextContent("2 requirement rows"));
  await waitFor(()=>expect(screen.getByRole("button",{name:/^Must-have$/})).toHaveFocus());
  expect(screen.getByLabelText("Requirement 1",{exact:true})).toHaveValue("Engineering");
});
