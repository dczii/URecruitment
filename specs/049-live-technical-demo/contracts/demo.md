# Demo contracts
- App boundary: savePlacementAction retains its existing parameters/result union; success placement additionally has numeric daysUsed. Invalid dates produce the existing safe save error without writes.
- Demo start: bind app to 127.0.0.1:3100 and fictional provider to 127.0.0.1:54329. Override backend configuration with fictional values and disable telemetry. Refuse occupied ports; never reuse a running unknown server.
- Local provider controls: POST /test/placements enables/reset placement fixture; optional empty state or next-write failure. These controls are absent from app routes. No arbitrary remote URL argument accepted.
- Evidence: `npm run demo:verify` exits nonzero on unexpected outputs or test failure and writes a report with case inputs, baseline, expected, actual, spec hash and source identity.
- Screenshots: capture command uses actual Chromium rendering, fixed time, local login and UI actions; saves original PNGs and a provenance manifest. No compositing, fabricated before UI or simulated IDE/Copilot conversations.
