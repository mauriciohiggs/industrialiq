# Analytics plan

## Goal

Measure whether IndustrialIQ helps learners complete questions, retain recall, and return, while protecting the local-first product promise. Use aggregate events only. Never collect question answers, imported/exported progress, free-text feedback, credentials, or stable personal identifiers.

## Current implementation

IndustrialIQ records the following local-first events in `industrialiq-analytics-v1`:

- Course Opened
- Flashcard Viewed
- Flashcard Correct
- Flashcard Incorrect
- Exam Started
- Exam Finished
- Question Answered
- Question Missed
- Module Opened
- Mentor Viewed
- Roadmap Viewed

The local event log retains at most 1,000 events and a non-identifying session ID that expires after 24 hours. It does not contain question text, answer text, explanations, imported progress, or free-text feedback. `Question Answered` and `Question Missed` contain stable question and module IDs so aggregate analysis can identify which content is associated with unsuccessful attempts without collecting answer content.

`AnalyticsService` is the only event boundary. It persists locally by default and accepts an `AnalyticsProvider`, allowing a future PostHog client to receive the same contract through `createPostHogProvider`. No PostHog SDK, autocapture, session recording, or network transmission is currently enabled.

## Tool roles

| Tool | Role | Decision |
| --- | --- | --- |
| Local analytics | Privacy-preserving learning-event foundation and offline diagnostics | Active now; capped at 1,000 events in browser storage |
| Plausible | Privacy-focused, aggregate product traffic and acquisition measurement | Consider only after consent and a privacy-policy update |
| PostHog | Product funnels, cohorts, and optional surveys when aggregate page views are insufficient | Add only when a defined funnel cannot be answered locally; disable session recording and autocapture |
| Vercel Analytics | Deployment traffic, Web Vitals, and Vercel-specific availability checks | Enable for operational validation; do not use as a substitute for learning-behavior events |

No analytics SDK is enabled. A separate privacy review and configuration change are required before remote transmission. Self-hosted or regional processing must be evaluated before enabling PostHog.

## Event contract

Use a random, non-identifying session value that resets after at most 24 hours. Events must not contain question text, answer choices, explanations, issue content, exact timestamps beyond what the provider records, or any local progress payload.

| Event | Key properties | KPI use |
| --- | --- | --- |
| `Flashcard Viewed` | course, module, question, review number, review mode | Recall-attempt denominator |
| `Flashcard Correct` / `Incorrect` | course, module, question, rating | Self-reported recall retention |
| `Question Answered` / `Missed` | course, module, question, mode, outcome | Question accuracy and content difficulty |
| `Exam Started` | course, module filter, question count, timer | Exam-start denominator |
| `Exam Finished` | question/answer counts, score, duration, expiration | Exam completion and outcome analysis |
| `Course Opened` / `Module Opened` | course/module identifiers and entry source | Learning-content activation |
| `Mentor Viewed` | mentor view | Guidance engagement |
| `Roadmap Viewed` | entry source | Product-interest engagement |

## KPI definitions

- **Question Accuracy:** `Question Answered` outcomes segmented by course, module, question, and practice mode.
- **Flashcard Retention:** percentage of reviewed cards with Good or Easy ratings after a prior review. A Hard rating counts as successful recall with difficulty; Again counts as incorrect recall.
- **Exam Completion:** `Exam Finished / Exam Started` for exam attempts.
- **Exam Outcome:** completed exams grouped by score, expiration, unanswered count, module filter, and missed-question distribution. Do not treat a practice score as an official certification prediction.
- **User Return Rate:** percentage of weekly anonymous sessions that return within 7 days. Because no persistent identity is used, report this as a directional cohort metric and label its limits.

## Rollout gates

1. Keep the event contract free of PII and free-text study content.
2. Before remote delivery, update the privacy policy with the processor, purposes, region, retention, and opt-out behavior.
3. Add a visible analytics choice where legally required.
4. Verify that blocked analytics never breaks studying, flashcards, or progress storage.
5. Inspect network requests and provider dashboards to prove no prohibited properties are sent.
6. Enable a remote provider only if a named analytical question remains unanswered.

## First dashboard

Monitor course/module activation, mentor engagement, question accuracy, flashcard retention, exam completion, and exam outcomes. Review aggregate trends rather than small samples; do not use these events to label an individual or predict an official certification result.
