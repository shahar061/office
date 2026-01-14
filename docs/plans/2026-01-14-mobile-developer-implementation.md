# Mobile Developer Agent Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Mobile Developer agent that consults during `/imagine` boardroom and executes mobile tasks during `/build`.

**Architecture:** New agent file following existing patterns (frontend-engineer.md, backend-engineer.md). Four modifications to existing agents to integrate mobile domain awareness.

**Tech Stack:** Markdown agent definitions (Claude Code plugin format)

---

## Task 1: Create Mobile Developer Agent

**Files:**
- Create: `agents/mobile-developer.md`

**Step 1: Create the agent file**

Create `agents/mobile-developer.md` with this content:

```markdown
---
name: mobile-developer
description: |
  Cross-platform Mobile Developer who consults during Boardroom discussions on platform constraints and executes mobile tasks during /build. Thinks about app store requirements, offline patterns, and cross-platform trade-offs.
model: inherit
---

You are the Mobile Developer of the Office - a pragmatic cross-platform specialist who builds mobile apps that work in the real world.

## Your Role

You consult during Boardroom discussions on mobile platform matters and execute mobile tasks during `/build`.

## Personality

- Platform-aware and pragmatic
- Focused on app store compliance
- Thinks about offline-first patterns
- Framework-agnostic (recommends based on context)
- Risk-focused on what will cause rejection or rework

## Expertise Areas

- React Native and Flutter ecosystems
- App store guidelines (iOS App Store, Google Play)
- Offline-first architecture and sync strategies
- Push notification implementation (APNs, FCM)
- Deep linking and navigation structure
- Cross-platform code sharing strategies

## Framework Recommendations

When consulted on framework choice, consider:
- **React Native** when: existing React codebase, web code sharing needed, team knows JavaScript/TypeScript
- **Flutter** when: complex animations needed, new team, consistent UI across platforms critical

Always explain trade-offs rather than being dogmatic.

## Boardroom Input

When consulted, provide input on:
- App store policy risks (privacy, permissions, content)
- Offline requirements and sync architecture
- Push notification backend requirements
- Deep linking URL scheme design
- Platform-specific constraints (iOS vs Android differences)

## Phrases

- "For mobile, I'd recommend React Native here since your team already knows React..."
- "App Store will require privacy nutrition labels for this - we need to document data collection upfront."
- "If users need this offline, we need a sync strategy. That affects the backend design."
- "That requires background location - Apple is strict about this. Can we use geofencing instead?"
- "Two framework options: React Native for code sharing, Flutter for animation performance. Given your context..."
```

**Step 2: Verify file created**

Run: `ls -la agents/mobile-developer.md`
Expected: File exists with correct permissions

**Step 3: Commit**

```bash
git add agents/mobile-developer.md
git commit -m "feat: add mobile developer agent"
```

---

## Task 2: Update README Team Table

**Files:**
- Modify: `README.md:80-96`

**Step 1: Add Mobile Developer to team table**

In `README.md`, find the team table and add Mobile Developer after Frontend Engineer:

Change from:
```markdown
| Frontend Engineer | UI and state |
| UI/UX Expert | User experience |
```

To:
```markdown
| Frontend Engineer | UI and state |
| Mobile Developer | Cross-platform mobile apps |
| UI/UX Expert | User experience |
```

**Step 2: Update agent count in header**

Change line 3 from:
```markdown
A Claude Code plugin that simulates a 13-agent startup team to transform rough ideas into executable implementation plans.
```

To:
```markdown
A Claude Code plugin that simulates a 14-agent startup team to transform rough ideas into executable implementation plans.
```

**Step 3: Update build executor list**

Change line 96 from:
```markdown
*During /build, Backend Engineer, Frontend Engineer, UI/UX Expert, Data Engineer, Automation Developer, and DevOps execute tasks in their domains.*
```

To:
```markdown
*During /build, Backend Engineer, Frontend Engineer, Mobile Developer, UI/UX Expert, Data Engineer, Automation Developer, and DevOps execute tasks in their domains.*
```

**Step 4: Verify changes**

Run: `grep -n "Mobile Developer" README.md`
Expected: Shows lines with Mobile Developer

**Step 5: Commit**

```bash
git add README.md
git commit -m "docs: add mobile developer to team roster"
```

---

## Task 3: Update Team Lead for Mobile Domain

**Files:**
- Modify: `agents/team-lead.md:63-69`

**Step 1: Add mobile_developer to assignment rules**

In `agents/team-lead.md`, find the Task Assignment Rules section and add mobile_developer:

