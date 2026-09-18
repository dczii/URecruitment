// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { SourceQuote } from "./SourceQuote";

afterEach(() => {
  cleanup();
});

const EN_EXCERPT =
  "Led a team of five product managers across APAC and owned the hiring brief.";
const ZH_EXCERPT = "五年产品经理经验，熟悉招聘流程与跨团队协作。";

describe("AC2", () => {
  it('AC2: collapsed trigger reads "Show source text" and the excerpt is not in the document', () => {
    render(<SourceQuote text={EN_EXCERPT} lang="en" />);

    expect(
      screen.getByRole("button", { name: "Show source text" }),
    ).toBeVisible();
    expect(screen.queryByText(EN_EXCERPT)).not.toBeInTheDocument();
  });

  it('AC2: clicking the trigger reveals the excerpt and changes the label to "Hide source text"', () => {
    render(<SourceQuote text={EN_EXCERPT} lang="en" />);

    fireEvent.click(screen.getByRole("button", { name: "Show source text" }));

    expect(screen.getByText(EN_EXCERPT)).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Hide source text" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Show source text" }),
    ).not.toBeInTheDocument();
  });

  it('AC2: expanded Chinese excerpt carries lang="zh-Hans"', () => {
    render(<SourceQuote text={ZH_EXCERPT} lang="zh-Hans" />);

    fireEvent.click(screen.getByRole("button", { name: "Show source text" }));

    expect(screen.getByText(ZH_EXCERPT)).toHaveAttribute("lang", "zh-Hans");
  });

  it('AC2: expanded English excerpt does not carry lang="zh-Hans"', () => {
    render(<SourceQuote text={EN_EXCERPT} lang="en" />);

    fireEvent.click(screen.getByRole("button", { name: "Show source text" }));

    expect(screen.getByText(EN_EXCERPT)).not.toHaveAttribute(
      "lang",
      "zh-Hans",
    );
  });

  it("AC2: expanded excerpt truncates with a CSS line-clamp class, not by slicing the string", () => {
    render(<SourceQuote text={EN_EXCERPT} lang="en" />);

    fireEvent.click(screen.getByRole("button", { name: "Show source text" }));

    const excerpt = screen.getByText(EN_EXCERPT);
    expect(excerpt.className).toContain("line-clamp");
    expect(excerpt.textContent).toBe(EN_EXCERPT);
  });
});
