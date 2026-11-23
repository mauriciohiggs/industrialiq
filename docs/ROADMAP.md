# IndustrialIQ Roadmap

This roadmap sequences verified work. It does not imply dates, external validation, or that a listed capability already exists.

## Current production baseline

Keep these behaviors stable:

- 72 original Ignition Core questions and question-derived flashcards
- Spaced review, missed-question bank, quick/category/long practice, and exam exercise
- Version 1 local progress import/export and reset
- Progress analytics and local typed event log
- Mentor dashboard, competency and career summaries, Certification GPS, and template coaching
- Optional constrained OpenAI-compatible coaching selection

## P0: Make the knowledge model trustworthy

1. Curate observable skills and competencies with subject-matter review.
2. Add explicit reviewed `skillIds` or many-to-many content mappings for every question.
3. Document graph ownership, proficiency levels, version, provenance, and review status.
4. Remove category fallback from production evidence once reviewed mappings exist.
5. Reconcile or remove the Adaptive Engine's uncalibrated pass-probability output.
6. Add regression fixtures for missing mappings, graph revisions, and scoring explanations.

**Exit gate:** Every production score can identify reviewed graph/content/algorithm versions and no UI exposes an official pass claim.

## P1: Unify adaptive learning and paths

1. Select one competency scoring implementation for all learner-facing paths.
2. Adapt the Diagnostic Engine to the stable Progress/evidence contract.
3. Add a single versioned learning-path model covering modules, questions, flashcards, practice, and exams.
4. Persist route or plan state, completion, and recommendation reasons.
5. Connect competency-aware review ranking to the live flashcard queue if it improves tested behavior.
6. Add accessible diagnostic and plan experiences.

**Exit gate:** Diagnostic, adaptive recommendations, mentor tasks, and GPS routes consume the same validated graph and do not disagree silently.

## P2: Add durable intelligence infrastructure

1. Design a modular-monolith API and authorization boundary.
2. Implement user-initiated migration of local Progress.
3. Deploy the graph/evidence schema behind a versioned service.
4. Ingest evidence idempotently and generate append-only snapshots.
5. Preserve graph/content/algorithm identity in every result.
6. Add backups, recovery tests, privacy controls, and explicit deletion behavior.

**Exit gate:** Replay produces identical snapshots; imports remain idempotent; every read/write is authorized; local-only study remains available.

## P3: Expand validated content systems

1. Author independent flashcards where useful rather than reusing every question.
2. Add modules with learning content, prerequisites, and assessment items.
3. Grow question coverage through reviewed original content.
4. Add versioned certification targets only from permitted public information.
5. Expand career paths with clearly documented target semantics.

**Exit gate:** Content and graph release together atomically, preserve prior versions, and retain licenses and provenance.

## P4: Ship simulation scenarios safely

1. Author reviewed branching industrial scenarios.
2. Define competency rubrics and evidence quality.
3. Build a learner UI and durable attempt records.
4. Establish isolated environments and prohibit live industrial-system control by default.
5. Add human review for evidence used in high-stakes summaries.

**Exit gate:** Scenarios are safe, versioned, deterministic, reviewable, and do not claim field qualification.

## P5: Operationalize coaching

1. Move provider transport and secrets to an authenticated server-side gateway.
2. Retrieve only approved versioned sources and attach citations.
3. Add consent, retention, failure, abuse, and safety controls.
4. Build an evaluation set for resource selection and policy compliance.
5. Surface provider/model/policy versions and user feedback.

**Exit gate:** Human evaluation, privacy review, monitoring, and citation/failure behavior meet release criteria.

## P6: Consider calibrated prediction

Only after representative, consented outcome data exists:

1. Define the prediction target and deployment scope.
2. Calibrate and validate confidence, coverage, and uncertainty.
3. Evaluate subgroup performance and minimum-evidence behavior.
4. Monitor drift and preserve explanation/replay artifacts.
5. Keep a no-prediction state when evidence is insufficient.

**Exit gate:** Independent validation and governance approve the model. Official pass prediction remains absent unless every gate passes.

## P7: Add future tracks and organization capabilities

Potential later work includes:

- Cybersecurity, Engineering, Manufacturing, and additional industrial courses
- Optional accounts and cross-device sync
- Organization workspaces, roles, consent, and aggregate reporting
- SSO/SCIM, audit, integrations, billing, and enterprise controls
- Validated workforce assessments and scenario labs

These are future bets and must not be implied by the current application.
