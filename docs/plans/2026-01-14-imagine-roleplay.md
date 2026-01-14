# Immersive Role-Play for /imagine - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace subagent spawning in /imagine with direct role-play so users talk TO characters instead of through a routing system.

**Architecture:** Rewrite `commands/imagine.md` as a role-play orchestrator with inline character guidelines. Claude becomes each character (CEO, PM, Market Researcher, Chief Architect) directly in the conversation. Session state tracking via `session.yaml` remains for resume capability.

**Tech Stack:** Markdown (Claude Code plugin command format)

---

## Task 1: Read Current Implementation

**Files:**
- Read: `commands/imagine.md`
- Read: `agents/ceo.md`
- Read: `agents/product-manager.md`
- Read: `agents/market-researcher.md`
- Read: `agents/chief-architect.md`

**Step 1: Read and understand current structure**

Read all files to understand:
- Current session.yaml structure
- Document templates for each phase
- Any edge cases handled

**Step 2: Note key elements to preserve**

Document:
- session.yaml fields
- Document output paths
- Phase transition logic

---

## Task 2: Write CEO Character Section

**Files:**
- Modify: `commands/imagine.md`

**Step 1: Write CEO role-play block**

Replace the agent routing with inline character guidance:

```markdown
## Discovery Phase (CEO)

**Become the CEO. Speak directly to the user.**

Open with:
> I lead Discovery - I'll help turn your rough idea into a clear vision.
> What problem are you trying to solve?

**How to engage:**
- Ask ONE question at a time
- Adapt based on how much detail the user provides
- Dig deeper on: the problem, target users, success criteria
- Keep it conversational, not interrogative

**When you understand the idea:**
1. Use Write tool to create `docs/office/01-vision-brief.md` with this structure:

   ```markdown
   # Vision Brief: [Product Name]

   ## The Problem
   [What problem does this solve? Who has this problem?]

   ## The Vision
   [What does success look like?]

   ## Target Users
   [Who is this for? Be specific.]

   ## Core Value Proposition
   [Why use this over alternatives?]

   ## Key Capabilities
   [3-5 must-have capabilities]

   ## Success Criteria
   [How do we know if this succeeds?]
   ```

2. Show it to the user: "Does this capture your vision?"

3. When confirmed, update `session.yaml`: set `current_phase: "definition"`

4. Hand off naturally:
   > Vision's clear. The PM will take it from here.

Then immediately continue as the Product Manager (next section).
```

**Step 2: Verify structure**

Ensure the block is self-contained with:
- Opening line
- Engagement guidance
- Document template
- Handoff line

---

## Task 3: Write Product Manager Character Section

**Files:**
- Modify: `commands/imagine.md`

**Step 1: Write PM role-play block**

```markdown
## Definition Phase (Product Manager)

**Become the Product Manager. Speak directly to the user.**

Open with:
> I'm taking over for Definition. I'll translate this vision into concrete requirements.

**How to engage:**
- Reference what you learned as CEO (you have full context)
- Focus on: target users, must-have vs nice-to-have, success metrics
- Ask ONE question at a time
- Validate understanding before moving on

**When requirements are clear:**
1. Use Write tool to create `docs/office/02-prd.md` with this structure:

   ```markdown
   # Product Requirements: [Product Name]

   ## Overview
   [Brief description from vision]

   ## Target Users
   ### Primary
   [Main user persona with goals and pain points]

   ### Secondary
   [Other users if applicable]

   ## Functional Requirements

   ### Must Have (P0)
   - [Requirement 1]
   - [Requirement 2]

   ### Should Have (P1)
   - [Requirement 1]

   ### Nice to Have (P2)
   - [Requirement 1]

   ## Non-Functional Requirements
   - Performance: [expectations]
   - Security: [requirements]
   - Scalability: [needs]

   ## Success Metrics
   - [Metric 1: target]
   - [Metric 2: target]

   ## Out of Scope
   - [What this is NOT]
   ```

2. Show it to the user: "Does this cover the key requirements?"

3. When confirmed, update `session.yaml`: set `current_phase: "validation"`

4. Hand off:
   > Requirements locked. Market Researcher will analyze the landscape.

Then immediately continue as the Market Researcher (next section).
```

---

## Task 4: Write Market Researcher Character Section

**Files:**
- Modify: `commands/imagine.md`

**Step 1: Write Market Researcher role-play block**

```markdown
## Validation Phase (Market Researcher)

**Become the Market Researcher. Speak directly to the user.**

Open with:
> I'll research the market and competition for this. Give me a moment...

**No questions needed.** Work independently using:
- WebSearch for market data and competitors
- WebFetch for detailed competitor analysis

**Create the analysis:**
1. Use Write tool to create `docs/office/03-market-analysis.md`:

   ```markdown
   # Market Analysis: [Product Name]

   ## Market Overview
   [Size, growth, trends]

   ## Competitive Landscape

   ### Direct Competitors
   | Competitor | Strengths | Weaknesses | Positioning |
   |------------|-----------|------------|-------------|
   | [Name] | | | |

   ### Indirect Competitors
   [Alternative solutions users might use]

   ## Market Opportunity
   [Gap in market this product fills]

   ## Risks
   - [Risk 1]
   - [Risk 2]

   ## Recommendations
   [Key insights for positioning]
   ```

2. Summarize briefly (2-3 sentences):
   > Done. Here's what I found: [key insight about market/competition]

3. Update `session.yaml`: set `current_phase: "architecture"`

4. Hand off:
   > Analysis complete. Chief Architect will design the system.

Then immediately continue as the Chief Architect (next section).
```

---

## Task 5: Write Chief Architect Character Section

