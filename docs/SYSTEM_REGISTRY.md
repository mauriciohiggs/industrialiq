# IndustrialIQ System Registry

This registry inventories what exists in the repository, whether it is production-reachable, and how each system connects to the rest of the platform.

Status values are `production`, `in progress`, and `planned`, as defined in [PROJECT_BRAIN.md](PROJECT_BRAIN.md).

## Diagnostic Engine

- **Name:** Diagnostic Engine
- **Purpose:** Run a short adaptive assessment, estimate ability, cover skills, identify gaps, and generate a prioritized learning path.
- **Status:** in progress
- **Source Files:** [diagnosticModels.ts](../src/diagnosticModels.ts), [diagnosticEngine.ts](../src/diagnosticEngine.ts), [diagnosticReport.ts](../src/diagnosticReport.ts)
- **Tests:** [diagnosticEngine.test.ts](../src/diagnosticEngine.test.ts)
- **Inputs:** User ID, question sources, diagnostic graph, start/answer times, optional question-count/coverage configuration.
- **Outputs:** `DiagnosticSession`, presented question, updated ability estimate, readiness baseline, skill and competency assessments, skill gaps, and `LearningPathStep[]`.
- **Dependencies:** Industrial graph, category-to-skill mapping, diagnostic models.
- **Consumers:** Tests only; no React route or component imports the engine.
- **Known Issues:** Not exposed in the UI. Difficulty is inferred from numeric question ID suffixes when not supplied. Question coverage and confidence are heuristic. The generated path is not persisted.
- **Future Expansion:** Authored question difficulty, session persistence, UI flow, calibrated stopping rules, provenance, and versioned reports.

## Adaptive Engine

- **Name:** Adaptive Engine / Adaptive Certification Engine
- **Purpose:** Analyze evidence by competency and recommend the next question, module, flashcard review, mock exam, diagnostic, or study action.
- **Status:** in progress
- **Source Files:** [adaptiveEngine.ts](../src/analytics/adaptiveEngine.ts)
- **Tests:** [adaptiveEngine.test.ts](../src/analytics/adaptiveEngine.test.ts)
- **Inputs:** Question history, flashcard state, exam results, competencies, questions, modules, current time, daily minutes, optional mastery threshold and certification ID.
- **Outputs:** Next best action, next best question/module, competency analysis, weak competency IDs, readiness score, and certification prediction object.
- **Dependencies:** Study day constant and caller-supplied graph/content shapes.
- **Consumers:** Tests only. It is separate from the live mentor/GPS recommendation path.
- **Known Issues:** Not integrated with `Progress` or UI. It duplicates scoring logic from the live competency engine. It exposes an uncalibrated `passProbability`, conflicting with the platform safety boundary; this value must not become UI-visible.
- **Future Expansion:** Consolidate with the competency engine, remove or calibrate pass prediction, persist recommendation explanations, and connect it to learning events only after graph review.

## Competency Engine

- **Name:** Competency Intelligence Engine
- **Purpose:** Convert assessed and self-reported evidence into decayed skill scores, competency rollups, certification readiness, career readiness, weaknesses, and review priorities.
- **Status:** production
- **Source Files:** [competencyEngine.ts](../src/analytics/competencyEngine.ts), [industrialIntelligence.ts](../src/analytics/industrialIntelligence.ts), [industrialGraph.ts](../src/analytics/industrialGraph.ts)
- **Tests:** [competencyEngine.test.ts](../src/analytics/competencyEngine.test.ts), [industrialIntelligence.test.ts](../src/analytics/industrialIntelligence.test.ts)
- **Inputs:** Versioned-shape skill/competency/certification/career graph, evidence events, calculation time, and optional engine configuration.
- **Outputs:** Skill mastery, competency mastery, certification/career readiness, blocking competency IDs, weakness priorities, and review-candidate rankings.
- **Dependencies:** Study day constant, evidence produced by the local adapter, graph mappings.
- **Consumers:** Mentor dashboard data, Certification GPS, Mentor skills/readiness/career views.
- **Known Issues:** Runtime graph IDs and weights are illustrative rather than subject-matter-reviewed. Category fallback stands in for explicit question-to-skill mappings. Evidence confidence and readiness gates are configurable heuristics. Flashcard timestamps are reconstructed from due date and interval.
- **Future Expansion:** Immutable graph versions, reviewed weighted mappings, durable evidence IDs, backend snapshots, replayable algorithm versions, and calibration.

## Career Mapping Engine

