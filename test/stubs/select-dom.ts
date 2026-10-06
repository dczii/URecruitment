import { act, cleanup } from "@testing-library/react";
import { vi } from "vitest";

/** Only browser features absent from jsdom; the Select implementation stays real. */
export function mockSelectDOM() {
  // Base UI needs real mouse defaults (button=0) when testing pointer activation.
  vi.stubGlobal("PointerEvent", MouseEvent);
  const matches = Element.prototype.matches;
  vi.spyOn(Element.prototype, "matches").mockImplementation(function (this: Element, selector) {
    // jsdom has no top layer. Its nwsapi :modal/:fullscreen fallback recursively
    // calls Element.matches; Floating UI's top-layer probe otherwise spins here.
    if ([":modal", ":popover-open", ":fullscreen"].includes(selector)) return false;
    return matches.call(this, selector);
  });
}

/** Flush queued positioning work before the shared test setup restores DOM mocks. */
export async function cleanupSelectDOM() {
  await act(async () => { cleanup(); });
}
