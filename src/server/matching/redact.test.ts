import { describe, expect, it } from "vitest";
import { buildScoringProfile } from "./redact";

/**
 * T3a contract — implement `buildScoringProfile` in `src/server/matching/redact.ts`
 * (T3b). This is a pure function: no I/O, no mocks.
 *
 * buildScoringProfile(candidateProfile, jobVersion) → ScoringProfile
 *
 *   candidateProfile (runtime object; extra keys may be present):
 *     name, name_source_text,
 *     email, email_source_text,
 *     phone, phone_source_text,
 *     location, location_source_text,
 *     work_history, education, certifications,
 *     skills: { skill, source_text }[],
 *     languages_spoken: string[],
 *     total_years: number,
 *     prompt_injection_detected, prompt_injection_note
 *     — plus any stray properties (age, gender, race, religion,
 *       marital_status, photo_url, nationality, …). Extra keys MUST be
 *       ignored. The function allow-lists; it never pass-through-spreads.
 *
 *   jobVersion (the job_versions columns that gate nationality/language):
 *     requires_nationality: boolean
 *     nationality_reason: string | null
 *     requires_language: boolean
 *     language_reason: string | null
 *
 *   ScoringProfile — a plain object whose keys are EXACTLY this allow-list:
 *     work_history
 *     education
 *     certifications
 *     skills          — each entry keeps `{ skill, source_text }`
 *     total_years
 *     languages_spoken — OPTIONAL. Present only when the language gate is
 *                        open (see below). Omitted entirely (not `[]`)
 *                        when the gate is closed.
 *
 *   There is no path that copies nationality. The parsed schema has no
 *   nationality field; a stray `nationality` on the input is dropped even
 *   when `requires_nationality` is true with a written reason.
 *
 * Language gate (same rule as job_versions_language_reason_check):
 *   open  ⇔ requires_language === true
 *          AND language_reason is non-null and non-blank after trim
 *   closed ⇔ requires_language === false
 *          OR language_reason is null / "" / whitespace-only
 */

const CANDIDATE_NAME = "Jamie Tan";
const EMAIL = "jamie.tan.fictional@example.com";
const PHONE = "+65 9123 4567";
const LOCATION = "Tampines Street 81";

const LANGUAGE_REASON =
  "Daily stand-ups with the client's Shanghai team are held in Mandarin.";
const NATIONALITY_REASON =
  "The client's MAS-regulated desk requires Singapore citizenship for on-site access.";

const WORK_HISTORY = [
  {
    employer: "Meridian Trading Pte Ltd",
    employer_source_text: "Meridian Trading Pte Ltd",
    job_title: "Senior Accountant",
    job_title_source_text: "Senior Accountant",
    start: "2021-01",
    end: null,
    current: true,
    source_text:
      "Senior Accountant, Meridian Trading Pte Ltd, Jan 2021 - Present",
  },
  {
    employer: "Northgate Logistics",
    employer_source_text: "Northgate Logistics",
    job_title: "Accountant",
    job_title_source_text: "Accountant",
    start: "2018-03",
    end: "2020-12",
    current: false,
    source_text: "Accountant, Northgate Logistics, Mar 2018 - Dec 2020",
  },
] as const;

const EDUCATION = [
  {
    institution: "Fictional National University",
    qualification: "Bachelor of Accountancy",
    year: "2017",
    source_text:
      "Bachelor of Accountancy, Fictional National University, 2017",
  },
] as const;

const CERTIFICATIONS = [
  {
    name: "CPA",
    issuer: "Fictional Institute of Accountants",
    source_text: "CPA, Fictional Institute of Accountants",
  },
] as const;

const SKILLS = [
  { skill: "SAP FICO", source_text: "SAP FICO" },
  { skill: "SAP MM", source_text: "SAP MM" },
  { skill: "Excel", source_text: "Excel" },
] as const;

const LANGUAGES_SPOKEN = ["Mandarin"] as const;
const TOTAL_YEARS = 5.5;

