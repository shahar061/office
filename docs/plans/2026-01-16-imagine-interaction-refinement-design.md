# /imagine Interaction Refinement - Design

## Problem

The current `/imagine` command has inconsistent interaction patterns across agents. All agents use one-question-at-a-time dialogue, but this isn't optimal for every phase:
- Market Researcher doesn't need user input (just research)
- Product Manager could be faster with batched questions
- Chief Architect needs structured decisions about tech stack autonomy

## Solution

Refine each agent's interaction pattern to match its purpose:

| Agent | Interaction Style |
|-------|------------------|
| CEO | One question at a time (unchanged) |
| Product Manager | Conditional: autonomous or 2-3 questions per batch |
| Market Researcher | Non-interactive: intro → research → summary |
| Chief Architect | Conditional: tech stack autonomy + budget first, then either autonomous or one-at-a-time with recommendations |

## Design

### CEO (No Change)

Keeps current exploratory dialogue - one question at a time about problem, users, vision.

### Product Manager

**Opening question:**
```
"I've read the Vision Brief. Would you like me to:
A) Draft the PRD based on the vision (you'll review at the end)
B) Work through it together (2-3 questions at a time)"
```

**If A (autonomous):**
- Reads 01-vision-brief.md
- Infers personas, priorities, scope
- Writes 02-prd.md
- Shows: "Here's the PRD I drafted. Does this capture it?"

**If B (collaborative):**
Batched questions by topic:

Batch 1 - Users:
- Who is the primary user persona?
- What's their main goal?
- Any secondary users?

Batch 2 - Features:
- Must-have features for v1?
- What's out of scope?
- Technical constraints?

Batch 3 - Edge cases (if needed):
- Specific edge case handling
- Compliance/accessibility requirements

Adapts based on answer depth - skips batches if already covered.

### Market Researcher

**Opening (announcement only):**
```
"I'll research the market landscape for [product area].
Give me a moment to analyze competitors and trends..."
```

**Runs autonomously:**
- Reads 01-vision-brief.md and 02-prd.md
- Uses WebSearch for competitors, market size, trends
- Identifies gaps and USP
- Writes 03-market-analysis.md

**Closing (summary):**
```
"Here's what I found:
- Main competitors: [X, Y, Z]
- Market opportunity: [insight]
- Recommended USP: [one liner]

Full analysis saved. Ready for Chief Architect."
```

No back-and-forth needed.

### Chief Architect

**Phase 1 - Opening questions:**
```
"Before I design the system:

1. Tech stack approach:
   A) You decide - I'll choose based on requirements (Recommended)
   B) Let's decide together - I'll walk you through options

2. Infrastructure budget:
   A) Minimal ($0-50/mo) - Free tiers, serverless
   B) Moderate ($50-200/mo) - Small managed services
   C) Flexible ($200+/mo) - Best tool for the job
   D) Not sure yet - I'll optimize for cost-efficiency"
```

**If "You decide":**
- Reads all docs, picks stack based on requirements + budget
- Writes 04-system-design.md
- Shows: "I chose [stack] because [reasons]. Here's the architecture."

**If "Let's decide together":**
One question at a time with recommendations:
```
"For the database, I'd recommend:
A) PostgreSQL (Recommended) - Relational, great for [need]
B) MongoDB - Flexible schema
C) SQLite - Simple, free, MVP-friendly

What's your preference?"
```

Continues through: frontend, hosting, auth, real-time (if applicable).

## File Changes

**Modified:** `skills/imagining/SKILL.md`
- Update Product Manager prompt (~15 lines)
- Simplify Market Researcher prompt (~10 lines)
- Expand Chief Architect prompt (~25 lines)

## Benefits

1. **Faster iterations** - PM batching and Market Researcher autonomy reduce round-trips
2. **User control where it matters** - Tech stack decisions remain collaborative when wanted
3. **Consistent with agent roles** - Researcher researches, Architect architects
4. **Flexibility** - Users can choose autonomous or collaborative for PM and Architect
