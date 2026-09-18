# `/api/ai/*`: the only home for AI route handlers

Every route handler that calls a model, directly or through `@/server/ai`, lives in this folder. For
example, `src/app/api/ai/search/route.ts` serves `/api/ai/search`. The reason is cost: the portal has
no sign-in, so anyone with the link can call an AI route. The Vercel firewall rate-limits requests
**by path**, and Hobby allows **one** rate-limit rule per project, so every AI route must share this
one prefix.

- **The prefix:** `AI_ROUTE_PREFIX` = `/api/ai/` in [`src/lib/ai-routes.ts`](../../../lib/ai-routes.ts).
- **The rule:** [`infra/vercel/ai-rate-limit.rule.json`](../../../../infra/vercel/ai-rate-limit.rule.json).
  It allows 60 requests per 60 seconds per IP, and the excess gets **HTTP 429**. How a person
  applies and checks it is in [the infrastructure plan](../../../../docs/plans/infrastructure.md#rate-limit-and-spend-cap-93).
- **The guard:** `test/infra/ai-route-prefix.test.ts` fails if a route handler outside this folder
  imports AI code (`ai`, `@ai-sdk/*` or `@/server/ai`).

## Rules

1. **Put a handler in a sub-folder, never in `src/app/api/ai/route.ts` itself.** The firewall
   matches `/api/ai/` with the trailing slash, so the bare `/api/ai` would escape the rule. The guard
   test forbids it.
2. **No route groups or rewrites on this path.** The rule matches the URL path, and the guard checks
   the folder. Keep the two the same.
3. **Server Actions never call a model in response to the browser.** A Server Action posts to its
   page's URL, which this rule can't see. The one exception is `after()` background work scheduled by
   a non-AI save, such as re-scoring after a job is saved. The monthly spend cap in `runAi()` (#175)
   bounds that work.
4. **Every call still goes through `runAi()`.** It validates the schema, writes `ai_runs` and checks
   the spend cap. The rate limit bounds the *speed* of spending; the cap bounds the *total*.
5. **Validate input with Zod and return typed errors.** Never send a stack trace. No CORS.

## What a rate-limited recruiter sees

A request over the limit never reaches the handler. Vercel answers `429` with its own body, **not
our JSON**. Client code must check the status **before** parsing the body:

```ts
const response = await fetch("/api/ai/search", { method: "POST", body });
const failure = aiFailureMessage(response.status); // from "@/lib/ai-routes"
if (failure) {
  // Show it next to the action as a visible notice; never fail silently.
  // The AI only suggests, so the recruiter's own work carries on.
  return { ok: false, message: failure };
}
const data = await response.json();
```

- `429` → *"Too many AI requests from your network just now. Wait a minute, then try again. Your work
  hasn't been lost."*
- Any other failure → *"The AI suggestion couldn't be produced. Try again in a moment. If it keeps
  failing, carry on without it."*

The limit counts per **network**, and a whole office may share one public IP. If recruiters see the
first message during normal work, the limit needs raising. That is a change to the rule file and a
re-publish. See the infrastructure plan.
