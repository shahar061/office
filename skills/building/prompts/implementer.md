# Implementer Prompt

Use this template when dispatching an implementer subagent for a task.

## Template

~~~
Task tool (general-purpose):
  model: [from config - default: sonnet]
  description: "Implement [task-id]: [task-title]"
  prompt: |
    You are implementing: [task-id] - [task-title]

    Worktree: [worktree-path]
    Spec: Read docs/office/05-implementation-spec.md section "[task-id]"

    Files to modify:
    - [file1]
    - [file2]

    ## Instructions

    1. Read the spec section for this task
    2. Follow TDD steps exactly as written:
       - Write failing test
       - Verify test fails
       - Write implementation
       - Verify test passes
    3. Commit with message: "[task-id]: [description]"

    ## If Unclear

    If you cannot proceed due to missing information, respond EXACTLY:
    NEED_CLARIFICATION: [your specific question]

    Do not guess. Do not assume. Ask.

    ## When Done

    Respond with:
    DONE
    Files changed: [list]
    Test results: [pass/fail counts]
    Commit SHA: [sha]

    ## On Error

    If you encounter an unrecoverable error, respond:
    ERROR: [description of what went wrong]
~~~

## Variables

| Variable | Source |
|----------|--------|
| `[task-id]` | From tasks.yaml |
| `[task-title]` | From tasks.yaml |
| `[worktree-path]` | Feature worktree location |
| `[file1]`, `[file2]` | From implementation-spec.md task section |

## Expected Outputs

- `DONE` - Task completed successfully
- `NEED_CLARIFICATION: <question>` - Needs clarifier subagent
- `ERROR: <description>` - Unrecoverable error, may need flag
