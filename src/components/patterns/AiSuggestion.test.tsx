// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { AiSuggestion } from "./AiSuggestion";

afterEach(() => {
  cleanup();
});

describe("AC1", () => {
  it("AC1: the value variant always renders a visible AI suggestion label alongside its children", () => {
    render(<AiSuggestion variant="value">Product Manager</AiSuggestion>);

    expect(screen.getByText("AI suggestion")).toBeVisible();
    expect(screen.getByText("Product Manager")).toBeVisible();
  });

  it("AC1: the score variant renders the AI suggestion label plus a caption with model version and date", () => {
    const generatedAt = new Date("2026-09-18T12:00:00+08:00");
    const { container } = render(
      <AiSuggestion
        variant="score"
        modelVersion="matching-v1.3"
        generatedAt={generatedAt}
      >
        72
      </AiSuggestion>,
    );

    expect(screen.getByText("AI suggestion")).toBeVisible();
    expect(container).toHaveTextContent("matching-v1.3");
    expect(container).toHaveTextContent("18 Sep 2026");
  });

  it("AC1: the score variant requires modelVersion and generatedAt at typecheck", () => {
    const invalidScore = (
      // @ts-expect-error score variant requires modelVersion and generatedAt
      <AiSuggestion variant="score">72</AiSuggestion>
    );

    // Type-only guarantee: if the discriminated union is not enforced, tsc
    // reports unused @ts-expect-error. Creating the element is allowed at runtime.
    expect(invalidScore).toBeTruthy();
  });
});
