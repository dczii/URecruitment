#!/usr/bin/env bash
# Idempotently create the URecruitment label set and milestones.
# Usage: setup-labels.sh
set -euo pipefail
# shellcheck source=_lib.sh
source "$(dirname "$0")/_lib.sh"

label() {
  gh label create "$1" --repo "$REPO" --color "$2" --description "$3" --force >/dev/null
  echo "label: $1"
}

label "type:epic"          "5319e7" "Epic: one capability, contains stories"
label "type:story"         "1d76db" "Story: recruiter-facing outcome, contains tasks"
label "type:task"          "0e8a16" "Task: one PR-sized unit of work"

label "area:foundation"    "c5def5" "Scaffold, env, tooling"
label "area:design-system" "c5def5" "pen.dev tokens, shadcn theme, shared components"
label "area:data"          "c5def5" "Schema, migrations, RLS, seed"
label "area:cv-processing" "c5def5" "Extraction, parser, review queue, profile edits"
label "area:jobs"          "c5def5" "Job form, JD upload, versions"
label "area:gap-check"     "c5def5" "Job request gap flags"
label "area:matching"      "c5def5" "Embeddings, scoring, ranked list"
label "area:search"        "c5def5" "Talent search"
label "area:pipeline"      "c5def5" "Stages, board, delay status"
label "area:dashboard"     "c5def5" "Overdue and due-soon lists, filters"
label "area:placements"    "c5def5" "Start date, 30-day guarantee"
label "area:settings"      "c5def5" "Limits, holidays, change log"
label "area:ai-governance" "c5def5" "ai_runs, eval, quality bar, rate limits"
label "area:compliance"    "c5def5" "PDPA, fair employment"
label "area:release"       "c5def5" "CI, deploy, environments"

label "needs-decision"     "d93f0b" "Blocked on a PRD open question or product call"
label "prd:proposed"       "fbca04" "Implements a PRD item that is still proposed"
label "priority:p0"        "b60205" "Must have for the MVP"
label "priority:p1"        "d93f0b" "Should have"
label "priority:p2"        "fef2c0" "Nice to have"

existing="$(gh api "repos/$REPO/milestones?state=all&per_page=100" --jq '.[].title')"
while IFS= read -r title; do
  if printf '%s\n' "$existing" | grep -Fxq "$title"; then
    echo "milestone exists: $title"
  else
    gh api -X POST "repos/$REPO/milestones" -f title="$title" >/dev/null
    echo "milestone created: $title"
  fi
done < <(jq -r '.milestones[]' "$CONFIG")
