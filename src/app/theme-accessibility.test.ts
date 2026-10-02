import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/app/globals.css", "utf8");

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((offset) => {
    const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(first: string, second: string): number {
  const [low, high] = [luminance(first), luminance(second)].sort((a, b) => a - b);
  return (high + 0.05) / (low + 0.05);
}

describe.each([":root", ".dark"])("%s theme accessibility", (selector) => {
  const block = css.split(`${selector} {`)[1].split("}")[0];
  const tokens = Object.fromEntries(
    [...block.matchAll(/--([\w-]+):\s*(#[\da-f]{6})/gi)].map((match) => [match[1], match[2]]),
  );

  it.each([
    "background", "card", "popover", "primary", "secondary", "muted", "accent",
    "destructive", "status-on-track", "status-due-soon", "status-overdue", "status-ended",
  ])("%s text meets WCAG AA", (surface) => {
    const foreground = surface === "background" ? "foreground" : `${surface}-foreground`;
    expect(contrast(tokens[foreground], tokens[surface])).toBeGreaterThanOrEqual(4.5);
  });

  it.each(["background", "card", "muted", "accent"])("focus and input boundaries contrast with %s", (surface) => {
    expect(contrast(tokens.ring, tokens[surface])).toBeGreaterThanOrEqual(3);
    expect(contrast(tokens.input, tokens[surface])).toBeGreaterThanOrEqual(3);
  });

  it("uses neutral surfaces and a red brand without blue/green undertones", () => {
    for (const token of ["background", "foreground", "card", "muted", "secondary", "border"]) {
      const channels = [1, 3, 5].map((offset) => Number.parseInt(tokens[token].slice(offset, offset + 2), 16));
      expect(new Set(channels).size, token).toBe(1);
    }
    const red = Number.parseInt(tokens.primary.slice(1, 3), 16);
    expect(red).toBeGreaterThan(Number.parseInt(tokens.primary.slice(3, 5), 16));
    expect(red).toBeGreaterThan(Number.parseInt(tokens.primary.slice(5, 7), 16));
  });
});
