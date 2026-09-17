#!/usr/bin/env bash
# Add an issue to the project (if needed) and set one single-select field option.
# Usage: set-field.sh <issue#> "<Field name>" "<Option name>"
set -euo pipefail
# shellcheck source=_lib.sh
source "$(dirname "$0")/_lib.sh"

[[ $# -eq 3 ]] || { echo "usage: $0 <issue#> \"<Field name>\" \"<Option name>\"" >&2; exit 2; }
issue="$1"; field_name="$2"; option_name="$3"
require_number "$issue"

ensure_fields_cache
project_id="$(jq -r '.projectId' "$FIELDS_CACHE")"
field_id="$(jq -r --arg f "$field_name" '.fields[] | select(.name == $f) | .id' "$FIELDS_CACHE")"
option_id="$(jq -r --arg f "$field_name" --arg o "$option_name" \
  '.fields[] | select(.name == $f) | .options[] | select(.name == $o) | .id' "$FIELDS_CACHE")"

if [[ -z "$field_id" || -z "$option_id" ]]; then
  echo "field '$field_name' / option '$option_name' not found on Project $PROJECT_NUMBER." >&2
  echo "Delete $FIELDS_CACHE and re-run project-fields.sh if the board changed." >&2
  exit 1
fi

item_id="$(gh project item-add "$PROJECT_NUMBER" --owner "$OWNER" \
  --url "https://github.com/$REPO/issues/$issue" --format json --jq '.id')"

gh project item-edit --id "$item_id" --project-id "$project_id" \
  --field-id "$field_id" --single-select-option-id "$option_id" >/dev/null

echo "#$issue → $field_name: $option_name"
