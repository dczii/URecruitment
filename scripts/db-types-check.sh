#!/usr/bin/env bash
# Fail if src/lib/database.types.ts does not match the local stack's schema.
#
# `supabase-db`: "Regenerate types after every schema change". Nothing enforces
# that on a developer's machine, so CI does — otherwise the committed types
# drift from the schema and every later task types its queries against a lie.
#
# Needs a running local stack (`supabase start`, Docker). Never reaches a remote
# project: `gen types --local` only.
set -euo pipefail

COMMITTED="src/lib/database.types.ts"

if ! supabase status >/dev/null 2>&1; then
  # Without a stack, CLI 2.106.0 asks for SUPABASE_ACCESS_TOKEN rather than
  # saying the stack is down, which reads as an auth problem. Say what it is.
  echo "db:types:check: no local Supabase stack is running. Start it with \`supabase start\` (needs Docker)." >&2
  exit 1
fi

generated="$(mktemp)"
trap 'rm -f "$generated"' EXIT

if ! supabase gen types typescript --local > "$generated"; then
  echo "db:types:check: \`supabase gen types typescript --local\` failed." >&2
  exit 1
fi

if [ ! -s "$generated" ]; then
  echo "db:types:check: type generation produced an empty file; refusing to treat that as a match." >&2
  exit 1
fi

if ! diff -u "$COMMITTED" "$generated"; then
  echo "db:types:check: $COMMITTED does not match the local schema. Run \`npm run db:types\` and commit the result." >&2
  exit 1
fi

echo "db:types:check: $COMMITTED matches the local schema."
