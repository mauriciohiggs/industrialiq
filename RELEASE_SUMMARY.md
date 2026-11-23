# Release Summary

## Release candidate

- **Date:** 2026-11-23
- **Branch:** `main`
- **Requested commit:** `feat: mentor gps adaptive and competency intelligence platform`
- **Release scope:** mentor experience, Certification GPS, competency/career intelligence, adaptive and diagnostic engines, analytics, simulation foundation, and canonical platform documentation

## Completed Today

- Added a responsive `#/mentor/*` workspace with overview, readiness, study-plan, skill, and forecast views.
- Integrated saved question and flashcard behavior with skill, competency, certification, and career summaries.
- Added Certification GPS with roadblocks, fastest/alternative routes, route controls, remaining-study estimates, and a planning forecast.
- Added deterministic coaching plus an optional OpenAI-compatible provider with strict schema and resource allow-list validation.
- Added the local-first typed Analytics Service and instrumented mentor, course, module, question, flashcard, and exam events.
- Added competency intelligence with evidence reliability, knowledge decay, confidence, coverage, weakness detection, and review-candidate ranking.
- Added tested adaptive-learning, diagnostic-reporting, and branching-simulation libraries.
- Added a proposed competency intelligence PostgreSQL schema.
- Added the canonical `docs/` source of truth and aligned public documentation with implemented status.

## Known Issues

- The live graph is provisional and category-derived; no bundled question has an explicit reviewed skill mapping.
- Mentor, GPS, career, and readiness values are practice summaries and are not official certification predictions, credentials, or employment decisions.
- The Adaptive Engine exposes an uncalibrated `passProbability` field in engine output. It is not UI-wired and must not be exposed until a validated model and policy gates exist.
- Diagnostic and Adaptive engines are not connected to the application UI or persisted learner state.
- The Simulation Framework has no production scenarios, learner UI, safe sandbox, or durable attempt storage.
- GPS study-distance, gain, and forecast values are heuristic planning estimates.
- Mentor plans and GPS routes are regenerated rather than persisted or completed.
- Optional coaching provider secrets must not be shipped in a production Vite client; a same-origin authenticated proxy is preferred.
- No backend, accounts, PostgreSQL persistence, cloud sync, graph publication, or tenant authorization exists.

## Open Work

- Curate and review skills, competencies, question mappings, proficiency levels, and graph versions.
- Unify competency scoring and learning-path representations across live and engine-only systems.
- Remove or calibrate the Adaptive Engine pass-probability output and connect validated recommendations to the UI.
- Add diagnostic and simulation learner experiences with persistence and provenance.
- Publish versioned graph/content models and connect idempotent evidence services to the proposed schema.
- Persist plan completion and route feedback.
- Move mentor provider transport and secret handling behind a server-side gateway.
- Add citations, consent, retention, evaluation, and observability for provider coaching.
- Add independently authored content versions and reviewed industrial scenarios.

## Architecture Changes

```text
Progress (questions + flashcards)
    |
    v
Industrial Intelligence Adapter
    |
    v
Competency Engine
    +--> Mentor Dashboard --> local/provider coaching
    +--> Career Readiness
    +--> Certification GPS --> route planner + forecast
```

Engine-only additions:

- Diagnostic Engine -> report -> prioritized learning path
- Adaptive Engine -> next action/question/module and competency analysis
- Simulation Engine -> branching sessions, decision records, and summaries

Persistence remains browser-local. Analytics now has a typed, capped local event store and no active remote provider. The PostgreSQL schema and future API/service architecture are documented foundations only.

## Release Validation

- `npm test`: 67 tests passed across 11 test files.
- `npm run lint`: passed.
- `npm run build`: passed with Vite production output.
- Documentation links and `git diff --check`: passed.

## Claim Boundaries

This release does not reproduce an official certification exam, predict a probability of passing, establish qualification, or determine safe operational or employment suitability.
