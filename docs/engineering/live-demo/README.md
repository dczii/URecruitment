# Fifteen-minute technical demo

Start with [the presenter script](script.md). It follows Analyse (3m) → Specify (2.5m) → Implement (5m) → Verify and trace (4.5m), using one placement-countdown rule and real browser screenshots.

## Run locally

Use Node 22 (`nvm use 22`) and the installed npm dependencies/Playwright Chromium.

```sh
npm run demo:start
```

This builds the app and starts it at **http://127.0.0.1:3100** with an in-memory fictional provider at 127.0.0.1:54329. The scenario clock is **5 October 2026, 12:00 Singapore**. Sign in with `recruiter@example.test` and the mock code `001234`. No email is sent. Do not run the remote/Blob seed.

In a second terminal:

```sh
npm run demo:reset
npm run demo:verify
npm run demo:capture
```

`demo:capture` performs local login, captures the populated page, typed-name prompt, successful save/reload, rejected save, empty state and phone equivalents. It also renders actual specification/source/evidence files in a clearly labeled prepared viewer. PNGs are direct Chromium screenshots, with hashes and provenance in [after-manifest.json](screenshots/after-manifest.json). The [before screenshot](screenshots/before-desktop.png) was captured from the real application before this feature's fix; its [manifest](screenshots/before-manifest.json) is retained. Do not overwrite historical captures by invoking baseline capture on a corrected app.

Stop the server with Ctrl-C. The launcher refuses occupied demo ports and leaves an existing port-3000 application alone. Browser tests use port 3101 when requested:

```sh
PLAYWRIGHT_LOCAL_PORT=3101 npm run test:e2e
```

Stop the demo first because both harnesses use provider port 54329. The normal e2e provider opts into placements per test; its clock uses the actual date with relative fixtures.

## Live coding rehearsal

```sh
npm run demo:rehearse
```

The command creates a new temporary directory with a copy of the spec, historical formula, expected cases and tests. It prints the exact test command and paths. Open that directory in VS Code, use [the prompts](prompts.md), run the expected failing tests, implement the bounded helper and inspect the diff. This is explicitly an isolated coding exercise; the real application is already corrected. It does not create branches, commits or tags, or overwrite the working application. You may delete the printed temporary directory after rehearsal.

## Evidence and limits

- [Consistency evidence](evidence/verification.md): original load/save formulas, explicit expected outputs, corrected outputs and classification.
- [Genuine pre-fix failures](evidence/red-tests.txt): four failing assertions before the app edit.
- [Focused test output](evidence/focused-tests.txt): actual passing results.
- [Owning spec](../../../specs/049-live-technical-demo/spec.md), [tasks](../../../specs/049-live-technical-demo/tasks.md), [verification](../../../specs/049-live-technical-demo/verification.md).

The browser runs the real Next.js UI, access boundary and Server Actions against a simulated local auth/REST provider. It proves the covered UI/service flow. It does not prove PostgreSQL queries, RLS, storage, actual email or remote deployment behaviour. Existing guarantee helper tests cover the working-day rule; SQL parity still requires a local Supabase stack. Preparation used Codex; no Copilot session or presenter timing is claimed to have occurred. The named Tech Lead must rehearse the actual Copilot steps and the 15-minute delivery on the presentation laptop.
