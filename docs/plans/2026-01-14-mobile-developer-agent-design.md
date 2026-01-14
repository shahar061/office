# Mobile Developer Agent Design

## Overview

A new agent for the Office virtual startup team specializing in cross-platform mobile development (React Native, Flutter).

**Dual Role:**
1. **Boardroom Consultant** - Advises during `/imagine` on mobile constraints affecting architecture
2. **Build Executor** - Implements mobile tasks during `/build`

## Decisions

| Aspect | Decision |
|--------|----------|
| Role | Boardroom consultant + Build executor |
| Involvement | User-invoked or Chief Architect auto-detection |
| Framework expertise | React Native & Flutter, recommends based on context |
| Boardroom focus | Platform basics (app store, offline, push, deep links) |
| Task routing | Domain inference by Team Lead (`domain: mobile`) |
| Agent coordination | Independent (uses existing boardroom/docs workflow) |

## Involvement Triggers

The Mobile Developer joins boardroom discussions through:

- **User-invoked**: CEO or Product Manager explicitly requests mobile expertise
- **Auto-detected**: Chief Architect recognizes mobile relevance during Architecture phase

## Boardroom Focus

Platform basics that affect architecture decisions:

- App store guidelines (iOS App Store, Google Play policies)
- Offline-first considerations and sync strategies
- Push notification architecture (APNs, FCM)
- Deep linking and navigation structure

Does NOT overlap with UI/UX Expert on design patterns.

## Workflow Integration

### During `/imagine`

When brought in, the Mobile Developer contributes by:

- Flagging app store policy risks early
- Advising on offline architecture
- Raising push notification requirements
- Identifying deep link requirements

Input gets captured in `docs/office/04-system-design.md` by the Chief Architect.

### During `/plan`

Team Lead assigns mobile tasks with `domain: mobile`:

```yaml
- id: task-mobile-001
  title: Implement home screen with product list
  domain: mobile
```

### During `/build`

Mobile Developer picks up tasks where `domain: mobile`, following TDD steps and code review cycles like other engineers.

## Agent Personality

**Persona:** Pragmatic, platform-aware engineer focused on real-world mobile constraints.

**Voice:**
- Practical: "React Native makes sense here since your team already knows React"
- Risk-focused: "App Store will reject this if we don't add the privacy manifest"
- Architecture-aware: "Offline sync adds complexity - do users need this offline?"

**Example Contribution:**

> "Two framework options: React Native to share logic with your React web app, or Flutter for smooth animations. Given your existing React codebase, I'd lean React Native."

## Implementation

### New File

**`agents/mobile-developer.md`**

Agent definition containing:
- Name and description
- Persona: Cross-platform pragmatist thinking about platform constraints
- Expertise: React Native, Flutter, Expo, app store guidelines, offline patterns, push notifications, deep linking
- Boardroom behavior: Raises platform-critical concerns, recommends framework based on context
- Build behavior: Implements mobile features following TDD

### File Modifications

| File | Change |
|------|--------|
| `README.md` | Add Mobile Developer to team table |
| `agents/agent-organizer.md` | Add mobile domain awareness |
| `agents/chief-architect.md` | Add mobile detection logic |
| `agents/team-lead.md` | Add mobile as valid domain |

### No Changes Needed

- Dashboard (handles any domain dynamically)
- Build workflow (domain-based routing works)
- Task schema (domain field exists)

## Out of Scope

- Special inter-agent coordination mechanisms
- File pattern matching for task routing
- Performance or UX pattern expertise (covered by other agents)
- Native-only development focus
