# Spec-Reviewer Prompt

Use this template to verify implementation matches specification exactly. Uses Haiku for fast, structured comparison.

## Template

~~~
Task tool (general-purpose):
  model: [from config - default: haiku]
  description: "Review spec compliance for [task-id]"
  prompt: |
    Review spec compliance for: [task-id] - [task-title]

    ## What Was Requested

    [Full task spec text from phase spec.md]

    ## What Was Built

    Files changed: [from implementer report]
    Commit: [commit SHA]
    Worktree: [worktree-path]

    ## Your Job

    Read the actual code in the worktree. Verify:
    - All requirements implemented (nothing missing)
    - No extra work (nothing unneeded)
    - Matches spec intent

    ## CRITICAL: Verify by Reading Code

    Do NOT trust the implementer's report. Read the actual files.
    Check each requirement against the actual implementation.

    ## Response Format

    If fully compliant:
    COMPLIANT

    If issues found:
    ISSUES:
    - [Missing/Extra/Wrong]: [specific issue with file:line reference]
~~~

## Variables

| Variable | Source |
|----------|--------|
| `[task-id]` | From current task |
| `[task-title]` | From tasks.yaml |
| `[Full task spec text]` | Copy from `spec/phase_{N}_{name}/spec.md` |
| `[from implementer report]` | Files from implementer's DONE response |
| `[commit SHA]` | From implementer's DONE response |
| `[worktree-path]` | Feature worktree location |

## Expected Outputs

- `COMPLIANT` - Proceed to code-reviewer
- `ISSUES: <list>` - Re-dispatch implementer to fix (max 3 loops)

## Notes

- Uses Haiku model (configurable) for speed
- Structured comparison task - doesn't need creative reasoning
- On 3 failed attempts, flag to user as `spec_review_exhausted`
