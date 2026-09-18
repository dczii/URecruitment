# Test fixtures

Rules from `docs/plans/test-strategy.md`:

- **Fictional people only.** Never use real people, company contacts, or CVs. Names are obviously invented.
- **Emails use `example.com`.** Phone numbers use a reserved or clearly fake pattern.
- **No Blob store access.** Unit and DB tests never list the sample-data store, download from it, or name its URL.
- **No network.** Unit tests use the fake AI model. Unexpected `fetch` calls fail the test (`test/setup.ts`).
- **Explicit holiday fixtures.** Working-day tests declare the holidays they depend on. They never read the live `sg_public_holidays` table, and never depend on "this year's" holidays.
