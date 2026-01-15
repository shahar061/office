# Clarifier Prompt

Use this template when an implementer needs clarification. Dispatched with Opus model for deep reasoning.

## Template

~~~
Task tool (general-purpose):
  model: [from config - default: opus]
  description: "Clarify question for [task-id]"
  prompt: |
    An implementer working on [task-id] needs clarification.

    Question: [implementer's question]

    Task context: [task-title]
    Worktree: [worktree-path]

    ## Your Job

    1. Explore the codebase to find the answer
    2. Check existing patterns, interfaces, conventions
    3. Provide a clear, actionable answer

    ## Response Format

    If you can answer from the codebase:
    ANSWERED: [your clear, actionable answer]

    If you cannot determine the answer from the codebase:
    FLAG: [reason - what information is missing that only the user can provide]
~~~

## Variables

| Variable | Source |
|----------|--------|
| `[task-id]` | From current task |
| `[task-title]` | From tasks.yaml |
| `[worktree-path]` | Feature worktree location |
| `[implementer's question]` | From implementer's NEED_CLARIFICATION response |

## Expected Outputs

- `ANSWERED: <answer>` - Re-dispatch implementer with this context
- `FLAG: <reason>` - Escalate to user (clarifier can't resolve)

## Notes

- Clarifier uses Opus model (configurable) for deep codebase reasoning
- Should be invoked rarely if implementation spec is good
- On FLAG, the orchestrator pauses the feature and asks the user
