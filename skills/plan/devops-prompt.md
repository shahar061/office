# DevOps Prompt Template

Use this template when dispatching the DevOps agent to add environment setup to plan.md.

**Purpose:** Add environment setup, CI/CD, and deployment documentation to the plan.

```
Task tool (office:devops):
  description: "Add environment setup to plan.md"
  prompt: |
    You are adding environment and deployment documentation to the implementation plan.

    ## Current Plan

    Here is the current plan.md content. DO NOT read the file - use this content directly.

    [PASTE FULL CONTENT OF docs/office/plan.md]

    ## System Design Reference

    [PASTE FULL CONTENT OF docs/office/04-system-design.md - focus on Tech Stack section]

    ## Your Job

    Add an Environment & Deployment section to plan.md.

    **You MUST:**
    1. Read the tech stack from System Design
    2. Create environment setup instructions
    3. Define CI/CD pipeline stages
    4. Document deployment process
    5. Use the Edit tool to APPEND to `docs/office/plan.md`

    **DO NOT:**
    - Read any files (all content is provided above)
    - Overwrite existing plan content (use Edit to append)
    - Skip using the Edit tool
    - Return without confirming the file was updated

    ## Content to Add

    Use the Edit tool to append this section to the END of `docs/office/plan.md`:

    ```markdown
    ## Environment Setup

    ### Prerequisites
    - [Runtime] (version X.X+)
    - [Package manager]
    - [Database] (if applicable)
    - [Other tools]

    ### Local Development Setup

    ```bash
    # Clone and install
    git clone [repo]
    cd [project]
    [install command]

    # Environment variables
    cp .env.example .env
    # Edit .env with your values

    # Database setup (if applicable)
    [database commands]

    # Start development server
    [dev command]
    ```

    ### Environment Variables

    | Variable | Description | Example |
    |----------|-------------|---------|
    | `DATABASE_URL` | Database connection | `postgresql://...` |
    | `API_KEY` | External API key | `sk-...` |

    ## CI/CD Pipeline

    ### Stages
    1. **Lint & Type Check**: `[lint command]`
    2. **Test**: `[test command]`
    3. **Build**: `[build command]`
    4. **Deploy**: [deployment target]

    ### Branch Strategy
    - `main`: Production deployments
    - `develop`: Staging deployments
    - `feature/*`: Development branches

    ## Deployment

    ### Production
    - Platform: [Vercel/Railway/AWS/etc.]
    - URL: [production URL pattern]
    - Deploy: [deploy command or "automatic on push to main"]

    ### Staging
    - Platform: [same or different]
    - URL: [staging URL pattern]
    ```

    ## Report

    After using Edit tool to update the file, report:
    - File updated: docs/office/plan.md
    - Environment section added with:
      - Prerequisites listed
      - Local setup commands
      - Environment variables documented
      - CI/CD pipeline defined
      - Deployment process documented
```
