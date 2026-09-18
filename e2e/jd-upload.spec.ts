import { expect, test, type Page } from "@playwright/test";

/**
 * Desktop-only coverage for JD upload pre-fill (plan.md T3, Story #44).
 * Extraction is intercepted — these tests never call a model. Loading
 * `/jobs/new` still needs a reachable app (and `listClients` needs a
 * seeded local/preview database), same constraint as `job-form.spec.ts`.
 */
test.beforeEach(({}, testInfo) => {
  test.skip(
    testInfo.project.name === "phone",
    "Job form is desktop-only",
  );
});

const JD_FILENAME = "meridian-backend.pdf";

const VALID_PREFILL = {
  title: "Senior Backend Engineer",
  title_source_text: "Senior Backend Engineer",
  requirements: [
    {
      text: "5+ years of backend development experience",
      proposed_marking: "must_have",
      source_text: "Must have 5+ years of backend development experience",
    },
    {
      text: "Strong Python skills",
      proposed_marking: "must_have",
      source_text: "Must have strong Python skills",
    },
    {
      text: "Experience with Kubernetes",
      proposed_marking: "nice_to_have",
      source_text: "Nice to have: experience with Kubernetes",
    },
  ],
  requires_nationality: true,
  nationality_reason_proposal:
    "Client policy requires eligibility to work in Singapore without sponsorship for this regulated desk.",
  nationality_source_text:
    "Must be eligible to work in Singapore without sponsorship (client policy for this regulated desk)",
  requires_language: false,
  language_reason_proposal: null,
  language_source_text: null,
  prompt_injection_detected: false,
  prompt_injection_note: null,
};

async function mockExtractJd(page: Page) {
  await page.route("**/api/ai/extract-jd", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      json: VALID_PREFILL,
    });
  });
}

async function uploadJd(page: Page) {
  await page.goto("/jobs/new");
  await expect(page.locator("main#main-content")).toHaveCount(1);
  await page.getByLabel("Job description file").setInputFiles({
    name: JD_FILENAME,
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n%fake-jd\n"),
  });
  await page.getByRole("button", { name: "Upload job description" }).click();
  await expect(page.getByText(`Read from ${JD_FILENAME}`)).toBeVisible();
}

test("AC2: pre-filled fields show AiSuggestion and source text", async ({
  page,
}) => {
  await mockExtractJd(page);
  await uploadJd(page);

  await expect(
    page.getByRole("heading", { name: "Review AI suggestions" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Confirm pre-filled values" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Edit before saving" }),
  ).toBeVisible();

  const titleProposal = page.getByRole("group", { name: "Job title" });
  await expect(titleProposal.getByText("AI suggestion")).toBeVisible();
  await expect(
    titleProposal.getByText("Senior Backend Engineer"),
  ).toBeVisible();

  const requirementProposal = page.getByRole("group", {
    name: "Requirement 1",
  });
  await expect(requirementProposal.getByText("AI suggestion")).toBeVisible();
  await expect(
    requirementProposal.getByText(
      "5+ years of backend development experience · Must-have",
    ),
  ).toBeVisible();
  await requirementProposal
    .getByRole("button", { name: "Show source text" })
    .click();
  await expect(
    requirementProposal.getByText(
      "Must have 5+ years of backend development experience",
    ),
  ).toBeVisible();

  const nationalityProposal = page.getByRole("group", { name: "Nationality" });
  await expect(nationalityProposal.getByText("AI suggestion")).toBeVisible();
  await nationalityProposal
    .getByRole("button", { name: "Show source text" })
    .click();
  await expect(
    nationalityProposal.getByText(
      "Must be eligible to work in Singapore without sponsorship (client policy for this regulated desk)",
    ),
  ).toBeVisible();

  // Nothing seeds the editable form until an explicit recruiter action.
  await expect(page.getByLabel("Job title")).toHaveValue("");
  await expect(page.getByLabel("Requirement 1")).toHaveValue("");

  await page.getByRole("button", { name: "Confirm pre-filled values" }).click();
  await expect(page.getByLabel("Job title")).toHaveValue(
    "Senior Backend Engineer",
  );
  await expect(page.getByLabel("Requirement 1")).toHaveValue(
    "5+ years of backend development experience",
  );
});

test("AC3: recruiter-edited marking wins over the AI proposal before save", async ({
  page,
}) => {
  await mockExtractJd(page);
  await uploadJd(page);

  await page.getByRole("button", { name: "Edit before saving" }).click();
  await expect(page.getByLabel("Job title")).toHaveValue(
    "Senior Backend Engineer",
  );
  await expect(page.getByLabel("Job title")).toBeFocused();

  const marking = page.getByRole("group", {
    name: "Marking for requirement 1",
  });
  await expect(marking.getByRole("button", { name: "Must-have" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await marking.getByRole("button", { name: "Nice-to-have" }).click();
  await expect(
    marking.getByRole("button", { name: "Nice-to-have" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(marking.getByRole("button", { name: "Must-have" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );

  // The editable form holds the recruiter's marking; Save job still posts
  // this component state through createJob (unchanged from #43).
  await expect(page.getByLabel("Requirement 1")).toHaveValue(
    "5+ years of backend development experience",
  );
});