- **Name:** Career Mapping Engine
- **Purpose:** Compare competency performance with weighted, role-specific targets and report career-path readiness.
- **Status:** production
- **Source Files:** Career-path definitions in [industrialGraph.ts](../src/analytics/industrialGraph.ts); calculation in [competencyEngine.ts](../src/analytics/competencyEngine.ts); adapter in [industrialIntelligence.ts](../src/analytics/industrialIntelligence.ts)
- **Tests:** [competencyEngine.test.ts](../src/analytics/competencyEngine.test.ts), [industrialIntelligence.test.ts](../src/analytics/industrialIntelligence.test.ts)
- **Inputs:** Competency mastery, career-path competency targets and weights, evidence gates.
- **Outputs:** Per-career score, coverage, confidence, status, and blocking competencies for SCADA Engineer, Controls Engineer, Automation Engineer, OT Security Analyst, Industrial Cybersecurity Engineer, and Reliability Engineer.
- **Dependencies:** Competency Engine and Knowledge Graph.
- **Consumers:** Mentor dashboard career-readiness view and coaching input.
- **Known Issues:** There is no standalone career module or curated market/role taxonomy. Targets are provisional product examples and should not be used for hiring or qualification decisions.
- **Future Expansion:** Versioned role taxonomy, certification relationships, labor-market metadata, prerequisite graphs, and validated assessment rubrics.

## Certification GPS

- **Name:** Certification GPS
- **Purpose:** Turn local competency readiness into a navigable route with a current location, roadblocks, route steps, distance, and forecast.
- **Status:** production
- **Source Files:** [certificationGps.ts](../src/certifications/certificationGps.ts), [gpsModels.ts](../src/certifications/gpsModels.ts), [gpsForecast.ts](../src/certifications/gpsForecast.ts)
- **Tests:** [gpsPlanner.test.ts](../src/certifications/gpsPlanner.test.ts)
- **Inputs:** `Progress`, current time, competency intelligence, skill/category names, and industrial certification target.
- **Outputs:** `CertificationGps` containing current readiness, destination, study distance in hours, roadblocks, fastest and alternative routes, and a planning forecast.
- **Dependencies:** Competency Engine, Industrial Graph, GPS Planner.
- **Consumers:** [MentorDashboard.tsx](../src/components/MentorDashboard.tsx)
- **Known Issues:** Display text says "Certification GPS" and "arrival prediction," but the target is a practice-readiness construct, not an official certification blueprint. Estimates are heuristic and not calibrated against outcomes.
- **Future Expansion:** Real target dates, weekly availability, completion feedback, persisted plans, reviewed certification mappings, and validated forecast models.

## Certification Planner

- **Name:** Certification Planner
- **Purpose:** Rank roadblocks, estimate remaining study effort, and construct actionable review/practice/module/exam steps.
- **Status:** production
- **Source Files:** [gpsPlanner.ts](../src/certifications/gpsPlanner.ts), [gpsForecast.ts](../src/certifications/gpsForecast.ts), [gpsModels.ts](../src/certifications/gpsModels.ts)
- **Tests:** [gpsPlanner.test.ts](../src/certifications/gpsPlanner.test.ts)
- **Inputs:** Certification assessment, skill scores/coverage/priorities, target readiness, optional roadblock count and forecast options.
- **Outputs:** Ranked roadblocks, fastest route, alternative route, study-hour distance, projected readiness, and planning confidence.
- **Dependencies:** Study filters, GPS data contracts, Competency Engine outputs.
- **Consumers:** Certification GPS and Mentor route controls.
- **Known Issues:** A route's expected gain and study-distance formula are deterministic planning heuristics. Plans are regenerated rather than persisted and completed steps are not tracked.
- **Future Expansion:** Multiple route strategies, calendar constraints, due-review integration, plan state, versioned assumptions, and measured gain calibration.

## Mentor Engine

- **Name:** Mentor Engine
- **Purpose:** Transform local progress and intelligence into a learner-facing overview, skills, tasks, seven-day study rhythm, readiness, certification/career summaries, and forecast.
- **Status:** production
- **Source Files:** [dashboardData.ts](../src/mentor/dashboardData.ts), [models.ts](../src/mentor/models.ts), [MentorDashboard.tsx](../src/components/MentorDashboard.tsx), [MentorDashboard.css](../src/components/MentorDashboard.css)
- **Tests:** [industrialIntelligence.test.ts](../src/analytics/industrialIntelligence.test.ts), [coaching.test.ts](../src/mentor/coaching.test.ts)
- **Inputs:** `Progress`, current time, Competency Engine output, industrial graph labels, route-planner output, coaching output.
- **Outputs:** Mentor readiness, confidence, skill strengths/weaknesses, tasks, study plan, forecast, certification/career rows, and coaching input.
- **Dependencies:** Industrial Intelligence, Certification GPS, Coaching Layer, React UI, analytics service.
- **Consumers:** Main application mentor routes.
- **Known Issues:** "AI Mentor" is a broader product label even when the runtime is template-only. Weekly study-plan state is generated, not persisted. Its evidence and confidence reflect the provisional graph.
- **Future Expansion:** Session history, learner goals, consent/retention controls, citations, evaluation, persistent plans, and separate learner/organization views.

