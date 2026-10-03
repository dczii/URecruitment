#!/usr/bin/env bash
# Cache Project 4's id, fields and single-select options, then check the configured status names exist.
# Usage: project-fields.sh
set -euo pipefail
# shellcheck source=_lib.sh
source "$(dirname "$0")/_lib.sh"

project_json="$(gh project view "$PROJECT_NUMBER" --owner "$OWNER" --format json)"
fields_json="$(gh project field-list "$PROJECT_NUMBER" --owner "$OWNER" --format json --limit 100)"

jq -n \
  --argjson p "$project_json" \
  --argjson f "$fields_json" \
  '{
     projectId: $p.id,
     title: $p.title,
     url: $p.url,
     fetchedAt: (now | todate),
     fields: [ $f.fields[] | { id, name, type, options: ((.options // []) | map({ id, name })) } ]
   }' > "$FIELDS_CACHE"

echo "cached: $FIELDS_CACHE"
jq -r '.fields[] | "  \(.name) [\(.type)]" + (if (.options | length) > 0 then ": " + (.options | map(.name) | join(", ")) else "" end)' "$FIELDS_CACHE"

missing=0
while IFS= read -r name; do
  found="$(jq -r --arg n "$name" '.fields[] | select(.name == "Status") | .options[] | select(.name == $n) | .id' "$FIELDS_CACHE")"
  if [[ -z "$found" ]]; then
    echo "MISSING Status option on Project $PROJECT_NUMBER: '$name' (from .statusFlow in $CONFIG)" >&2
    missing=1
  fi
done < <(jq -r '.statusFlow | to_entries[] | .value' "$CONFIG")

exit "$missing"
