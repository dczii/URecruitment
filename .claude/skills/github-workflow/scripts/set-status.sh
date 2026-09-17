#!/usr/bin/env bash
# Add an issue to Project 4 (if needed) and set its Status.
# Usage: set-status.sh <issue#> <planned|inProgress|inReview|done>
set -euo pipefail
# shellcheck source=_lib.sh
source "$(dirname "$0")/_lib.sh"

[[ $# -eq 2 ]] || { echo "usage: $0 <issue#> <planned|inProgress|inReview|done>" >&2; exit 2; }
issue="$1"
key="$2"
require_number "$issue"

status_name="$(jq -r --arg k "$key" '.statusFlow[$k] // empty' "$CONFIG")"
[[ -n "$status_name" ]] || { echo "unknown status key '$key' (planned|inProgress|inReview|done)" >&2; exit 2; }

ensure_fields_cache
project_id="$(jq -r '.projectId' "$FIELDS_CACHE")"
field_id="$(jq -r '.fields[] | select(.name == "Status") | .id' "$FIELDS_CACHE")"
option_id="$(jq -r --arg n "$status_name" '.fields[] | select(.name == "Status") | .options[] | select(.name == $n) | .id' "$FIELDS_CACHE")"

if [[ -z "$field_id" || -z "$option_id" ]]; then
  echo "Status option '$status_name' not found on Project $PROJECT_NUMBER. Run project-fields.sh and check .statusFlow." >&2
  exit 1
fi

url="https://github.com/$REPO/issues/$issue"
item_id="$(gh project item-add "$PROJECT_NUMBER" --owner "$OWNER" --url "$url" --format json --jq '.id')"

gh project item-edit \
  --id "$item_id" \
  --project-id "$project_id" \
  --field-id "$field_id" \
  --single-select-option-id "$option_id" >/dev/null

echo "#$issue → $status_name"
