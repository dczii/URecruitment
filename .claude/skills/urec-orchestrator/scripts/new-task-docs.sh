#!/usr/bin/env bash
# Create docs/tasks/<issue>-<slug>/{spec,plan}.md from the orchestrator templates.
# Usage: new-task-docs.sh <issue-number> <slug> "<issue title>"
# Bash 3.2 compatible (macOS default).
set -euo pipefail

if [[ $# -lt 3 ]]; then
  echo "usage: $0 <issue-number> <slug> \"<issue title>\"" >&2
  exit 2
fi

issue="$1"
slug="$2"
title="$3"

[[ "$issue" =~ ^[0-9]+$ ]] || { echo "issue must be a number, got: $issue" >&2; exit 2; }
[[ "$slug" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]] || { echo "slug must be kebab-case, got: $slug" >&2; exit 2; }

root="$(git rev-parse --show-toplevel)"
config="$root/.claude/github-project.json"
templates="$root/.claude/skills/urec-orchestrator/templates"

repo="$(jq -r '.repo' "$config")"
default_branch="$(jq -r '.defaultBranch' "$config")"
tasks_dir="$root/$(jq -r '.docsTasksDir' "$config")"
dir="$tasks_dir/$issue-$slug"
branch="$(git -C "$root" rev-parse --abbrev-ref HEAD)"
today="$(TZ=Asia/Singapore date +%Y-%m-%d)"

shopt -s nullglob
existing=("$tasks_dir/$issue-"*)
if [[ ${#existing[@]} -gt 0 ]]; then
  echo "docs already exist for #$issue: ${existing[0]}" >&2
  exit 1
fi

if [[ "$branch" == "$default_branch" ]]; then
  echo "warning: on $default_branch; create the task branch first (<type>/$issue-$slug)" >&2
fi

mkdir -p "$dir"

render() {
  ISSUE="$issue" SLUG="$slug" TITLE="$title" REPO="$repo" BRANCH="$branch" DATE="$today" \
    perl -pe '
      s/\{\{ISSUE\}\}/$ENV{ISSUE}/g;
      s/\{\{SLUG\}\}/$ENV{SLUG}/g;
      s/\{\{TITLE\}\}/$ENV{TITLE}/g;
      s/\{\{REPO\}\}/$ENV{REPO}/g;
      s/\{\{BRANCH\}\}/$ENV{BRANCH}/g;
      s/\{\{DATE\}\}/$ENV{DATE}/g;
    ' "$1"
}

render "$templates/spec.md" > "$dir/spec.md"
render "$templates/plan.md" > "$dir/plan.md"

echo "$dir"
