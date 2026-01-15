# Team Lead Prompt Template

Use this template when dispatching the Team Lead agent to create tasks.yaml and 05-implementation-spec.md.

**Purpose:** Break down the plan into executable tasks with TDD implementation steps.

```
Task tool (office:team-lead):
  description: "Create tasks.yaml and implementation spec"
  prompt: |
    You are breaking down the implementation plan into executable tasks.

    ## Plan Content

    Here is the implementation plan. DO NOT read any files - use this content directly.

    [PASTE FULL CONTENT OF docs/office/plan.md]

    ## System Design Reference

    [PASTE FULL CONTENT OF docs/office/04-system-design.md]

    ## Your Job

    Create TWO files:
    1. `docs/office/tasks.yaml` - Machine-readable task manifest
    2. `docs/office/05-implementation-spec.md` - TDD implementation steps

    **You MUST:**
    1. Break each phase into small, executable tasks (5-15 min each)
    2. Define clear acceptance criteria for each task
    3. Assign tasks to appropriate agents (backend_engineer, frontend_engineer, etc.)
    4. Map dependencies between tasks
    5. Write TDD steps for key tasks
    6. Use the Write tool to save BOTH files

    **DO NOT:**
    - Read any files (all content is provided above)
    - Generate content without saving it
    - Create tasks without acceptance criteria
    - Skip using the Write tool for BOTH files
    - Return without confirming both files were written

    ## YAML Safety Rules

    When writing tasks.yaml, you MUST quote strings containing special characters:
    - Curly braces: `{}` → `'Returns {"status": "ok"}'`
    - Square brackets: `[]` → `'Array format [1,2,3]'`
    - Colons followed by space: `: ` → `'Key: value format'`

    ## Output Format: tasks.yaml

    Use Write tool to create `docs/office/tasks.yaml`:

    ```yaml
    version: "1.0"
    project: "[Product Name]"
    features:
      - id: "feature-1"
        name: "[Feature Name]"
        phase: 1
        tasks:
          - id: "task-001"
            description: "[Clear task description]"
            assigned_agent: "backend_engineer"
            dependencies: []
            acceptance_criteria:
              - "[Criterion 1]"
              - "[Criterion 2]"
            tdd_steps:
              - "Write failing test for [behavior]"
              - "Implement [feature]"
              - "Verify test passes"

          - id: "task-002"
            description: "[Next task]"
            assigned_agent: "frontend_engineer"
            dependencies: ["task-001"]
            acceptance_criteria:
              - "[Criterion]"
    ```

    ## Output Format: 05-implementation-spec.md

    Use Write tool to create `docs/office/05-implementation-spec.md`:

    ```markdown
    # Implementation Specification

    ## Task task-001: [Task Title]

    **Files:**
    - Create: `src/path/to/file.ts`
    - Test: `tests/path/to/test.ts`

    **Step 1: Write failing test**
    ```typescript
    describe('[Feature]', () => {
      it('should [behavior]', () => {
        // Test code
      });
    });
    ```

    **Step 2: Run test to verify failure**
    ```bash
    npm test -- --grep "[test name]"
    ```
    Expected: FAIL

    **Step 3: Implement**
    ```typescript
    // Implementation code
    ```

    **Step 4: Verify test passes**
    Expected: PASS

    **Step 5: Commit**
    ```bash
    git add src/ tests/
    git commit -m "feat: [description]"
    ```

    ---

    ## Task task-002: [Next Task]
    ...
    ```

    ## Agent Assignment Guide

    - **backend_engineer**: API routes, database, server logic
    - **frontend_engineer**: UI components, client state, styling
    - **mobile_developer**: Mobile screens, platform integrations
    - **automation_developer**: Tests, CI/CD, scripts
    - **devops**: Infrastructure, deployment

    ## Report

    After using Write tool to save BOTH files, report:
    - File written: docs/office/tasks.yaml
    - File written: docs/office/05-implementation-spec.md
    - Total number of tasks created
    - Tasks per feature/phase breakdown
    - Any complex dependencies noted
```
