#!/usr/bin/env bash
# Shared helpers for github-workflow scripts. Source, don't execute.
# Bash 3.2 compatible (macOS default).

ROOT="$(git rev-parse --show-toplevel)"
CONFIG="$ROOT/.claude/github-project.json"
SCRIPTS="$ROOT/.claude/skills/github-workflow/scripts"

[[ -f "$CONFIG" ]] || { echo "missing $CONFIG" >&2; exit 1; }

REPO="$(jq -r '.repo' "$CONFIG")"
OWNER="$(jq -r '.owner' "$CONFIG")"
PROJECT_NUMBER="$(jq -r '.projectNumber' "$CONFIG")"
FIELDS_CACHE="$ROOT/$(jq -r '.fieldsCacheFile' "$CONFIG")"

require_number() {
  [[ "${1:-}" =~ ^[0-9]+$ ]] || { echo "expected an issue number, got: ${1:-<empty>}" >&2; exit 2; }
}

issue_node_id() {
  gh issue view "$1" --repo "$REPO" --json id --jq '.id'
}

ensure_fields_cache() {
  if [[ ! -f "$FIELDS_CACHE" ]]; then
    "$SCRIPTS/project-fields.sh" >/dev/null
  fi
}
