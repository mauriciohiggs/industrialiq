# IndustrialIQ migration

## Old architecture

The Ignition Core study companion used a single question bank and category list, React study screens, browser-local analytics, and version 1 progress in `localStorage`. Questions also supplied flashcards. It had no backend or accounts.

## New architecture

IndustrialIQ is the product; Industrial Automation > Ignition Core is its first course. The existing categories are exposed as nine learning modules through `src/courses/industrial-automation/ignition-core/course.ts`. The original question data, IDs, study screens, import/export format, and storage key remain unchanged. Other track folders are placeholders.

`src/competencies/models.ts` defines skills, competencies, certifications, career paths, courses, and modules. A question may reference skills; competencies reference skills, certifications reference competencies, and career paths reference certifications. The existing questions have no curated skill mappings yet. The interfaces are not a database or a populated graph.

`src/analytics/readiness.ts` is a standalone illustrative calculation over explicitly supplied 0-100 skill scores. Each competency is the rounded mean of its skills; a certification is the rounded mean of its competencies; the overall score is the rounded mean of competency scores. A missing input or empty group yields `null`, not a zero or an inferred result. Skills below 70 are weak; weak and unscored skills are recommended. Invalid scores, duplicate IDs, and broken mappings are rejected. This is not integrated into current progress, validated as a measure of competence, or a prediction of passing an exam.

`src/mentor` contains message, event, recommendation, and plan interfaces plus deterministic mock responses. There are no model calls or backend services.

## Why the competency graph exists

The graph can eventually connect reusable practice content to assessed skills, competencies, certification objectives, and career paths across courses. Such links require subject-matter review, evidence provenance, and versioning; a topic or correct answer alone does not establish competence.

## Future AI mentor plan

Explore an opt-in mentor grounded in approved, versioned sources, with citations, privacy controls, explicit failure handling, and human evaluation. It must not be presented as an official certification authority or operational control system. See [INDUSTRIALIQ_STRATEGY.md](INDUSTRIALIQ_STRATEGY.md) for the proposed safeguards and [ROADMAP.md](ROADMAP.md) for status.