**Files:**
- Modify: `commands/imagine.md`

**Step 1: Write Chief Architect role-play block**

```markdown
## Architecture Phase (Chief Architect)

**Become the Chief Architect. Speak directly to the user.**

Open with ONE question:
> Any technologies you want me to use, or should I choose what fits best?

**After user responds:**
- If they have preferences: incorporate them
- If "your call" or similar: choose appropriate stack

Say:
> Got it. Designing the system now...

**Create the design:**
1. Use Write tool to create `docs/office/04-system-design.md`:

   ```markdown
   # System Design: [Product Name]

   ## Architecture Overview
   [High-level description with diagram if helpful]

   ## Tech Stack
   | Layer | Technology | Rationale |
   |-------|------------|-----------|
   | Frontend | | |
   | Backend | | |
   | Database | | |
   | Infrastructure | | |

   ## System Components

   ### [Component 1]
   - Purpose:
   - Responsibilities:
   - Interfaces:

   ### [Component 2]
   ...

   ## Data Model
   [Key entities and relationships]

   ## API Design
   [Key endpoints or interfaces]

   ## Security Considerations
   - Authentication:
   - Authorization:
   - Data protection:

   ## Scalability
   [How system handles growth]

   ## Implementation Notes
   [Key decisions, trade-offs, recommendations for implementation]
   ```

2. Update `session.yaml`: set `status: "imagine_complete"`, `current_phase: "complete"`

3. Close the /imagine phase:
   > Architecture complete. Run `/plan` when you're ready.
```

---

## Task 6: Write Session Management Section

**Files:**
- Modify: `commands/imagine.md`

**Step 1: Write session check and routing**

At the top of the command, add:

```markdown
# /imagine - Transform Ideas into Designs

## Before Starting

**Step 1: Check for existing session**

```bash
ls docs/office/session.yaml 2>/dev/null && echo "EXISTS" || echo "NOT_EXISTS"
```

**If NOT_EXISTS:**
1. Create the session:
   ```bash
   mkdir -p docs/office
   ```
2. Use Write tool to create `docs/office/session.yaml`:
   ```yaml
   created: [ISO timestamp]
   updated: [ISO timestamp]
   status: in_progress
   current_phase: discovery
   ```
3. Then start the Discovery phase below.

**If EXISTS:**
1. Read `docs/office/session.yaml`
2. Check `current_phase` and jump to that section:
   - `discovery` → Discovery Phase (CEO)
   - `definition` → Definition Phase (Product Manager)
   - `validation` → Validation Phase (Market Researcher)
   - `architecture` → Architecture Phase (Chief Architect)
   - `complete` → Say "Design complete. Run `/plan` to continue."

---

## The Conversation

You will role-play four characters in sequence. Stay in character. Speak directly to the user - no meta-commentary like "The CEO is asking..."
```

---

## Task 7: Write Completion Section

**Files:**
- Modify: `commands/imagine.md`

**Step 1: Add completion handling**

At the end, add:

```markdown
## When All Phases Complete

After the Chief Architect finishes:

1. Commit all documents:
   ```bash
   git add docs/office/
   git commit -m "docs: complete /imagine design phase"
   ```

2. The user should run `/plan` next.
```

---

## Task 8: Assemble Final Command

**Files:**
- Modify: `commands/imagine.md`

**Step 1: Combine all sections**

Assemble the complete `commands/imagine.md` with:
1. YAML frontmatter (description)
2. Session management section
3. CEO section
4. Product Manager section
5. Market Researcher section
6. Chief Architect section
7. Completion section

**Step 2: Review for consistency**

Check:
- All handoffs flow naturally
- Session.yaml updates are consistent
- Document paths are correct
- No references to Task tool or subagents

**Step 3: Commit**

```bash
git add commands/imagine.md
git commit -m "feat: rewrite /imagine as immersive role-play

Replace subagent spawning with direct role-play. Users now talk
TO characters (CEO, PM, Market Researcher, Architect) instead of
through a routing system."
```

---

## Task 9: Update Agent Files

**Files:**
- Modify: `agents/ceo.md`
- Modify: `agents/product-manager.md`
- Modify: `agents/market-researcher.md`
- Modify: `agents/chief-architect.md`

**Step 1: Add deprecation notice to each**

Add to top of each file:

```markdown
> **Note:** This agent is no longer spawned during /imagine.
> The /imagine command now uses direct role-play.
> This file is kept for reference and potential use in /plan or /build consultations.
```

**Step 2: Commit**

```bash
git add agents/ceo.md agents/product-manager.md agents/market-researcher.md agents/chief-architect.md
git commit -m "docs: mark /imagine agents as reference-only"
```

---

## Task 10: Test the Flow

**Step 1: Manual test**

Run `/imagine` and verify:
- [ ] No "launching agent" messages appear
- [ ] CEO speaks directly with introduction
- [ ] Questions come one at a time
- [ ] Handoffs feel natural
- [ ] All 4 documents are created
- [ ] Session resumption works (stop mid-flow, run `/imagine` again)

**Step 2: Document any issues**

If issues found, fix and commit before proceeding.

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Read current implementation | commands/imagine.md, agents/*.md |
| 2 | Write CEO section | commands/imagine.md |
| 3 | Write PM section | commands/imagine.md |
| 4 | Write Market Researcher section | commands/imagine.md |
| 5 | Write Chief Architect section | commands/imagine.md |
| 6 | Write session management | commands/imagine.md |
| 7 | Write completion section | commands/imagine.md |
| 8 | Assemble and commit | commands/imagine.md |
| 9 | Update agent files | agents/*.md |
| 10 | Test the flow | - |
