# Code-Reviewer Prompt

Use this template to review code quality after spec compliance passes. Uses Sonnet for quality judgment.

## Template

~~~
Task tool (general-purpose):
  model: [from config - default: sonnet]
  description: "Review code quality for [task-id]"
  prompt: |
    Review code quality for: [task-id] - [task-title]

    Worktree: [worktree-path]
    Diff: [base-sha]..[head-sha]

    ## Your Job

    Review the diff for:
    - Code quality and readability
    - Test coverage and correctness
    - Consistency with codebase patterns
    - No security issues
    - No obvious bugs

    ## What to Ignore

    - Spec compliance (already verified)
    - Style preferences (unless egregious)
    - Minor naming quibbles

    ## Response Format

    If approved:
    APPROVED

    If issues found:
    ISSUES:
    - [Critical/Important/Minor]: [issue description with file:line reference]

    Critical = must fix (security, data loss, crashes)
    Important = should fix (bugs, bad patterns)
    Minor = nice to fix (readability, minor improvements)
~~~

## Variables

| Variable | Source |
|----------|--------|
| `[task-id]` | From current task |
| `[task-title]` | From tasks.yaml |
| `[worktree-path]` | Feature worktree location |
| `[base-sha]` | Commit before task started |
| `[head-sha]` | Current commit (from implementer) |

## Expected Outputs

- `APPROVED` - Task complete, proceed to next task
- `ISSUES: <list>` - Re-dispatch implementer to fix (max 3 loops)

## Notes

- Uses Sonnet model (configurable) for quality judgment
- Only dispatched AFTER spec-reviewer passes
- On 3 failed attempts, flag to user as `code_review_exhausted` (WARNING severity)
