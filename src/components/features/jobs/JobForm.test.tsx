// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { cleanupSelectDOM, mockSelectDOM } from "../../../../test/stubs/select-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { JobForm } from "./JobForm";
const save = vi.hoisted(() => vi.fn());
vi.mock("@/app/jobs/actions", () => ({ createJob: save }));
beforeEach(mockSelectDOM);

afterEach(async () => { await cleanupSelectDOM(); save.mockReset(); });
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
  fireEvent.click(screen.getByRole("combobox", { name: "Client" }));
  const client = await screen.findByRole("option", { name: "Fictional Client" });
  fireEvent.pointerDown(client);
  fireEvent.click(client);
  fireEvent.change(screen.getByLabelText("Requirement 1",{exact:true}),{target:{value:"Engineering"}});
  fireEvent.click(screen.getByRole("button",{name:"Save job"}));
  await waitFor(()=>expect(screen.getByRole("alert")).toHaveTextContent("2 requirement rows"));
  await waitFor(()=>expect(screen.getByRole("button",{name:/^Must-have$/})).toHaveFocus());
  expect(screen.getByLabelText("Requirement 1",{exact:true})).toHaveValue("Engineering");
});

function fillDetails() {
  fireEvent.change(screen.getByLabelText("Job title"), { target: { value: "Fictional Engineer" } });
  fireEvent.change(screen.getByLabelText("Owner name"), { target: { value: "Fictional Recruiter" } });
}

it("focuses Client with its error when only the client is missing", () => {
  render(<JobForm clients={[{ id: "fictional-client", name: "Fictional Client" }]} />);
  fillDetails();
  fireEvent.click(screen.getByRole("button", { name: "Save job" }));
  const client = screen.getByRole("combobox", { name: "Client" });
  expect(client).toHaveFocus();
  expect(client).toHaveAttribute("aria-invalid", "true");
  expect(client).toHaveAccessibleDescription("Select a client.");
  expect(screen.getByLabelText("Job title")).toHaveValue("Fictional Engineer");
  expect(save).not.toHaveBeenCalled();
});

it("submits the exact duplicate-name client ID and disables selection while saving", async () => {
  let finish!: (value: { ok: false; error: string }) => void;
  save.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  render(<JobForm clients={[{ id: "fictional-a", name: "Fictional Client" }, { id: "fictional-b", name: "Fictional Client" }]} />);
  fillDetails();
  const trigger = screen.getByRole("combobox", { name: "Client" });
  fireEvent.click(trigger);
  const choices = await screen.findAllByRole("option", { name: "Fictional Client" });
  fireEvent.pointerDown(choices[1]);
  fireEvent.click(choices[1]);
  fireEvent.click(screen.getByRole("button", { name: "Save job" }));
  await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({ client_id: "fictional-b" })));
  expect(trigger).toBeDisabled();
  expect(trigger).toHaveTextContent("Fictional Client");
  finish({ ok: false, error: "Fictional save error" });
  await waitFor(() => expect(trigger).toBeEnabled());
  expect(screen.getByLabelText("Owner name")).toHaveValue("Fictional Recruiter");
});

it("keeps the empty client control disabled with an explanatory label", () => {
  render(<JobForm clients={[]} />);
  expect(screen.getByRole("combobox", { name: "Client" })).toBeDisabled();
  expect(screen.getByRole("combobox", { name: "Client" })).toHaveTextContent("No clients available");
});

it("allows clearing the client and validates the empty selection", async () => {
  render(<JobForm clients={[{ id: "fictional-client", name: "Fictional Client" }]} />);
  fillDetails();
  const trigger = screen.getByRole("combobox", { name: "Client" });
  fireEvent.click(trigger);
  const client = await screen.findByRole("option", { name: "Fictional Client" });
  fireEvent.pointerDown(client);
  fireEvent.click(client);
  fireEvent.click(trigger);
  const empty = await screen.findByRole("option", { name: "Select a client" });
  fireEvent.pointerDown(empty);
  fireEvent.click(empty);
  fireEvent.click(screen.getByRole("button", { name: "Save job" }));
  expect(trigger).toHaveFocus();
  expect(trigger).toHaveAccessibleDescription("Select a client.");
  expect(save).not.toHaveBeenCalled();
});
