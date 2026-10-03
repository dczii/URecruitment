#!/usr/bin/env bash
# Show an issue's parent and sub-issues.
# Usage: tree.sh <issue#>
set -euo pipefail
# shellcheck source=_lib.sh
source "$(dirname "$0")/_lib.sh"

[[ $# -eq 1 ]] || { echo "usage: $0 <issue#>" >&2; exit 2; }
require_number "$1"

name="${REPO#*/}"

gh api graphql \
  -f query='query($o: String!, $n: String!, $i: Int!) {
    repository(owner: $o, name: $n) {
      issue(number: $i) {
        number title state
        labels(first: 20) { nodes { name } }
        parent { number title state }
        subIssues(first: 100) { nodes { number title state labels(first: 10) { nodes { name } } } }
      }
    }
  }' \
  -f o="$OWNER" -f n="$name" -F i="$1" \
  --jq '.data.repository.issue as $x
    | (if $x.parent then "parent: #\($x.parent.number) \($x.parent.title) [\($x.parent.state)]" else "parent: none" end),
      "issue:  #\($x.number) \($x.title) [\($x.state)] {\($x.labels.nodes | map(.name) | join(", "))}",
      ($x.subIssues.nodes[] | "  - #\(.number) \(.title) [\(.state)] {\(.labels.nodes | map(.name) | join(", "))}")'
