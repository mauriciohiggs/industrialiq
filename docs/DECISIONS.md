# IndustrialIQ Decisions

These records explain durable choices visible in the current repository. They are decision records, not promises about future release dates.

## D-001: Local-first core

The open learning experience remains usable without an account, API, backend, database, or analytics SDK.

**Why:** Preserve privacy, portability, low operating cost, and an inspectable open-source core.

**Consequence:** Progress and analytics are scoped to the browser and site origin. Cloud synchronization is a future opt-in capability, not an implicit behavior.

## D-002: Static React client

The shipped platform is a Vite-built React/TypeScript single-page application using hash navigation.

**Why:** It can run as static hosting on GitHub Pages or Vercel and needs no route rewrite.

**Consequence:** There is no server authorization or tenant isolation. Backend-dependent architecture is design work until a service exists.

## D-003: Version 1 progress format

The progress schema remains:

- `version: 1`
- `cards`
- `answers`
- `activity`

and stays under `ignition-open-study-v1`.

**Why:** Existing users and exports must remain portable.

**Consequence:** Live progress cannot express attempt IDs, question versions, assessed mode, graph versions, or rich event provenance without a migration.

## D-004: Questions are also flashcards

Each question supplies a flashcard front, correct answer, and explanation.

**Why:** The initial content system avoids duplication and gives every original question an active-recall mode.

**Consequence:** The 72 questions are 72 card views, not 144 distinct content items.

## D-005: Categories are content modules and provisional skills

Nine Ignition categories generate modules and the IDs used by the current intelligence adapter.

**Why:** It gives the live mentor a complete runtime shape without discarding the existing bank.

**Consequence:** Category grouping is not evidence that a category is an assessable competency. Curated skill mappings are required before stronger claims.

## D-006: Missing evidence remains null

Both readiness and competency calculations represent unassessed skills as missing rather than zero.

**Why:** A learner who has not answered is not known to have zero ability.

**Consequence:** Scores can coexist with insufficient-evidence states and low coverage.

## D-007: Flashcard self-rating is lower-reliability evidence

The competency engine weights flashcard ratings below questions and exams.

**Why:** Self-rating is useful for scheduling but is not an equivalent assessment.

**Consequence:** A flashcard-only learner cannot satisfy high-confidence readiness in the tested engine.

## D-008: Readiness is not pass probability

Current production readiness, GPS forecasts, and career scores are practice/evidence planning outputs, not predictions of official certification success.

**Why:** The repository lacks representative outcome data, calibration, subgroup validation, and official blueprints.

**Consequence:** UI copy and documentation must use "readiness," "coverage," "estimate," or "learning plan" only with explicit limitations. The unused Adaptive Engine pass-probability field is a known policy conflict and should not be exposed.

## D-009: One live competency score source

The Mentor and Certification GPS both use `calculateCompetencyIntelligence` through `calculateIndustrialIntelligence`.

**Why:** Learner-facing surfaces should not silently use competing formulas.

**Consequence:** `readiness.ts` and the adaptive engine are separate illustrative/engine foundations, not alternate production scoring paths.

## D-010: Template coaching is the safe default

The coaching service can run deterministically without a provider. Optional provider output is strict JSON and can only refer to supplied resources and facts.

**Why:** The mentor must remain useful offline and must not invent learning actions.

**Consequence:** A configured provider selects from a constrained set; it does not compose unrestricted user-facing advice.

## D-011: Coaching provider secrets do not belong in a production client

Vite-prefixed variables may configure an OpenAI-compatible endpoint, but a client build exposes client-side values.

**Why:** A production API key must not be shipped to browsers.

**Consequence:** Production use should move transport behind a same-origin authenticated proxy/server.

## D-012: Analytics remains local by default

`AnalyticsService` stores typed, bounded, local events and no active remote provider is enabled.

**Why:** The event boundary can be tested without violating the local-first privacy promise.

**Consequence:** Remote analytics requires a documented purpose, consent/privacy review, opt-out behavior, and proof of the sent properties.

## D-013: Engine completeness is distinct from product integration

Diagnostic, Adaptive, and Simulation code can be implemented and tested without being marked production.

**Why:** Production requires UI, persistence, validation gates, content, and user-facing policy controls.

**Consequence:** Registry status must name consumer paths, not merely file presence.

## D-014: SQL is a foundation, not deployment

`database/001_competency_intelligence.sql` models future evidence and graph persistence but has no app/service consumer.

**Why:** Schema design can establish invariants while the current client remains local.

**Consequence:** Agents must not claim that PostgreSQL, accounts, snapshots, or evidence ingestion exist in production.

## D-015: Spaced repetition is Anki-inspired, not an official Anki implementation

Initial review intervals are 1/3/7/21 days; subsequent ratings use the configured multipliers.

**Why:** A simple transparent scheduler is appropriate for the current single-card model.

**Consequence:** The product does not claim Anki/FSRS equivalence and has no same-session learning steps.

## D-016: Existing open study capabilities stay free

The open source track includes local questions, flashcards, study modes, analytics, import/export, and reset.

**Why:** Paid future capabilities should add service and organizational value rather than remove access from the current community product.

**Consequence:** Do not gate current local capabilities behind accounts or payment.