const ALWAYS_PRESENT_KEYS = [
  "certifications",
  "education",
  "skills",
  "total_years",
  "work_history",
] as const;

const PROTECTED_KEYS = [
  "name",
  "name_source_text",
  "email",
  "email_source_text",
  "phone",
  "phone_source_text",
  "location",
  "location_source_text",
  "age",
  "gender",
  "race",
  "religion",
  "marital_status",
  "photo_url",
  "photo",
  "nationality",
  "prompt_injection_detected",
  "prompt_injection_note",
] as const;

type ScoringJobVersion = {
  requires_nationality: boolean;
  nationality_reason: string | null;
  requires_language: boolean;
  language_reason: string | null;
};

function jobVersion(
  overrides: Partial<ScoringJobVersion> = {},
): ScoringJobVersion {
  return {
    requires_nationality: false,
    nationality_reason: null,
    requires_language: false,
    language_reason: null,
    ...overrides,
  };
}

function candidateProfile(extras: Record<string, unknown> = {}) {
  return {
    name: CANDIDATE_NAME,
    name_source_text: CANDIDATE_NAME,
    email: EMAIL,
    email_source_text: EMAIL,
    phone: PHONE,
    phone_source_text: PHONE,
    location: LOCATION,
    location_source_text: LOCATION,
    work_history: [...WORK_HISTORY],
    education: [...EDUCATION],
    certifications: [...CERTIFICATIONS],
    skills: [...SKILLS],
    languages_spoken: [...LANGUAGES_SPOKEN],
    total_years: TOTAL_YEARS,
    prompt_injection_detected: false,
    prompt_injection_note: null,
    ...extras,
  };
}

function serialized(profile: unknown): string {
  return JSON.stringify(profile);
}

function expectAllowListed(
  profile: object,
  options: { languagesSpoken?: boolean } = {},
) {
  const expected = options.languagesSpoken
    ? [...ALWAYS_PRESENT_KEYS, "languages_spoken"]
    : [...ALWAYS_PRESENT_KEYS];
  expect(Object.keys(profile).sort()).toEqual([...expected].sort());

  for (const key of PROTECTED_KEYS) {
    expect(profile).not.toHaveProperty(key);
  }
}

function expectScoringFieldsCopied(profile: {
  work_history: unknown;
  education: unknown;
  certifications: unknown;
  skills: unknown;
  total_years: unknown;
}) {
  expect(profile.work_history).toEqual([...WORK_HISTORY]);
  expect(profile.education).toEqual([...EDUCATION]);
  expect(profile.certifications).toEqual([...CERTIFICATIONS]);
  expect(profile.skills).toEqual([...SKILLS]);
  expect(profile.total_years).toBe(TOTAL_YEARS);
}

