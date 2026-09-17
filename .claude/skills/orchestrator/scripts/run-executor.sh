#!/usr/bin/env bash
# Run one plan step through cursor-agent (Grok 4.6) on the current task branch and log the output.
# Usage: run-executor.sh <issue>-<slug> <step-id> <prompt-file> [model]
#   model defaults to .executor.model in .claude/github-project.json
# Extra cursor-agent flags can be passed via EXECUTOR_EXTRA_FLAGS (e.g. "--force").
# Bash 3.2 compatible (macOS default).
set -euo pipefail

if [[ $# -lt 3 ]]; then
  echo "usage: $0 <issue>-<slug> <step-id> <prompt-file> [model]" >&2
  exit 2
fi

task="$1"
step="$2"
prompt_file="$3"

root="$(git rev-parse --show-toplevel)"
config="$root/.claude/github-project.json"
model="${4:-$(jq -r '.executor.model' "$config")}"
default_branch="$(jq -r '.defaultBranch' "$config")"
branch="$(git -C "$root" rev-parse --abbrev-ref HEAD)"

[[ -f "$prompt_file" ]] || { echo "prompt file not found: $prompt_file" >&2; exit 2; }
command -v cursor-agent >/dev/null || { echo "cursor-agent not on PATH" >&2; exit 127; }

if [[ "$branch" == "$default_branch" ]]; then
  echo "refusing to run the executor on $default_branch; switch to the task branch" >&2
  exit 1
fi
case "$branch" in
  */"$task") ;;
  *) echo "warning: branch '$branch' does not end with task id '$task'" >&2 ;;
esac

log_dir="$root/.orchestrator/$task"
mkdir -p "$log_dir"
log="$log_dir/$step.log"

{
  echo "# started: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "# task: $task  step: $step  model: $model  branch: $branch"
  echo "# prompt: $prompt_file"
  echo
} > "$log"

cd "$root"
set +e
# shellcheck disable=SC2086  # EXECUTOR_EXTRA_FLAGS is intentionally word-split
cursor-agent -p "$(cat "$prompt_file")" \
  --model "$model" \
  --sandbox enabled \
  --trust \
  --output-format text \
  ${EXECUTOR_EXTRA_FLAGS:-} 2>&1 | tee -a "$log"
status="${PIPESTATUS[0]}"
set -e

echo "# finished: $(date -u +%Y-%m-%dT%H:%M:%SZ) exit=$status" >> "$log"
echo "log: $log" >&2
exit "$status"