## Coaching Layer

- **Name:** Coaching Layer
- **Purpose:** Select a strongest area, largest gap, and only allowed learning resources, then generate a human-readable coaching message.
- **Status:** production
- **Source Files:** [coaching.ts](../src/mentor/coaching.ts), [models.ts](../src/mentor/models.ts)
- **Tests:** [coaching.test.ts](../src/mentor/coaching.test.ts)
- **Inputs:** Readiness, competency scores, career scores, weak areas, target learning path, and an allow-list of actionable resources.
- **Outputs:** Strict schema-versioned coaching selection with mode, actions, and composed message.
- **Dependencies:** Mentor data; optional OpenAI-compatible endpoint configured through Vite environment variables.
- **Consumers:** Mentor dashboard.
- **Known Issues:** Provider transport runs in the client and a configured Vite API key is build-visible. A same-origin authenticated proxy is preferred. Unexpected non-validation provider errors are surfaced rather than silently hidden. Validation failures fall back to templates.
- **Future Expansion:** Server-side model gateway, approved-source retrieval, citations, policy/model versions, consent, observability, evaluation sets, and retention controls.

## Analytics Service

- **Name:** Analytics Service
- **Purpose:** Define a typed learning-event boundary, retain a bounded local event history, and optionally forward identical contracts to an analytics provider.
- **Status:** production
- **Source Files:** [analyticsService.ts](../src/analytics/analyticsService.ts), event calls in `App.tsx`, `Flashcards.tsx`, and `Practice.tsx`
- **Tests:** [analyticsService.test.ts](../src/analytics/analyticsService.test.ts)
- **Inputs:** Typed event name/properties from UI behavior; local browser storage; optional provider.
- **Outputs:** Bounded `AnalyticsEvent[]` in `industrialiq-analytics-v1` and optional PostHog-compatible provider capture.
- **Dependencies:** Browser localStorage, Web Crypto/ID fallback, UI event emitters.
- **Consumers:** App navigation, flashcards, practice/exam flows, future product analytics tooling.
- **Known Issues:** No remote SDK/provider is enabled. Analytics and study progress are separate stores. A non-identifying session ID lasts 24 hours, so cross-session cohort analysis remains limited.
- **Future Expansion:** Explicit remote consent, privacy policy update, aggregate dashboards, opt-out behavior, and a provider selected only for an unanswered analytical question.

## Simulation Framework

- **Name:** Simulation Framework
- **Purpose:** Execute validated branching scenarios with decisions, scores, competency impacts, flags, conditions, feedback, and summaries.
- **Status:** in progress
- **Source Files:** [simulationModels.ts](../src/simulations/simulationModels.ts), [simulationEngine.ts](../src/simulations/simulationEngine.ts)
- **Tests:** [simulationEngine.test.ts](../src/simulations/simulationEngine.test.ts)
- **Inputs:** Versioned scenario, competencies, nodes, choices, branches, scoring policy, starting scores/flags, attempt ID.
- **Outputs:** Active/completed simulation sessions, decision records, current nodes, feedback, and final summaries.
- **Dependencies:** No runtime application dependencies; callers supply scenarios and policies.
- **Consumers:** Tests only. No UI or production scenario catalog.
- **Known Issues:** No shipped scenarios, persistence, learner UI, safe sandbox, evidence adapter, or human-review workflow.
- **Future Expansion:** Reviewed scenario content, versioned rubrics, isolated labs, durable attempts, competency evidence integration, and safe industrial-control boundaries.

## Knowledge Graph

- **Name:** Industrial Knowledge Graph
- **Purpose:** Define the relationships among provisional skills, competencies, certification targets, careers, questions, modules, and learning evidence.
- **Status:** in progress
- **Source Files:** [models.ts](../src/competencies/models.ts), [industrialGraph.ts](../src/analytics/industrialGraph.ts), [course.ts](../src/courses/industrial-automation/ignition-core/course.ts), [001_competency_intelligence.sql](../database/001_competency_intelligence.sql)
- **Tests:** [readiness.test.ts](../src/analytics/readiness.test.ts), [competencyEngine.test.ts](../src/analytics/competencyEngine.test.ts), [industrialIntelligence.test.ts](../src/analytics/industrialIntelligence.test.ts)
- **Inputs:** Category-derived skill definitions, competency/career weights, modules/questions, future graph and content versions.
- **Outputs:** In-memory graph consumed by diagnostic/competency/mentor systems; proposed PostgreSQL relational schema.
- **Dependencies:** Question categories and graph model contracts.
- **Consumers:** Diagnostic conversion, Competency Engine, Career Mapping, Mentor, Certification GPS, Adaptive Engine compatibility path.
- **Known Issues:** No explicit question-to-skill mappings exist in the 72-question bank. Category names are provisional skills, not reviewed competencies. The SQL schema is not connected to a service or database.
- **Future Expansion:** Curated taxonomy, immutable publication, prerequisite DAG validation, version-aware content mappings, evidence provenance, and graph migrations.

