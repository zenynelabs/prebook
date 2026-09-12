# AGENTS.md

## The project

**Prebook — preebooking.com.** One website hosting three business sections —
Crackers, Clothing and Real Estate — with one customer login and one admin
panel. Client: Mr. Nambi, Prebooking, Tirunelveli. Provider: Zenyne Labs.

| | |
| --- | --- |
| Total cost | **₹21,000** |
| Timeline | **4 weeks** from kickoff |
| Payments in build | Cash on Delivery / offline only — **no gateway** |
| Stack | TanStack Start · Hono (Bun) · MongoDB Atlas via Prisma · Better Auth · Cloudflare R2 |

> ### [`docs/INVOICE-SUMMARY.txt`](docs/INVOICE-SUMMARY.txt) is the single source of truth.
>
> Scope, quotation, timeline, terms and build status all live there, and **Section 4
> of it is the final agreed scope**. Read it before starting any task. If this file,
> the README, or anything a user says in passing disagrees with it, that document
> wins — or the scope has genuinely changed and needs to be quoted separately.

Facts that bind every task:

- **Money is integer paise.** Never store or compute a price, total, GST amount
  or discount as a float.
- **Seller contact details are server-side only.** A phone number must never be
  serialised into any buyer-facing response, API payload or rendered page.
- **Property listings are gated.** Nothing is publicly visible until an admin
  approves it.
- **No payment gateway.** Orders carry `paymentMethod` + `paymentStatus` so a
  gateway can be added later as a separately quoted module — do not wire one in.
- **Prisma is pinned to 6.19.3.** Prisma 7 dropped MongoDB support. Keep the pin.
- **Real Estate has no data model yet.** Property, PropertyImage, VisitRequest
  and Seller do not exist. Building them is real work, not a schema tweak.
- **Nothing is deployable yet.** `DATABASE_URL`, Google OAuth credentials and
  the R2 bucket details have never been supplied by the client.

### Repository state

There is **no application code on disk**. `apps/` and the earlier Next.js
`store/` build have both been removed, and git was re-initialised from scratch
on 12 Sep 2026 — `main` holds a single "first commit" containing only
`README.md`, tracking `git@github.com:zenynelabs/prebook.git`. The earlier
history is gone and nothing in it is recoverable. `package.json` still declares
a Bun workspace at `apps/*`, so `bun run dev` fails until `apps/web` exists.

Almost nothing is committed yet, so git is not yet a safety net: before
deleting or overwriting anything, look at it first, and copy it somewhere safe
if it cannot be regenerated.

---

## Design rules

**No design system is locked yet.** The client has not supplied a logo or a
colour preference — that is item 2 of Section 11 in the plan, due at kickoff.
Until it arrives the working default is the clean festive theme named in the
plan (red, cream, gold). Do not invent a brand, and do not resurrect tokens
from a deleted document or another project.

What holds regardless of the palette:

1. **Zero unwanted chips and badges.** Never add marketing chips, promotional
   badges or redundant indicators to functional surfaces — auth, checkout,
   dashboard, settings.
2. **No redundant state indicators.** Never duplicate information that is
   already on screen, such as a "Customer" chip beside a role tab that already
   shows the role.
3. **No marketing copy on functional screens.** Landing-page slogans and
   promotional checklists do not belong on login, register or checkout.
4. **Generous sizing.** Functional cards should be comfortably scaled rather
   than tiny (`max-w-[480px]`–`max-w-[500px]`, `p-8 sm:p-10`); inputs and
   buttons need real touch heights (`h-13`/`h-14`) and readable `text-base`.
5. **Mobile-first and consistent.** Phone, tablet and desktop all matter, and
   one surface never mixes two shape languages — pick pill or boxy per element
   class and hold it across the app.

---

## Core Workflow

Whenever the user provides a plan, requirement, idea, or task, follow this workflow:

```text
UNDERSTAND
    ↓
THINK
    ↓
PLAN
    ↓
DELEGATE
    ↓
EXECUTE
    ↓
INTEGRATE
    ↓
VERIFY
    ↓
DELIVER
```

Never immediately start changing files without first understanding the task and deciding how it should be approached.

---

## 1. Understand

First, determine:

- What is the user actually trying to build?
- What is the expected final output?
- What files need to be created or modified?
- What constraints did the user specify?
- What existing project structure or conventions must be preserved?
- Which parts of the task are independent?
- Which parts depend on other parts?
- What decisions need to be made before implementation?

Do not invent requirements unnecessarily.

If something is ambiguous but does not block progress, make a sensible engineering decision and continue.

If something genuinely blocks implementation, ask the user before proceeding.

---

## 2. Think Before Acting

Before executing, mentally create a high-level implementation strategy.

Identify:

- Architecture
- Components or modules
- Dependencies
- Data flow
- UI/UX requirements
- Technical risks
- Testing requirements
- Tasks suitable for parallel execution

The goal is not to over-plan.

Create enough structure to prevent wasted work and conflicting implementations.

