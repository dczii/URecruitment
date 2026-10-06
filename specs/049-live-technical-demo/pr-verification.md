# Demo-only PR verification

The original preparation checked the entire shared working tree, including preexisting sidebar work. This PR intentionally excludes that unrelated work. Its exact candidate was exported through a temporary Git index into an isolated directory and checked on Node 22.23.2.

| Check | Result |
| --- | --- |
| npm run lint | Pass, zero errors and two existing warnings |
| npm run typecheck | Pass |
| npm test | 436 passed, 68 files |
| PLAYWRIGHT_LOCAL_PORT=3101 npm run test:e2e | 63 passed, 37 existing skips; all eight placement scenarios passed |
| Production Webpack build in the e2e harness | Pass |
| node scripts/check-client-bundle.mjs | Pass, no leaks |
| Candidate git diff --cached --check | Pass |

Actual logs: [PR lint](../../docs/engineering/live-demo/evidence/pr-lint.txt), [typecheck](../../docs/engineering/live-demo/evidence/pr-typecheck.txt), [unit](../../docs/engineering/live-demo/evidence/pr-unit.txt), [browser](../../docs/engineering/live-demo/evidence/pr-e2e.txt), [client bundle](../../docs/engineering/live-demo/evidence/pr-bundle.txt).

The default Turbopack build limitation remains disclosed in verification.md; the owner requested this PR after receiving that result. No default build or test gates were weakened.

The screenshots retain their original provenance: they were captured from the shared working tree, which included unrelated sidebar styling. Those sidebar changes are not included in this PR. The actual placement source hashes match this candidate. Prepared evidence viewers are labeled; no screenshots or AI interactions were fabricated. Raw output logs were normalized only for terminal whitespace.

The user explicitly authorized commit and PR creation, superseding repository restrictions on those operations for this request. No merge or deployment is authorized.
