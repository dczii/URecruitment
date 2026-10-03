#!/usr/bin/env bash
# Link <child#> as a sub-issue of <parent#>.
# Usage: add-sub-issue.sh <parent#> <child#>
set -euo pipefail
# shellcheck source=_lib.sh
source "$(dirname "$0")/_lib.sh"

[[ $# -eq 2 ]] || { echo "usage: $0 <parent#> <child#>" >&2; exit 2; }
require_number "$1"
require_number "$2"

parent_id="$(issue_node_id "$1")"
child_id="$(issue_node_id "$2")"

gh api graphql \
  -f query='mutation($p: ID!, $c: ID!) { addSubIssue(input: { issueId: $p, subIssueId: $c }) { issue { number } subIssue { number } } }' \
  -f p="$parent_id" \
  -f c="$child_id" \
  --jq '"#\(.data.addSubIssue.subIssue.number) → sub-issue of #\(.data.addSubIssue.issue.number)"'
