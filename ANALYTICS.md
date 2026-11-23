# Analytics plan

## Goal

Measure whether IndustrialIQ helps learners complete questions, retain recall, and return, while protecting the local-first product promise. Use aggregate events only. Never collect question answers, imported/exported progress, free-text feedback, credentials, or stable personal identifiers.

## Tool roles

| Tool | Role | Decision |
| --- | --- | --- |
| Plausible | Privacy-focused, aggregate product traffic and acquisition measurement | Preferred initial production analytics service after consent and a privacy-policy update |
| PostHog | Product funnels, cohorts, and optional surveys when aggregate page views are insufficient | Add only after the first 100 users when a defined funnel cannot be answered in Plausible; disable session recording and autocapture |
| Vercel Analytics | Deployment traffic, Web Vitals, and Vercel-specific availability checks | Enable for operational validation; do not use as a substitute for learning-behavior events |

No analytics SDK is enabled by this plan. A separate privacy review and configuration change are required before launch. Self-hosted or regional processing must be evaluated before enabling PostHog.

## Event contract

Use a random, non-identifying session value that resets after at most 24 hours. Events must not contain question text, answer choices, explanations, issue content, exact timestamps beyond what the provider records, or any local progress payload.

| Event | Properties | KPI use |
| --- | --- | --- |
| `question_viewed` | study mode, topic | Question completion denominator |
| `question_completed` | study mode, topic, correct/incorrect | Question Completion Rate |
| `flashcard_reviewed` | topic, rating band | Flashcard Retention |
| `practice_started` | mode, planned question count | Practice Exam Completion |
| `practice_completed` | mode, planned/completed question count | Practice Exam Completion |
| `study_day` | mode, has prior study day | DAU, WAU, User Return Rate |
| `feedback_opened` | feedback type | Feedback activation |
| `course_requested` | course category | Course-demand prioritization |

## KPI definitions

- **Daily Active Users (DAU):** unique anonymous sessions that emit at least one `study_day` event during a UTC calendar day.
- **Weekly Active Users (WAU):** unique anonymous sessions that emit at least one `study_day` event during a Monday-Sunday UTC week.
- **Question Completion Rate:** `question_completed / question_viewed`, segmented by mode and topic. Report by anonymous session.
- **Flashcard Retention:** percentage of reviewed cards with a Good or Easy rating after a prior review. Publish as a seven-day learning trend, not as certification readiness.
- **Practice Exam Completion:** `practice_completed / practice_started` for exam mode. A completion requires all available exam questions to be submitted.
- **User Return Rate:** percentage of weekly anonymous sessions that return within 7 days. Because no persistent identity is used, report this as a directional cohort metric and label its limits.

## Rollout gates

1. Update the privacy policy with the selected processor, purposes, region, retention, and opt-out behavior.
2. Add a visible analytics choice where legally required.
3. Verify that blocked analytics never breaks studying, flashcards, or progress storage.
4. Inspect network requests and provider dashboards to prove no prohibited properties are sent.
5. Enable Plausible and Vercel Analytics for a seven-day quality check.
6. Add PostHog only if a named question remains unanswered.

## First dashboard

Monitor DAU, WAU, return rate, question completion, flashcard retention, exam completion, top acquisition sources, and feedback-open rate. Review weekly for trends and in 100-user cohorts; do not use small samples to label an individual or predict certification outcomes.