Change from:
```markdown
## Task Assignment Rules

Assign to appropriate agent:
- **backend_engineer**: API, database, server logic
- **frontend_engineer**: UI components, client state
- **data_engineer**: Data pipelines, analytics
- **automation_developer**: Tests, CI/CD, scripts
- **devops**: Infrastructure, deployment
```

To:
```markdown
## Task Assignment Rules

Assign to appropriate agent:
- **backend_engineer**: API, database, server logic
- **frontend_engineer**: UI components, client state
- **mobile_developer**: Mobile screens, app navigation, platform integrations
- **data_engineer**: Data pipelines, analytics
- **automation_developer**: Tests, CI/CD, scripts
- **devops**: Infrastructure, deployment
```

**Step 2: Verify changes**

Run: `grep "mobile_developer" agents/team-lead.md`
Expected: Shows the new assignment rule

**Step 3: Commit**

```bash
git add agents/team-lead.md
git commit -m "feat(team-lead): add mobile_developer domain"
```

---

## Task 4: Update Chief Architect for Mobile Detection

**Files:**
- Modify: `agents/chief-architect.md:29-36`

**Step 1: Add Mobile Developer to boardroom consultations**

In `agents/chief-architect.md`, find the Boardroom Consultations section and add Mobile Developer:

Change from:
```markdown
## Boardroom Consultations

Consult during design:
- **Backend Engineer**: API design, data storage
- **Frontend Engineer**: Client architecture, state management
- **Data Engineer**: Data models, pipelines
- **DevOps**: Infrastructure, deployment
```

To:
```markdown
## Boardroom Consultations

Consult during design:
- **Backend Engineer**: API design, data storage
- **Frontend Engineer**: Client architecture, state management
- **Mobile Developer**: Mobile platform constraints, app store requirements (when mobile is relevant)
- **Data Engineer**: Data models, pipelines
- **DevOps**: Infrastructure, deployment

When the project involves mobile apps, bring in the Mobile Developer to advise on platform-specific constraints that affect architecture (app store policies, offline sync, push notifications, deep linking).
```

**Step 2: Verify changes**

Run: `grep -A2 "Mobile Developer" agents/chief-architect.md`
Expected: Shows Mobile Developer in consultation list

**Step 3: Commit**

```bash
git add agents/chief-architect.md
git commit -m "feat(chief-architect): add mobile developer to boardroom consultations"
```

---

## Task 5: Update Agent Organizer for Mobile Announcements

**Files:**
- Modify: `agents/agent-organizer.md:61-62`

**Step 1: Add mobile domain to agent dispatch**

In `agents/agent-organizer.md`, the domain-matching is implicit in "Dispatch tasks to domain-matched agents". No code change needed since it already handles any domain dynamically.

However, we should add Mobile Developer to the list of build executors in the announcements. Find line ~61-62 about dispatching agents.

The current agent-organizer already handles domains dynamically. Verify this works by checking the dispatch logic. Since `assigned_agent` in tasks.yaml maps directly to agent names, and `mobile_developer` will be a valid agent name after Task 1, no changes are needed here.

**Step 2: Verify agent file exists**

Run: `ls agents/*.md | wc -l`
Expected: 14 (was 13, now includes mobile-developer.md)

**Step 3: Skip commit (no changes needed)**

Agent Organizer already handles domains dynamically.

---

## Task 6: Final Verification

**Step 1: Verify all agent files**

Run: `ls agents/`
Expected output should include:
```
mobile-developer.md
```

**Step 2: Verify README accuracy**

Run: `grep "14-agent" README.md`
Expected: Shows "14-agent startup team"

**Step 3: Verify team-lead has mobile domain**

Run: `grep "mobile_developer" agents/team-lead.md`
Expected: Shows mobile_developer assignment rule

**Step 4: Verify chief-architect has mobile consultation**

Run: `grep "Mobile Developer" agents/chief-architect.md`
Expected: Shows Mobile Developer in consultations

**Step 5: View git log**

Run: `git log --oneline -5`
Expected: Shows 4 commits for this feature

---

## Summary

| Task | File | Action |
|------|------|--------|
| 1 | `agents/mobile-developer.md` | Create new agent |
| 2 | `README.md` | Add to team table, update count |
| 3 | `agents/team-lead.md` | Add mobile_developer domain |
| 4 | `agents/chief-architect.md` | Add mobile consultation |
| 5 | `agents/agent-organizer.md` | Verify (no changes needed) |
| 6 | All | Final verification |
