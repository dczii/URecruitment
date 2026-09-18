// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { DelayStatusBadge } from "./DelayStatusBadge";

afterEach(() => {
  cleanup();
});

describe("AC3", () => {
  it('AC3: status="on-track" renders "On track" and an aria-label containing "On track"', () => {
    render(<DelayStatusBadge status="on-track" />);

    expect(screen.getByText("On track")).toBeVisible();
    expect(screen.getByLabelText(/On track/)).toBeVisible();
  });

  it('AC3: status="due-soon" renders "Due soon" and a matching aria-label', () => {
    render(<DelayStatusBadge status="due-soon" />);

    expect(screen.getByText("Due soon")).toBeVisible();
    expect(screen.getByLabelText(/Due soon/)).toBeVisible();
  });

  it('AC3: status="overdue" with daysOverdue={3} renders Overdue, 3, and a full aria-label', () => {
    render(<DelayStatusBadge status="overdue" daysOverdue={3} />);

    const badge = screen.getByLabelText(/Overdue/);
    expect(badge).toHaveTextContent("Overdue");
    expect(badge).toHaveTextContent("3");
    expect(badge).toHaveAttribute("aria-label", "Overdue by 3 working days");
  });

  it('AC3: status="overdue" with daysOverdue={1} uses singular "day" not "days"', () => {
    render(<DelayStatusBadge status="overdue" daysOverdue={1} />);

    const badge = screen.getByLabelText(/Overdue/);
    expect(badge).toHaveTextContent(/1 day/);
    expect(badge).not.toHaveTextContent(/1 days/);
    expect(badge).toHaveAttribute("aria-label", "Overdue by 1 working day");
  });

  it('AC3: status="none" renders nothing', () => {
    const { container } = render(<DelayStatusBadge status="none" />);

    expect(container).toBeEmptyDOMElement();
  });
});