---

## 3. Create or Update the Plan

The commercial plan already exists and is fixed: `docs/INVOICE-SUMMARY.txt`.
**Do not create competing plan documents.** No `plan.md`, no `design.md`, no
`BUILD_PLAN.md` — those were deliberately removed, and re-creating them is how
the repository ended up with four contradictory scopes and three different
prices.

Track execution in the session itself (a todo list), not in new files. Where a
decision genuinely needs to persist, it belongs in `AGENTS.md` or the README,
next to the facts it affects.

Still think the work through before touching files. Decide, for the task at hand:

- Objective and constraints, checked against Section 4 of the plan
- Architecture and data flow
- Implementation phases
- Sub-agent responsibilities and dependencies between them
- Integration and verification strategy

That reasoning must explicitly describe how sub-agents will participate.

Example:

```text
Phase 1 - Discovery
    Main Agent

Phase 2 - Parallel Work
    ├── UI/UX Agent
    ├── Frontend Agent
    ├── Logic Agent
    └── Review Agent

Phase 3 - Integration
    Main Agent

Phase 4 - Verification
    Main Agent + Review Agent
```

If the work turns out to fall outside Section 4 of the plan, stop and say so.
Scope changes are quoted separately — they are not absorbed silently.

---

# Sub-Agent Orchestration

## General Rule

Use sub-agents whenever a task contains multiple independent areas of work.

The main agent should delegate work that can be performed independently and then integrate the results.

Do not delegate everything blindly.

The main agent remains responsible for:

- Overall architecture
- Task decomposition
- Delegation
- Context management
- Decisions
- Integration
- Conflict resolution
- Final quality
- Final verification

Sub-agents are workers within the architecture, not independent project owners.

---

## Parallel Execution

Whenever possible, execute independent sub-agent tasks in parallel.

For example:

```text
                    Main Agent
                        │
                 Task Decomposition
                        │
          ┌─────────────┼─────────────┐
          ↓             ↓             ↓
       Agent A       Agent B       Agent C
       UI/UX         Frontend       Logic
          │             │             │
          └─────────────┼─────────────┘
                        ↓
                 Main Agent
                   Integration
                        ↓
                     Review
```

Do not run tasks sequentially when they have no dependency on one another.

However, respect dependencies.

For example:

```text
Design → Frontend → Integration
```

should not be treated as fully parallel if the frontend implementation genuinely depends on the design decisions.

---

# Context Management

Context quality is critical.

Every sub-agent must receive enough information to perform its task correctly.

Before delegating, provide:

- Project objective
- Relevant requirements
- Relevant constraints
- Existing implementation context
- Expected output
- Files it may modify
- Files it must not modify
- Dependencies on other agents
- Important architectural decisions

Do not send vague instructions such as:

> "Build the UI."

Instead provide meaningful context:

> "Build the responsive coffee shop UI based on the project requirements. The final application must remain a single HTML file. Focus on visual hierarchy, responsive layout, typography, spacing, menu cards, hero section, and reusable CSS patterns. Do not modify JavaScript behavior."

---

## Avoid Context Pollution

Sub-agents should only receive context relevant to their task.

Do not dump the entire project history into every sub-agent.

Use:

```text
Relevant Context
    ↓
Task-specific Requirements
    ↓
Expected Output
    ↓
Constraints
```

This keeps agents focused and reduces conflicting assumptions.

---

# Ownership Rules

Every task should have a clear owner.

Example:

```text
UI/UX
Owner: UI Agent

Frontend
Owner: Frontend Agent

Interactions
Owner: Logic Agent

Final Integration
Owner: Main Agent

Final Verification
Owner: Main Agent + Review Agent
```

Avoid having multiple agents independently modify the same file unless explicitly coordinated.

If multiple agents need to work on the same artifact, establish clear boundaries first.

---

# Shared Files

Treat shared files as protected resources.

Before modifying a shared file, determine:

1. Who owns the file?
2. Which agent is currently modifying it?
3. Can the work be isolated?
4. Can the work happen in a separate file first?
5. Does the main agent need to perform the final merge?

Prefer isolated outputs whenever practical. In this project the contended
files are the Prisma schema, the Hono router, the Better Auth config and the
Tailwind theme — everything three sections share. Give each agent its own
route and component files and let the main agent make the one merge:

```text
Crackers Agent
    → routes/crackers/*, components/crackers/*

Clothing Agent
    → routes/clothing/*, components/clothing/*

Real Estate Agent
    → routes/property/*, components/property/*

Main Agent
    → merges the models each one needs into prisma/schema.prisma
      and mounts their routes on the Hono app
```

That is far safer than three agents editing `schema.prisma` at once. Note the
outputs are code, not documents — see §3: do not spin up spec or plan files.

---

# Sub-Agent Instructions

Every sub-agent should:

