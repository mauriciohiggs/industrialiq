# IndustrialIQ Project Brain

> **Start here.** This directory is the single source of truth for the implemented platform. Read this file before changing product behavior, data models, engines, or user-facing claims.

## Platform in one paragraph

IndustrialIQ is a local-first React/TypeScript learning application. Its shipped course is Industrial Automation / Ignition Core, with 72 original questions grouped into nine modules. The browser application provides question-derived flashcards, spaced review, practice and exam exercises, progress analytics, a competency-driven mentor dashboard, certification GPS planning, and optional structured AI coaching. The current intelligence graph is derived from topic categories and is not a curated, versioned competency model. Diagnostic, adaptive-learning, and branching-simulation engines exist as tested libraries but are not connected to the UI.

## Canonical documentation

| Document | Authority |
| --- | --- |
| [PROJECT_BRAIN.md](PROJECT_BRAIN.md) | System entry point, scope, and update rules |
| [SYSTEM_REGISTRY.md](SYSTEM_REGISTRY.md) | Inventory of every implemented or planned system |
| [ARCHITECTURE_MAP.md](ARCHITECTURE_MAP.md) | Runtime, data flow, and implementation boundaries |
| [KNOWLEDGE_GRAPH.md](KNOWLEDGE_GRAPH.md) | Skills, competencies, careers, certifications, paths, questions, modules, and flashcards |
| [DECISIONS.md](DECISIONS.md) | Durable architectural and product decisions |
| [CURRENT_STATE.md](CURRENT_STATE.md) | Verified repository and release state |
| [ROADMAP.md](ROADMAP.md) | Sequenced work without claims that planned systems exist |

Older root documents such as `INDUSTRIALIQ_STRATEGY.md`, `INDUSTRIALIQ_MIGRATION.md`, `COMPETENCY_INTELLIGENCE_ENGINE.md`, and the root `ROADMAP.md` provide useful design history. When they disagree with this directory, the files in `docs/` describe the repository as it exists now.

## Status vocabulary

Every registry entry uses one of:

- **production**: reachable through the shipped browser application or its persistence/analytics path.
- **in progress**: implemented in part, tested, or present as an engine-only foundation, but not a complete product capability.
- **planned**: represented by models, documentation, or schema only.

Status does not mean that an engine's data or algorithm has been scientifically validated. Production competency, career, readiness, and forecast outputs remain explainable practice summaries, not official certification predictions or proof of qualification.

## Current architecture

```text
Question bank
    |
    +--> Flashcards --> Progress / review state
    |
    +--> Practice and exam exercises --> answer history
                                           |
                                           v
                              Industrial intelligence adapter
                                           |
                                           v
                              Competency / career engine
                                           |
                      +--------------------+--------------------+
                      |                                         |
                      v                                         v
               Mentor dashboard                         Certification GPS
                      |
                      +--> local template coaching
                      +--> optional structured provider coaching
```

The following are **not** in that live path:

- `DiagnosticEngine`
- `AdaptiveCertificationEngine`
- `SimulationEngine`
- PostgreSQL schema in `database/001_competency_intelligence.sql`
- Curated/versioned graph publication and evidence services

## System inventory

| System | Status | Live entry point |
| --- | --- | --- |
| Diagnostic Engine | in progress | Engine and tests only |
| Adaptive Engine | in progress | Engine and tests only |
| Competency Engine | production | Mentor Dashboard and Certification GPS |
| Career Mapping Engine | production | Mentor readiness view |
| Certification GPS | production | Mentor overview |
| Certification Planner | production | GPS fastest/alternative routes |
| Mentor Engine | production | `#/mentor/*` |
| Coaching Layer | production | Local templates; optional OpenAI-compatible provider |
| Analytics Service | production | Learning-event persistence and component event calls |
| Simulation Framework | in progress | Engine and tests only |
| Knowledge Graph | in progress | In-memory industrial graph; no curation/version publication |
| Question Bank | production | All study surfaces |
| Flashcard System | production | `#/flashcards` |
| Learning Path System | in progress | GPS routes and diagnostic report; no persistent path service |

See [SYSTEM_REGISTRY.md](SYSTEM_REGISTRY.md) for source files, tests, inputs, outputs, dependencies, consumers, issues, and expansion.

## Facts that prevent rediscovery

- The platform has one active course: Ignition Core, under Industrial Automation.
- The nine modules are generated from the nine category names in `src/data/categories.ts`.
- All 72 questions also act as flashcards; there is no second 72-card catalog.
- No bundled question currently contains an explicit `skillIds` mapping.
- The industrial intelligence adapter therefore assigns each question's category to one provisional skill ID.
- The active graph contains 9 skills, 5 competencies, 1 practice certification target, and 6 career paths.
- Progress is browser-local under `ignition-open-study-v1`; analytics uses `industrialiq-analytics-v1`.
- The app has no backend, accounts, cloud sync, or tenant model.
- The mentor can make optional client-side OpenAI-compatible chat-completions requests when Vite environment variables configure a provider. Otherwise it uses deterministic local coaching.
- No external analytics provider or SDK is currently enabled.
- Readiness and forecast values are learning plans or evidence-coverage summaries, never official pass probabilities.
- The Adaptive Engine currently contains an unused `passProbability` output that should not be exposed to users without calibration and the product's validation gates.

## Development and release gates

```powershell
npm ci
npm test
npm run lint
npm run build
```

CI runs the same test, lint, and build commands on Node.js 24.

## Documentation update contract

When changing behavior:

1. Update the registry entry and mark the live consumers.
2. Update the architecture map if data crosses a new boundary.
3. Update the knowledge graph for every new node type or relationship.
4. Record durable tradeoffs in `DECISIONS.md`.
5. Update `CURRENT_STATE.md`; do not merely change a roadmap promise.
6. Keep `README.md` aligned with reachable product behavior.
7. Run test, lint, and build gates.

## Safe claims

Preferred:

- "Practice readiness"
- "Evidence coverage"
- "Learning plan"
- "Estimated study distance"
- "Provisional competency summary"

Do not claim:

- "Official certification score"
- "Probability of passing"
- "Proof of competence or qualification"
- "Safe to operate equipment"
- "Employment suitability"