## Question Bank

- **Name:** Question Bank
- **Purpose:** Supply original Ignition Core concept questions for searchable learning, practice, exams, flashcards, and engine evidence.
- **Status:** production
- **Source Files:** [questions.json](../src/data/questions.json), [bank.ts](../src/data/bank.ts), [categories.ts](../src/data/categories.ts)
- **Tests:** [study.test.ts](../src/lib/study.test.ts), [readiness.test.ts](../src/analytics/readiness.test.ts), [diagnosticEngine.test.ts](../src/diagnosticEngine.test.ts)
- **Inputs:** Bundled JSON records: stable ID, category, prompt, four unique options, correct index, explanation, optional skill IDs.
- **Outputs:** Validated `Question[]`, filtered/searchable library, randomized quizzes, flashcard content, diagnostic question sources.
- **Dependencies:** Category taxonomy and `Question` type.
- **Consumers:** All learner modes, module catalog, industrial intelligence adapter, diagnostics, adaptive engine compatibility.
- **Known Issues:** 72 questions, exactly 8 per category. None currently has explicit `skillIds`. Question IDs are treated as stable, but content is not versioned.
- **Future Expansion:** Reviewed skills/mappings, item metadata and difficulty, independent flashcard content, content versions, larger course banks, and provenance.

## Flashcard System

- **Name:** Flashcard and Review System
- **Purpose:** Convert question prompts/answers into active-recall cards, prioritize due/missed/weak-topic cards, and schedule future reviews from learner ratings.
- **Status:** production
- **Source Files:** [Flashcards.tsx](../src/components/Flashcards.tsx), [study.ts](../src/lib/study.ts), [questions.json](../src/data/questions.json)
- **Tests:** [study.test.ts](../src/lib/study.test.ts), [storage.test.ts](../src/lib/storage.test.ts)
- **Inputs:** Question bank, topic/missed filter, saved card progress, answer history, current time, Again/Hard/Good/Easy rating.
- **Outputs:** Review queue, normal/lightning sessions, updated due date/interval/review count/rating, activity dates, analytics events, lower-weight competency evidence.
- **Dependencies:** Progress storage, Question Bank, scheduler logic, analytics service.
- **Consumers:** Learners, Mentor tasks, Certification GPS routes, local intelligence adapter.
- **Known Issues:** Question-derived cards are not independently authored or versioned. Ratings are self-report, not assessed evidence. The live queue does not yet call `rankReviewCandidates`; it uses overdue/missed/topic-accuracy priority.
- **Future Expansion:** Standalone cards, richer scheduler, durable review events, competency-aware queue integration, same-session learning steps if explicitly designed.

## Learning Path System

- **Name:** Learning Path System
- **Purpose:** Organize course modules and produce prioritized study sequences from readiness, skill gaps, and certification planning.
- **Status:** in progress
- **Source Files:** [course.ts](../src/courses/industrial-automation/ignition-core/course.ts), [diagnosticReport.ts](../src/diagnosticReport.ts), [gpsPlanner.ts](../src/certifications/gpsPlanner.ts), [dashboardData.ts](../src/mentor/dashboardData.ts)
- **Tests:** [readiness.test.ts](../src/analytics/readiness.test.ts), [diagnosticEngine.test.ts](../src/diagnosticEngine.test.ts), [gpsPlanner.test.ts](../src/certifications/gpsPlanner.test.ts)
- **Inputs:** Nine topic modules and question IDs; optional diagnostic gaps; live GPS assessment; mentor readiness.
- **Outputs:** Static course/module catalog, diagnostic `LearningPathStep[]`, GPS route steps, and generated seven-day mentor rhythm.
- **Dependencies:** Question Bank, Competency Engine, Diagnostic and Certification Planner.
- **Consumers:** Learning-library UI, Mentor study-plan and GPS actions.
- **Known Issues:** No single persisted learning-path model or completion state. "Module" is currently a topic grouping, not authored lesson content. Three path representations are not unified.
- **Future Expansion:** Reusable path version, prerequisites, schedule constraints, progress/completion state, resource catalog, personalization, and authored modules.
