// @vitest-environment jsdom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { InteractionProvider } from "./InteractionProvider";
afterEach(cleanup);
it("AC11: keyboard feedback is instant and pointer interaction opts into motion", () => {
  render(<InteractionProvider><button>Example</button></InteractionProvider>);
  expect(document.documentElement.dataset.input).toBe("keyboard");
  fireEvent.pointerDown(document);
  expect(document.documentElement.dataset.input).toBe("pointer");
  fireEvent.keyDown(document, { key: "Escape" });
  expect(document.documentElement.dataset.input).toBe("keyboard");
});
it("AC12: modality listeners are removed on unmount", () => {
  const { unmount } = render(<InteractionProvider><button>Example</button></InteractionProvider>);
  unmount();
  fireEvent.pointerDown(document);
  expect(document.documentElement.dataset.input).toBeUndefined();
});
