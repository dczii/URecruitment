#!/usr/bin/env bash
# Create an Epic/Story/Task/Bug issue, link it under its parent, add it to Project 4 as Todo.
# Usage: new-issue.sh <epic|story|task|bug> "<title>" <body-file> [parent#] [milestone] [extra,labels]
#   milestone defaults to "MVP"; pass "" for parent to skip linking.
# Prints the new issue number on stdout.
set -euo pipefail
# shellcheck source=_lib.sh
source "$(dirname "$0")/_lib.sh"

[[ $# -ge 3 ]] || { echo "usage: $0 <epic|story|task|bug> \"<title>\" <body-file> [parent#] [milestone] [extra,labels]" >&2; exit 2; }

kind="$1"
title="$2"
body_file="$3"
parent="${4:-}"
milestone="${5:-MVP}"
extra_labels="${6:-}"

[[ -f "$body_file" ]] || { echo "body file not found: $body_file" >&2; exit 2; }
[[ -z "$parent" ]] || require_number "$parent"

case "$kind" in
  epic)  labels="type:epic";  prefix="[Epic] " ;;
  story) labels="type:story"; prefix="[Story] " ;;
  task)  labels="type:task";  prefix="" ;;
  bug)   labels="bug";        prefix="" ;;
  *) echo "kind must be epic|story|task|bug" >&2; exit 2 ;;
esac

case "$title" in
  "$prefix"*) full_title="$title" ;;
  *) full_title="$prefix$title" ;;
esac

[[ -z "$extra_labels" ]] || labels="$labels,$extra_labels"

url="$(gh issue create --repo "$REPO" \
  --title "$full_title" \
  --body-file "$body_file" \
  --label "$labels" \
  --milestone "$milestone")"
number="${url##*/}"

if [[ -n "$parent" ]]; then
  "$SCRIPTS/add-sub-issue.sh" "$parent" "$number" >&2
fi

if ! "$SCRIPTS/set-status.sh" "$number" planned >&2; then
  echo "warning: #$number created but not added to Project $PROJECT_NUMBER (check the project scope)" >&2
fi

echo "$number"
