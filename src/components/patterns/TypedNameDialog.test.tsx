// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TypedNameDialog } from "./TypedNameDialog";

afterEach(() => {
  cleanup();
});

describe("AC4", () => {
  it("AC4: renders nothing user-visible in the dialog body when open={false}", () => {
    render(
      <TypedNameDialog
        open={false}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole("heading", { name: "What's your name?" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Continue" }),
    ).not.toBeInTheDocument();
  });

  it("AC4: open with no initialName shows the first-use title, a labelled input, and a submit button", () => {
    render(
      <TypedNameDialog open onOpenChange={vi.fn()} onSubmit={vi.fn()} />,
    );

    expect(
      screen.getByRole("heading", { name: "What's your name?" }),
    ).toBeVisible();
    const input = screen.getByRole("textbox");
    expect(input).toBeVisible();
    expect(input).toHaveAccessibleName();
    expect(screen.getByRole("button", { name: "Continue" })).toBeVisible();
  });

  it("AC4: submitting a blank name shows an inline error and does not call onSubmit", () => {
    const onSubmit = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <TypedNameDialog
        open
        onOpenChange={onOpenChange}
        onSubmit={onSubmit}
      />,
    );

    const form = screen.getByRole("textbox").closest("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    expect(screen.getByText("Enter your name to continue.")).toBeVisible();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("AC4: submitting a whitespace-only name shows an inline error and does not call onSubmit", () => {
    const onSubmit = vi.fn();
    render(
      <TypedNameDialog open onOpenChange={vi.fn()} onSubmit={onSubmit} />,
    );

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "   " },
    });
    const form = screen.getByRole("textbox").closest("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    expect(screen.getByText("Enter your name to continue.")).toBeVisible();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("AC4: submitting a valid name calls onSubmit once with the trimmed value", () => {
    const onSubmit = vi.fn();
    render(
      <TypedNameDialog open onOpenChange={vi.fn()} onSubmit={onSubmit} />,
    );

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "  Maya Tan  " },
    });
    const form = screen.getByRole("textbox").closest("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith("Maya Tan");
  });

  it('AC4: initialName="Maya Tan" uses the change-name title and pre-fills the input', () => {
    render(
      <TypedNameDialog
        open
        initialName="Maya Tan"
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Change your name" }),
    ).toBeVisible();
    expect(screen.getByRole("textbox")).toHaveValue("Maya Tan");
  });
});