describe("buildScoringProfile", () => {
  describe("AC1: protected attributes never reach the scoring profile", () => {
    it("AC1: name is absent and the candidate's name does not appear in the serialized output", () => {
      const profile = buildScoringProfile(candidateProfile(), jobVersion());

      expect(profile).not.toHaveProperty("name");
      expect(profile).not.toHaveProperty("name_source_text");
      expect(serialized(profile)).not.toContain(CANDIDATE_NAME);
      expectAllowListed(profile);
      expectScoringFieldsCopied(profile);
    });

    it("AC1: contact details (email, phone, location) are never in the output", () => {
      const profile = buildScoringProfile(candidateProfile(), jobVersion());
      const blob = serialized(profile);

      expect(profile).not.toHaveProperty("email");
      expect(profile).not.toHaveProperty("email_source_text");
      expect(profile).not.toHaveProperty("phone");
      expect(profile).not.toHaveProperty("phone_source_text");
      expect(profile).not.toHaveProperty("location");
      expect(profile).not.toHaveProperty("location_source_text");
      expect(blob).not.toContain(EMAIL);
      expect(blob).not.toContain(PHONE);
      expect(blob).not.toContain(LOCATION);
      expectAllowListed(profile);
    });

    it("AC1: age, gender, race, religion and marital_status cannot appear even when bolted onto the input", () => {
      const profile = buildScoringProfile(
        candidateProfile({
          age: 47,
          gender: "female",
          race: "Chinese",
          religion: "Buddhist",
          marital_status: "married",
        }),
        jobVersion(),
      );
      const blob = serialized(profile);

      expect(profile).not.toHaveProperty("age");
      expect(profile).not.toHaveProperty("gender");
      expect(profile).not.toHaveProperty("race");
      expect(profile).not.toHaveProperty("religion");
      expect(profile).not.toHaveProperty("marital_status");
      expect(blob).not.toContain("47");
      expect(blob).not.toContain("female");
      expect(blob).not.toContain("Chinese");
      expect(blob).not.toContain("Buddhist");
      expect(blob).not.toContain("married");
      expectAllowListed(profile);
      expectScoringFieldsCopied(profile);
    });

    it("AC1: a photo reference on the input never appears in the output", () => {
      const photoUrl = "https://cdn.example/candidates/headshot-xyz.png";
      const profile = buildScoringProfile(
        candidateProfile({
          photo_url: photoUrl,
          photo: photoUrl,
        }),
        jobVersion(),
      );

      expect(profile).not.toHaveProperty("photo_url");
      expect(profile).not.toHaveProperty("photo");
      expect(serialized(profile)).not.toContain(photoUrl);
      expectAllowListed(profile);
    });
  });

  describe("AC2: nationality/language included only when required+reasoned", () => {
    it("AC2: languages_spoken is included only when the job requires language with a written reason", () => {
      const profile = buildScoringProfile(
        candidateProfile(),
        jobVersion({
          requires_language: true,
          language_reason: LANGUAGE_REASON,
        }),
      );

      expect(profile.languages_spoken).toEqual([...LANGUAGES_SPOKEN]);
      expectAllowListed(profile, { languagesSpoken: true });
      expectScoringFieldsCopied(profile);
    });

    it("AC2: languages_spoken is absent when requires_language is false or the reason is blank/whitespace", () => {
      const flaggedOff = buildScoringProfile(
        candidateProfile(),
        jobVersion({
          requires_language: false,
          language_reason: LANGUAGE_REASON,
        }),
      );
      expect(flaggedOff).not.toHaveProperty("languages_spoken");
      expectAllowListed(flaggedOff);

      const nullReason = buildScoringProfile(
        candidateProfile(),
        jobVersion({
          requires_language: true,
          language_reason: null,
        }),
      );
      expect(nullReason).not.toHaveProperty("languages_spoken");
      expectAllowListed(nullReason);

      const blankReason = buildScoringProfile(
        candidateProfile(),
        jobVersion({
          requires_language: true,
          language_reason: "",
        }),
      );
      expect(blankReason).not.toHaveProperty("languages_spoken");
      expectAllowListed(blankReason);

      const whitespaceReason = buildScoringProfile(
        candidateProfile(),
        jobVersion({
          requires_language: true,
          language_reason: "   ",
        }),
      );
      expect(whitespaceReason).not.toHaveProperty("languages_spoken");
      expectAllowListed(whitespaceReason);
    });

    it("AC2: a stray nationality property never appears, regardless of requires_nationality", () => {
      const stray = { nationality: "Singaporean" };

      const gatedOff = buildScoringProfile(
        candidateProfile(stray),
        jobVersion({
          requires_nationality: false,
          nationality_reason: null,
        }),
      );
      expect(gatedOff).not.toHaveProperty("nationality");
      expect(serialized(gatedOff)).not.toContain("Singaporean");
      expectAllowListed(gatedOff);

      const gatedOn = buildScoringProfile(
        candidateProfile(stray),
        jobVersion({
          requires_nationality: true,
          nationality_reason: NATIONALITY_REASON,
        }),
      );
      expect(gatedOn).not.toHaveProperty("nationality");
      expect(serialized(gatedOn)).not.toContain("Singaporean");
      expectAllowListed(gatedOn);
    });
  });
});
