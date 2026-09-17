#!/usr/bin/env bash
# Build or refresh the URecruitment backlog from docs/backlog/roadmap/*.json.
# Idempotent: docs/backlog/manifest.json maps each stable key to its issue number.
# Usage: build.sh [--dry-run] [--only E00,E01] [--level epic|story|task] [--finalize]
set -euo pipefail
source "$(git rev-parse --show-toplevel)/.claude/skills/github-workflow/scripts/_lib.sh"

BB="$ROOT/.claude/skills/backlog-builder"
GW="$ROOT/.claude/skills/github-workflow/scripts"
OUT="$ROOT/docs/backlog"
MANIFEST="$OUT/manifest.json"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

DRY=0; ONLY=""; LEVELS="epic story task"; FINALIZE=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY=1 ;;
    --only) ONLY="$2"; shift ;;
    --level) LEVELS="$2"; shift ;;
    --finalize) FINALIZE=1 ;;
    *) echo "unknown arg: $1" >&2; exit 2 ;;
  esac
  shift
done

[[ -f "$MANIFEST" ]] || echo '{}' > "$MANIFEST"
jq -s 'map(.items[]) ' "$OUT"/roadmap/*.json > "$TMP/items.json"

# One fetch of every existing issue title, so duplicate detection costs one API call
# rather than one per item. Title -> number.
gh issue list --repo "$REPO" --state all --limit 1000 --json number,title \
  | jq 'map({key: .title, value: .number}) | from_entries' > "$TMP/titles.json"

# children index: parent key -> [child keys] in file order
jq 'map(select(.parent != null)) | group_by(.parent)
    | map({key: .[0].parent, value: map(.key)}) | from_entries' "$TMP/items.json" > "$TMP/children.json"

epic_of() { echo "${1%%-*}"; }
in_only() {
  [[ -z "$ONLY" ]] && return 0
  case ",$ONLY," in *",$(epic_of "$1"),"*) return 0 ;; esac
  return 1
}

render() { # <key> -> body on stdout
  jq -r -L "$BB/scripts" --arg k "$1" \
    --argjson manifest "$(cat "$MANIFEST")" \
    --argjson children "$(cat "$TMP/children.json")" \
    'include "render"; map(select(.key == $k))[0] | render' \
    "$TMP/items.json"
}

created=0; adopted=0; skipped=0; failed=0
PREVIEW="$OUT/preview.md"

if [[ $DRY -eq 1 ]]; then
  {
    echo "# Backlog preview"
    echo
    echo "Generated $(date -u +%Y-%m-%dT%H:%M:%SZ) · source \`docs/backlog/roadmap/*.json\` · manifest \`docs/backlog/manifest.json\`"
    echo
    echo "| Key | Level | Phase | Milestone | Title | Action | Labels |"
    echo "|---|---|---|---|---|---|---|"
  } > "$PREVIEW"
fi

process_level() {
  local level="$1" key title kind parent_key parent_num milestone labels phase action num
  while IFS=$'\t' read -r key title milestone labels phase parent_key; do
    in_only "$key" || continue
    num="$(jq -r --arg k "$key" '.[$k] // empty' "$MANIFEST")"
    action="create"
    if [[ -n "$num" ]] && gh issue view "$num" --repo "$REPO" --json number >/dev/null 2>&1; then
      action="skip (in manifest)"
    else
      local found
      found="$(jq -r --arg t "$title" '.[$t] // empty' "$TMP/titles.json")"
      [[ -n "$found" ]] && { action="adopt"; num="$found"; }
    fi

    if [[ $DRY -eq 1 ]]; then
      printf '| %s | %s | %s | %s | %s | %s | %s |\n' \
        "$key" "$level" "${phase%% *}" "$milestone" "$title" "$action" "$labels" >> "$PREVIEW"
      continue
    fi

    case "$action" in
      "skip (in manifest)") skipped=$((skipped+1)); continue ;;
      adopt)
        jq --arg k "$key" --argjson n "$num" '.[$k] = $n' "$MANIFEST" > "$TMP/m" && mv "$TMP/m" "$MANIFEST"
        adopted=$((adopted+1))
        echo "adopted #$num  $key  $title"
        ;;
      create)
        render "$key" > "$TMP/body.md"
        parent_num=""
        [[ -n "$parent_key" && "$parent_key" != "null" ]] && \
          parent_num="$(jq -r --arg k "$parent_key" '.[$k] // empty' "$MANIFEST")"
        case "$level" in epic) kind=epic ;; story) kind=story ;; *) kind=task ;; esac
        if ! num="$("$GW/new-issue.sh" "$kind" "$title" "$TMP/body.md" "$parent_num" "$milestone" "$labels" 2>"$TMP/err")"; then
          echo "FAILED $key: $(tail -3 "$TMP/err")" >&2; failed=$((failed+1)); continue
        fi
        jq --arg k "$key" --argjson n "$num" '.[$k] = $n' "$MANIFEST" > "$TMP/m" && mv "$TMP/m" "$MANIFEST"
        created=$((created+1))
        echo "created  #$num  $key  $title"
        sleep 0.7
        ;;
    esac
    [[ -n "$phase" ]] && "$GW/set-field.sh" "$num" "Phase" "$phase" >/dev/null 2>&1 || true
  done < <(jq -r --arg lv "$level" \
      '.[] | select(.level == $lv)
       | [.key, ((if .level=="epic" then "[Epic] " elif .level=="story" then "[Story] " else "" end) + .title),
          .milestone, ((.labels // []) | join(",")), (.phase // ""), (.parent // "")]
       | @tsv' "$TMP/items.json")
}

for lv in $LEVELS; do
  echo "=== $lv"
  process_level "$lv"
done

if [[ $DRY -eq 1 ]]; then
  {
    echo
    echo "## Counts"
    echo
    jq -r 'group_by(.level) | map("- **" + .[0].level + "**: " + (length|tostring)) | .[]' "$TMP/items.json"
    echo
    echo "## Phases"
    echo
    echo "| Phase | Epics | Stories | Tasks |"
    echo "|---|---|---|---|"
    jq -r 'group_by(.phase) | map({p: .[0].phase,
             e: (map(select(.level=="epic"))|length),
             s: (map(select(.level=="story"))|length),
             t: (map(select(.level=="task"))|length)})
           | sort_by(.p | ltrimstr("P") | split(" ")[0] | tonumber)
           | map("| \(.p) | \(.e) | \(.s) | \(.t) |") | .[]' "$TMP/items.json"
  } >> "$PREVIEW"
  echo "preview: $PREVIEW"
  exit 0
fi

if [[ $FINALIZE -eq 1 ]]; then
  echo "=== finalize (epic story lists, story task lists, task dependencies)"
  while IFS=$'\t' read -r key level; do
    in_only "$key" || continue
    num="$(jq -r --arg k "$key" '.[$k] // empty' "$MANIFEST")"
    [[ -n "$num" ]] || continue
    render "$key" > "$TMP/body.md"
    gh issue edit "$num" --repo "$REPO" --body-file "$TMP/body.md" >/dev/null
    echo "updated  #$num  $key"
    sleep 0.4
  done < <(jq -r '.[] | select(.level=="epic" or .level=="story" or ((.depends // []) | length > 0))
                 | [.key, .level] | @tsv' "$TMP/items.json")
fi

echo
echo "created=$created adopted=$adopted skipped=$skipped failed=$failed"
