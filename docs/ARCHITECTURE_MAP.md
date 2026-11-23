# IndustrialIQ Architecture Map

## Requested conceptual learning flow

The product vision can be represented as:

```text
Learner
   |
   v
Diagnostic
   |
   v
Competency Engine
   |
   v
Readiness
   |
   v
Certification GPS
   |
   v
Mentor
   |
   v
Career Readiness
   |
   v
Certification Readiness
   |
   v
Adaptive Learning
```

This is **not yet the runtime sequence**. Today Diagnostic and Adaptive Learning are engine-only libraries, and the live application starts from saved quiz/flashcard behavior rather than a diagnostic.

## Actual runtime architecture

```text
Browser / React / Vite
  |
  +-- App.tsx (hash routes and shared Progress state)
  |     |
  |     +-- Dashboard
  |     +-- MentorDashboard
  |     +-- Flashcards
  |     +-- Practice
  |     +-- Analytics
  |     +-- Learning Modules / searchable question bank
  |
  +-- Question content
  |     +-- questions.json
  |     +-- categories.ts
  |     +-- ignitionCoreModules / ignitionCoreCourse
  |
  +-- Learner state
  |     +-- Progress v1 in localStorage
  |     +-- Analytics v1 in localStorage
  |
  +-- Intelligence
  |     +-- industrialIntelligence: Progress -> evidence
  |     +-- competencyEngine: evidence -> skill/competency/readiness
  |     +-- industrialGraph: provisional graph and career/certification mappings
  |
  +-- Guidance
        +-- dashboardData: intelligence -> Mentor UI model
        +-- certificationGps: intelligence -> routes and forecast
        +-- coaching: template or strict optional provider selection
```

## Live learner flow

```text
Learner opens #/mentor or another hash route
                  |
                  v
          App loads Progress v1
                  |
       +----------+-----------+
       |                      |
       v                      v
Question Bank             Existing Progress
       |                  answers + cards + activity
       v                      |
Flashcard / practice UI       |
       |                      |
       +------ saves ---------+
                  |
                  v
        localStorage: ignition-open-study-v1
                  |
                  v
       industrialIntelligence.learningEvidence
                  |
                  v
         calculateCompetencyIntelligence
                  |
        +---------+----------+----------------+
        |                    |                |
        v                    v                v
 Mentor dashboard     Certification GPS   Career readiness
        |
        v
Coaching template or optional provider
```

## Engine-only paths

### Diagnostic

```text
Question sources
     |
     v
createIndustrialDiagnosticQuestions
     |
     v
DiagnosticEngine.next / answer / complete
     |
     v
generateDiagnosticReport
     |
     v
Skill assessments + learningPath
```

No application component imports this path.

### Adaptive Learning

```text
Question history + flashcards + exams + graph + modules
                         |
                         v
                calculateAdaptiveLearning
                         |
             +-----------+-----------+
             |                       |
             v                       v
      next best action     competency/readiness analysis
```

No application component imports this path. Its `passProbability` is uncalibrated and must not be exposed.

### Simulation

```text
SimulationScenario
        |
        v
validateScenario
        |
        v
SimulationEngine.start / decide
        |
        v
SimulationSession + DecisionResult
        |
        v
SimulationSummary
```

No production scenarios or UI exist.

## Persistence boundaries

| Store | Key | Content | Retention |
| --- | --- | --- | --- |
| Progress | `ignition-open-study-v1` | `version`, cards, up to 2,000 answer records, study activity dates | Until browser/site data is cleared or reset |
| Analytics | `industrialiq-analytics-v1` | At most 1,000 typed local events | Rolling event cap |
| Analytics session | `industrialiq-analytics-session-v1` | Non-identifying session ID and expiry | 24 hours |
| Diagnostic sessions | None | Engine state only | Caller memory |
| Adaptive state | None | Recomputed from supplied input | Caller memory |
| Simulation sessions | None | Engine state only | Caller memory |
| Coaching sessions | None | Current request/output only | Current component state |

## External boundaries

### Current

- React assets and fonts are bundled at build time.
- Official Ignition documentation links open a third-party website when selected.
- Optional coaching can call an OpenAI-compatible endpoint configured at build/runtime by Vite variables.
- No analytics provider SDK is active.

### Proposed, not implemented

- Authentication and authorization
- Multi-tenant organization model
- PostgreSQL evidence/graph service
- Cloud progress synchronization
- Model gateway with server-held secrets
- Background analytics/snapshot jobs
- Object storage and scenario labs

The SQL file in `database/` is a design foundation, not a deployed dependency.

## Main dependency graph

```text
questions.json
  -> bank.ts
  -> course.ts modules
  -> Flashcards / Practice / library
  -> industrialIntelligence
        -> competencyEngine
             -> dashboardData
             -> certificationGps
                  -> MentorDashboard

Progress
  -> storage.ts
  -> Flashcards / Practice
  -> industrialIntelligence

MentorDashboard
  -> dashboardData
  -> certificationGps / gpsPlanner / gpsForecast
  -> coaching
```

## Important architectural boundaries

1. `src/lib/study.ts` owns live quiz and flashcard behavior; it is not the same algorithm as the engine-only adaptive review model.
2. `competencyEngine.ts` is the live scoring source for mentor/GPS; `readiness.ts` is an older illustrative complete-input calculator used only by tests.
3. The industrial graph is in memory. There is no database read, publication process, or version negotiation.
4. Categories are UI/content groupings and are currently reused as provisional skills. They must not automatically become curated competencies.
5. Template coaching is the default. Provider coaching only selects supplied resources through a validated strict schema.
6. No score produced in the current client should be represented as an official certification outcome.
