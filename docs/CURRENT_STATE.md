# IndustrialIQ Current State

This document records the repository state, not the target architecture.

## Product

- React 19 + TypeScript + Vite static single-page application.
- Node.js 24 is the documented and CI runtime.
- One available course: Industrial Automation / Ignition Core.
- Cybersecurity, Engineering, Manufacturing, SaaS, and other planned domains are placeholders or roadmap content, not implemented courses.
- The application opens on the Mentor route when no hash route is present.

## Shipped learner surfaces

- Overview dashboard
- Mentor: overview, readiness, study plan, skills, and forecast
- Spaced-review flashcards and lightning review
- Quick/category/long practice drills
- Up to 50-question timed or untimed exam exercise
- Searchable learning-question library grouped by nine modules
- Progress analytics and milestones
- JSON progress import/export and reset
- Community/documentation links

## Content

- 72 original questions.
- Nine categories/modules.
- Eight questions in each category.
- Four choices and one original explanation per question.
- 72 question-derived flashcards.
- Zero bundled explicit question-to-skill mappings.
- Official reference links are external; reference text is not copied into the question bank.

## Runtime data

### Progress

Stored in `localStorage` as `ignition-open-study-v1`:

```ts
{
  version: 1,
  cards: Record<string, CardProgress>,
  answers: Answer[],
  activity: string[]
}
```

- Answer history retains the latest 2,000 completed-quiz answers.
- Analytics and topic badges use at most the latest 200 saved answers.
- Flashcard ratings are saved independently and immediately.
- A study day is added for completed quizzes and card ratings.
- Invalid stored data is not automatically overwritten.

### Analytics

Stored separately in `industrialiq-analytics-v1`:

- Bounded to 1,000 local events.
- Uses a 24-hour non-identifying session ID.
- Tracks course/module, mentor, flashcard, question, and exam events.
- No analytics SDK or remote provider is active.

## Intelligence and graph

The live local adapter creates evidence from saved behavior and feeds the competency engine:

- 9 provisional skills from category names
- 5 competencies
- 1 practice certification target
- 6 career paths

The graph is in memory and unversioned. Current question evidence falls back to category-derived skills. The output is shown in the Mentor and Certification GPS.

## System reachability

### Production-reachable

- Question Bank
- Flashcard System
- Competency Engine and live industrial adapter
- Career Mapping calculations
- Certification GPS and Planner
- Mentor dashboard
- Coaching template path and optional configured provider
- Local analytics service

### Implemented but engine-only

- Diagnostic Engine and report
- Adaptive Engine
- Simulation Framework

### Proposed only

- Backend/API services
- Accounts and organizations
- PostgreSQL persistence
- Cloud sync
- Versioned graph/content publication
- Calibrated official certification prediction
- Scenario catalog and safe simulation UI

## Tests and validation gates

The repository includes Vitest coverage for:

- Question bank, quiz creation, grading, missed questions, scheduler, streaks, and analytics
- Progress validation and storage failures
- Competency aggregation, decay, confidence, invalid graph/evidence, and review ranking
- Local progress-to-intelligence integration
- Diagnostic sessions and reports
- Adaptive learning recommendations
- GPS planning and forecasts
- Coaching templates, provider validation, and fallback
- Branching simulation state and scoring

CI runs:

```powershell
npm test
npm run lint
npm run build
```

## Known limitations and risks

1. The live graph is provisional and lacks reviewed question/skill mappings.
2. Diagnostic difficulty is often inferred from question ID suffixes, and no diagnostic UI is wired.
3. The Adaptive Engine is disconnected from live Progress and Mentor flows.
4. The Adaptive Engine computes `passProbability` without calibration; exposing it would violate current product safety decisions.
5. The Simulation Engine has no shipped scenarios or user interface.
6. GPS forecasts are heuristic planning estimates, not validated outcome models.
7. The mentor's seven-day plan is regenerated; completion is not persisted.
8. GPS, Diagnostic, and Mentor path outputs are separate path representations.
9. Coaching secrets placed in Vite client variables are not secure production secrets.
10. The SQL migration is not connected to an application database or service.
11. No learner accounts, cross-device sync, backend authorization, or tenancy exist.
12. Root strategy and migration documents describe some future architecture; use `docs/` for the implemented source of truth.

## Safety and claims boundary

The platform is independent of Inductive Automation. Its quiz, exam exercise, mentor score, GPS, and readiness/career outputs are not official certification results, pass guarantees, credentials, operational authorization, or employment decisions.
