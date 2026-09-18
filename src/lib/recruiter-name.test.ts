import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getStoredRecruiterName,
  isValidRecruiterName,
  setStoredRecruiterName,
} from "./recruiter-name";

const RECRUITER_NAME_KEY = "urec.recruiterName.v1";

function stubMemoryLocalStorage() {
  const memory: Record<string, string> = {};
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => memory[key] ?? null,
    setItem: (key: string, value: string) => {
      memory[key] = String(value);
    },
    removeItem: (key: string) => {
      delete memory[key];
    },
    clear: () => {
      for (const key of Object.keys(memory)) {
        delete memory[key];
      }
    },
  });
}

beforeEach(() => {
  stubMemoryLocalStorage();
});

describe("AC4", () => {
  it("AC4: isValidRecruiterName rejects empty and whitespace-only names", () => {
    expect(isValidRecruiterName("")).toBe(false);
    expect(isValidRecruiterName("   ")).toBe(false);
  });

  it("AC4: isValidRecruiterName accepts a real name", () => {
    expect(isValidRecruiterName("Maya Tan")).toBe(true);
  });

  it("AC4: getStoredRecruiterName returns null when nothing is stored", () => {
    expect(getStoredRecruiterName()).toBeNull();
  });

  it("AC4: getStoredRecruiterName returns null when the stored value is blank or whitespace", () => {
    localStorage.setItem(RECRUITER_NAME_KEY, "");
    expect(getStoredRecruiterName()).toBeNull();

    localStorage.setItem(RECRUITER_NAME_KEY, "   ");
    expect(getStoredRecruiterName()).toBeNull();
  });

  it("AC4: setStoredRecruiterName persists a trimmed name that getStoredRecruiterName reads back", () => {
    setStoredRecruiterName("Maya Tan");
    expect(getStoredRecruiterName()).toBe("Maya Tan");

    setStoredRecruiterName("  Maya Tan  ");
    expect(getStoredRecruiterName()).toBe("Maya Tan");
  });

  it("AC4: setStoredRecruiterName throws on whitespace-only input", () => {
    expect(() => setStoredRecruiterName("   ")).toThrow();
  });
});
