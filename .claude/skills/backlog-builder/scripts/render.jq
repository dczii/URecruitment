# jq module: renders one roadmap item into a GitHub issue body.
# Callers pass $manifest (key -> issue number) and $children (parent key -> [child keys]).
def bullets(a): (a // []) | map("- " + .) | join("\n");
def checks(a):  (a // []) | map("- [ ] " + .) | join("\n");
def sec(title; body): if ((body // "") | length) > 0 then "## " + title + "\n\n" + body + "\n\n" else "" end;
def ref(k): (($manifest[k]) // null) as $n
  | if $n then "#" + ($n|tostring) + " (" + k + ")" else k + " — not created yet" end;

def render:
  . as $i
  | if $i.level == "epic" then
      sec("Goal"; $i.goal)
    + sec("PRD references"; bullets($i.prd))
    + sec("Stories"; (((($children[$i.key]) // []) | map("- [ ] " + ref(.)) | join("\n"))
          | if . == "" then "_Filled in once the stories exist._" else . end))
    + sec("Exit criteria"; checks($i.exit))
    + sec("Out of scope"; bullets($i.outOfScope))
    + sec("Release"; $i.milestone)
    + sec("Phase"; $i.phase)
  elif $i.level == "story" then
      sec("User story"; $i.story)
    + sec("Acceptance criteria"; (($i.ac // []) | to_entries
          | map("- [ ] **AC" + ((.key+1)|tostring) + "** " + .value) | join("\n")))
    + sec("PRD references"; bullets($i.prd))
    + sec("Tasks"; (((($children[$i.key]) // []) | to_entries
          | map(((.key+1)|tostring) + ". " + ref(.value)) | join("\n"))
          | if . == "" then "_Filled in once the tasks exist._" else . end))
    + sec("Design needed?"; $i.design)
    + sec("Phase"; $i.phase)
  else
      sec("What to build"; $i.what)
    + sec("Scope"; bullets($i.scope))
    + sec("Out of scope"; bullets($i.exclusions))
    + sec("Done when"; checks($i.done))
    + sec("Definition of done"; checks([
        "**Completion summary required.** The `/task` final report and the **Outcome** section of `docs/tasks/<issue>-<slug>/plan.md` record: what was implemented; files changed; each acceptance criterion with the test that proves it; verification results; deviations and assumptions; executor model and fix rounds; remaining follow-ups or blockers."
      ]))
    + sec("Affected files / likely code areas"; bullets($i.files))
    + sec("Skills in scope"; (($i.skills // []) | map("`" + . + "`") | join(", ")))
    + sec("Executor hint"; (if $i.executor == "claude" then "claude (pen.dev design / judgment-heavy)" else "grok (code via cursor-agent)" end))
    + sec("Flags"; ([
          "- [" + (if ((($i.flags) // []) | index("TF")) then "x" else " " end) + "] Test-first (logic)",
          "- [" + (if ((($i.flags) // []) | index("P"))  then "x" else " " end) + "] Implements a PRD item that is still *proposed*",
          "- [" + (if ((($i.flags) // []) | index("D?")) then "x" else " " end) + "] Depends on a PRD *open* question"
        ] | join("\n")))
    + sec("Depends on"; (((($i.depends) // []) | map("- " + ref(.)) | join("\n"))
          | if . == "" then "- none" else . end))
    + sec("Verification"; "```\n" + ((($i.verify // ["npm run lint","npm run typecheck","npm test"]) | join("\n"))) + "\n```")
    + sec("Phase"; $i.phase)
  end
  | rtrimstr("\n");
