export const RECRUITER_NAME_KEY = "urec.recruiterName.v1";

export function isValidRecruiterName(name: string): boolean {
  return name.trim().length > 0;
}

export function getStoredRecruiterName(): string | null {
  try {
    const stored = localStorage.getItem(RECRUITER_NAME_KEY);
    if (stored === null) {
      return null;
    }

    const trimmed = stored.trim();
    return isValidRecruiterName(trimmed) ? trimmed : null;
  } catch {
    return null;
  }
}

export function setStoredRecruiterName(name: string): void {
  if (!isValidRecruiterName(name)) {
    throw new Error("Recruiter name cannot be blank");
  }

  try {
    localStorage.setItem(RECRUITER_NAME_KEY, name.trim());
  } catch {
    // localStorage unavailable (SSR, disabled storage) — degrade rather than crash.
  }
}