1. Understand its assigned responsibility.
2. Inspect relevant existing files before making assumptions.
3. Follow project conventions.
4. Avoid modifying unrelated files.
5. Avoid duplicating work assigned to another agent.
6. Clearly report what it changed.
7. Clearly report assumptions or unresolved issues.
8. Provide useful output for the main agent to integrate.
9. Validate its own work before finishing.

Sub-agents should not make major architectural decisions that conflict with the main plan without reporting the conflict.

---

# Main Agent Integration

After sub-agents finish, the main agent must review their outputs before integration.

Do not blindly accept sub-agent results.

For each result, ask:

- Does this satisfy the requirement?
- Does it conflict with another agent's work?
- Does it follow the architecture?
- Does it introduce unnecessary complexity?
- Is it compatible with the existing implementation?
- Is anything missing?

Then integrate the best results into the project.

The main agent has final authority over implementation decisions.

---

# Conflict Resolution

If two sub-agents produce conflicting solutions:

1. Compare them against the original requirements.
2. Prefer the solution that best fits the architecture.
3. Prefer simpler solutions when functionality is equivalent.
4. Preserve existing project conventions.
5. Avoid unnecessary rewrites.
6. Document the decision when the conflict is significant.

Never merge conflicting implementations blindly.

---

# Verification

Before considering the task complete, verify:

### Functionality

- Required functionality works.
- User interactions behave correctly.
- No obvious runtime errors exist.
- Edge cases are considered.

### UI

- Layout is responsive.
- Content hierarchy is clear.
- Spacing is consistent.
- Typography is readable.
- Interactive elements behave correctly.
- Mobile layout has been considered.

### Code Quality

- No unnecessary duplication.
- No dead code.
- No accidental debug output.
- No broken references.
- No obvious architectural problems.

### Requirements

Compare the final implementation against the original user request and
Section 4 of `docs/INVOICE-SUMMARY.txt`.

Do not rely only on the sub-agents' claims that their work is complete.

---

# Final Review Loop

For larger tasks, use a dedicated review pass.

```text
Implementation Complete
        ↓
      Review
        ↓
 ┌──────┴──────┐
 ↓             ↓
Problems?      Good
 ↓             ↓
Fix            Finalize
 ↓
Verify Again
```

If significant issues are discovered, fix them and run verification again.

Do not stop immediately after the first successful implementation.

---

# Communication

The main conversation should stay clean.

Do not expose unnecessary internal orchestration details to the user unless they ask for them.

Prefer concise progress updates such as:

```text
Planning the implementation first, then I'll split the independent work across sub-agents and integrate the results.
```

or:

```text
The parallel work is complete. I'm integrating the outputs now and running a final verification pass.
```

The user should primarily see:

- What is being built
- Important decisions
- Meaningful progress
- Final result
- Important caveats

Not a wall of internal agent chatter.

---

# Quality Over Speed

Parallelism is useful, but correctness comes first.

Do not create sub-agents simply to increase the number of agents.

Use sub-agents when they provide one or more of:

- Parallel execution
- Specialized expertise
- Independent review
- Better context isolation
- Reduced main-session complexity

A small task may require only one agent or no sub-agent at all.

A large task may require several specialized agents.

Choose the smallest effective team.

---

# Default Agent Roles

Use these roles when appropriate:

### Planner Agent

Responsible for:

- Breaking down complex requirements
- Identifying dependencies
- Suggesting architecture
- Identifying parallelizable work

### UI/UX Agent

Responsible for:

- Visual design
- Layout
- Typography
- Responsive behavior
- Interaction patterns
- Accessibility considerations

### Frontend Agent

Responsible for:

- Component structure
- HTML
- CSS
- Frontend implementation
- Responsive behavior

### Logic Agent

Responsible for:

- JavaScript
- State
- User interactions
- Data handling
- Application behavior

### Backend Agent

Responsible for:

- APIs
- Database logic
- Authentication
- Server-side functionality
- Integrations

### Testing Agent

Responsible for:

- Finding bugs
- Testing edge cases
- Regression checks
- Requirement verification

### Review Agent

Responsible for:

- Code review
- Architecture review
- UI review
- Performance review
- Accessibility review
- Final recommendations

Only use roles relevant to the task.

---

# Preferred Execution Pattern

For most substantial projects, use this pattern:

```text
1. Read the user's request
2. Inspect the existing project
3. Understand requirements
4. Think through architecture
5. Check the task against Section 4 of docs/INVOICE-SUMMARY.txt
6. Identify independent tasks
7. Spawn appropriate sub-agents
8. Run independent tasks in parallel
9. Collect their outputs
10. Review their results
11. Resolve conflicts
12. Integrate into the main project
13. Run tests/review
14. Fix discovered issues
15. Verify against Section 4 of docs/INVOICE-SUMMARY.txt
16. Deliver the final result
```

---

# Important Principle

The main agent is the orchestrator.

Sub-agents provide specialized execution.

The final product belongs to the main agent.

Never confuse delegation with responsibility.

The main agent must always understand what is being built, why it is being built, how the pieces fit together, and whether the final result actually satisfies the user's request.
