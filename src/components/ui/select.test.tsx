// @vitest-environment jsdom
import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { cleanupSelectDOM, mockSelectDOM } from "../../../test/stubs/select-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SelectField } from "./select";

beforeEach(mockSelectDOM);

afterEach(cleanupSelectDOM);
const options = [
  { value: "client-a", label: "Fictional Client" },
  { value: "client-b", label: "Fictional Client" },
];

it("uses the visible label, commits an ID rather than a duplicate label, and clears to empty", () => {
  const changed = vi.fn();
  const submitted = vi.fn();
  function Form() {
    const [value, setValue] = useState("");
    return <form onSubmit={submitted}>
      <label htmlFor="client">Client</label>
      <SelectField id="client" name="client_id" options={options} value={value}
        placeholder="Select a client" onValueChange={(next) => { changed(next); setValue(next); }} />
    </form>;
  }
  render(<Form />);
  const trigger = screen.getByRole("combobox", { name: "Client" });
  expect(trigger).toHaveTextContent("Select a client");
  fireEvent.click(trigger);
  const choices = screen.getAllByRole("option", { name: "Fictional Client", hidden: true });
  fireEvent.pointerDown(choices[1]);
  fireEvent.click(choices[1]);
  expect(trigger).toHaveTextContent("Fictional Client");
  expect(changed).toHaveBeenLastCalledWith("client-b");
  expect(new FormData(trigger.closest("form")!).get("client_id")).toBe("client-b");
  expect(submitted).not.toHaveBeenCalled();
  fireEvent.click(trigger);
  const empty = screen.getByRole("option", { name: "Select a client", hidden: true });
  fireEvent.pointerDown(empty);
  fireEvent.click(empty);
  expect(trigger).toHaveTextContent("Select a client");
  expect(changed).toHaveBeenLastCalledWith("");
});

it("treats dashboard All as a selected empty-string option", () => {
  render(<><label htmlFor="filter">Client</label><SelectField id="filter" value=""
    options={[{ value: "", label: "All" }, ...options]} onValueChange={vi.fn()} /></>);
  fireEvent.click(screen.getByRole("combobox", { name: "Client" }));
  const all = screen.getByRole("option", { name: "All", hidden: true });
  expect(all).toHaveAttribute("aria-selected", "true");
  fireEvent.keyDown(all, { key: "Escape" });
});

it("preserves error description and exposes a focusable trigger", () => {
  render(<><label htmlFor="client">Client</label><SelectField id="client" value="" options={options}
    placeholder="Select a client" onValueChange={vi.fn()} aria-invalid aria-describedby="client-error" />
    <p id="client-error">Select a client.</p></>);
  const trigger = screen.getByRole("combobox", { name: "Client" });
  trigger.focus();
  expect(trigger).toHaveFocus();
  expect(trigger).toHaveAttribute("aria-invalid", "true");
  expect(trigger).toHaveAccessibleDescription("Select a client.");
});

it("does not open a disabled empty control", () => {
  const changed = vi.fn();
  render(<><label htmlFor="empty">Client</label><SelectField id="empty" value="" options={[]}
    placeholder="No clients available" disabled onValueChange={changed} /></>);
  const trigger = screen.getByRole("combobox", { name: "Client" });
  expect(trigger).toBeDisabled();
  expect(trigger).toHaveTextContent("No clients available");
  fireEvent.click(trigger);
  expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  expect(changed).not.toHaveBeenCalled();
});
