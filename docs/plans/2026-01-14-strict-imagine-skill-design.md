# Design: Minimal Orchestrator for /imagine Skill

## Problem

The `/imagine` skill was being ignored by the assistant. Instead of spawning agents via the Task tool, the assistant:
- Improvised dialogue with made-up experts ("Business Analyst", "UX Designer", "Tech Lead")
- Created documents with wrong names (`01-product-vision.md` instead of `01-vision-brief.md`)
- Roleplayed as multiple experts instead of invoking the defined agents

Root cause: The model reads the entire skill at once and can skip/reorder steps at will. Prompt engineering alone isn't enough - models may "know better" and improvise.

## Solution: Minimal Orchestrator Pattern

Instead of a multi-step skill that the model might skip through, we use a **state machine** that does **ONE action per invocation**.

### How It Works

```
/imagine → Check state → Do ONE action → Update state → STOP
          ↑                                              │
          └──────── User runs /imagine again ───────────┘
```

### State Transitions

| State | Action | Next State |
|-------|--------|------------|
| (no session.yaml) | Create session.yaml | `discovery` |
| `discovery` | Spawn CEO → writes 01-vision-brief.md | `definition` |
| `definition` | Spawn PM → writes 02-prd.md | `validation` |
| `validation` | Spawn Market Researcher → writes 03-market-analysis.md | `architecture` |
| `architecture` | Spawn Chief Architect → writes 04-system-design.md | `complete` |
| `complete` | Commit all docs | (done) |

### Why This Works

1. **Structural enforcement** - Model can only see instructions for current state
2. **No multi-step temptation** - Each section is self-contained with explicit STOP
3. **User-driven progression** - User controls when to advance by re-running command
4. **State verification** - Must read session.yaml before acting

### Trade-offs

- **Pro:** Much harder for model to skip steps or improvise
- **Con:** User must run `/imagine` 6 times to complete all phases
- **Con:** Less "magical" flow - more explicit/mechanical

## Changes Made

- `skills/imagine/SKILL.md` - Complete rewrite as minimal orchestrator

## Testing

Run `/imagine` in a new session and verify:
1. First invocation: Creates session.yaml, tells user to run again
2. Second invocation: Spawns CEO for discovery
3. Each subsequent invocation: One phase at a time
4. Model never does multiple phases in one invocation
