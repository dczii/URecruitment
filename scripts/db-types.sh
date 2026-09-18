#!/usr/bin/env bash
# Generate src/lib/database.types.ts from the local Supabase stack, or, with
# --check, fail if the committed file does not match what would be generated.
#
# `supabase-db`: "Regenerate types after every schema change". Nothing enforces
# that on a developer's machine, so CI does — otherwise the committed types
# drift from the schema and every later task types its queries against a lie.
# Both modes build the file the same way (header + CLI output), so they cannot
# disagree about what "generated" means.
#
# Needs a running local stack (`supabase start`, Docker). Never reaches a remote
# project: `gen types --local` only.
set -euo pipefail

COMMITTED="src/lib/database.types.ts"
MODE="${1:-write}"

if [ "$MODE" != "write" ] && [ "$MODE" != "--check" ]; then
  echo "usage: scripts/db-types.sh [--check]" >&2
  exit 2
fi

if ! supabase status >/dev/null 2>&1; then
  # Without a stack, `gen types` fails with an error that does not say the
  # stack is down (CLI 2.106.0 even asks for an access token). Say what it is.
  echo "db:types: no local Supabase stack is running. Start it with \`supabase start\` (needs Docker)." >&2
  exit 1
fi

raw="$(mktemp)"
generated="$(mktemp)"
trap 'rm -f "$raw" "$generated"' EXIT

if ! supabase gen types typescript --local > "$raw"; then
  echo "db:types: \`supabase gen types typescript --local\` failed." >&2
  exit 1
fi

if [ ! -s "$raw" ]; then
  echo "db:types: type generation produced an empty file; refusing to use it." >&2
  exit 1
fi

{
  cat <<'HEADER'
/**
 * Generated database types. Do not hand-edit.
 *
 * Regenerate with `npm run db:types` (needs the local Supabase stack) and
 * commit the result. CI fails when this file drifts from the schema
 * (`npm run db:types:check`).
 */

HEADER
  cat "$raw"
} > "$generated"

if [ "$MODE" = "write" ]; then
  cp "$generated" "$COMMITTED"
  echo "db:types: wrote $COMMITTED."
  exit 0
fi

if ! diff -u "$COMMITTED" "$generated"; then
  if [ -n "${DB_TYPES_GENERATED_OUT:-}" ]; then
    cp "$generated" "$DB_TYPES_GENERATED_OUT"
  fi
  # Byte-exact copy for anyone without Docker: `base64 -d` it into the file.
  echo "::group::Generated $COMMITTED (base64)"
  base64 < "$generated" | tr -d '\n'
  echo
  echo "::endgroup::"
  echo "db:types:check: $COMMITTED does not match the local schema. Run \`npm run db:types\` and commit the result." >&2
  exit 1
fi

echo "db:types:check: $COMMITTED matches the local schema."
