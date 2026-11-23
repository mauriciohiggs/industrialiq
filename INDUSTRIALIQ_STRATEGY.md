# IndustrialIQ platform strategy

This is a **proposed design**, not a description of a deployed SaaS product. Today IndustrialIQ is a local-first Ignition 8.1 study app with 72 original questions, question-derived flashcards, basic practice analytics, and browser-local progress. Graph interfaces, an illustrative readiness service, and a mock mentor exist as foundations, but are not connected to learner progress and have no curated graph data. There is no backend, account, AI coach, readiness prediction, billing, or enterprise service. The existing exam practice is an independent study exercise, not a replica of the official certification assessment.

## Positioning

**IndustrialIQ is an industrial competency platform for automation, OT, and cybersecurity professionals:** a place to build, retain, and demonstrate skills through structured learning and evidence-based practice. Ignition Core is the first track, not the identity of the whole product.

The differentiator is a curated, versioned competency graph connecting skills and prerequisites to learning activities, evidence, certifications, and career paths. Questions and flashcards are reusable learning assets attached to that graph, not the primary product model. Initial users are individual learners preparing for Ignition Core; later buyers include industrial employers developing technical workforces. PLC and cybersecurity expansion and workforce assessment are future bets, not current capabilities.

**Homepage message**

- Headline: Build Competence. Earn Certifications. Advance Your Career.
- Supporting copy: AI-powered competency tracking, certification preparation, and industrial workforce development. AI and competency tracking are explicitly labeled as planned.
- Primary action: Study Ignition Core. Secondary action: Take a quick drill.
- Future promise, clearly labeled as planned: competency tracking, an AI mentor, readiness insights, career skill maps, and scenario labs.
- Trust: independent of Inductive Automation; practice is not an official exam, certification, or guarantee of passing. Do not imply that software scores alone establish safe field competence.

## Architecture

### Current state

React, TypeScript, and Vite serve a static app. `src/data/questions.json` and category metadata are bundled at build time; a question also supplies its flashcard. Study scheduling and analytics run in the browser. Version 1 progress is stored under `ignition-open-study-v1`, with explicit JSON import/export. Keep these paths, identifiers, and local workflows working while the platform is developed.

### Target state

```text
Learner / organization admin
        |
Web client: courses, review, practice, skill map, coach, reports
        |
Authenticated API + authorization + organization isolation
        |
        +-- Content and graph: courses, modules, skill/competency graph,
        |   content versions, certification and career mappings
        +-- Learning: attempts, evidence, review schedules, recommendations
        +-- Assessment: readiness snapshots, calibration, simulator
        +-- AI coach: retrieval from approved versioned material, model gateway,
        |   citations, safety controls and user feedback
        +-- Organization: membership, entitlements, consent and audit
        |
PostgreSQL (source of truth) + private object storage (content/artifacts)
        |
Background jobs: reviews, analytics, indexing, model evaluation and exports
```

Start as a modular monolith with a transactional relational database and asynchronous jobs; separate services only when operational needs justify them. Published content and graph versions are immutable. Edits are reviewed as drafts, validated, and published together; keep prior versions available for attempts and score interpretation. Use a directed acyclic prerequisite graph, validated on publication. Map each assessment item to one or more competencies, with reviewer-approved relevance and weights; unmapped material remains usable but cannot generate competency evidence.

Learning activities emit durable, idempotent evidence events. A competency is an assessable outcome for a skill at a defined proficiency level; it is not equivalent to a question, topic, or certificate. Scores aggregate evidence by competency and can roll up to certifications and career paths, while preserving evidence provenance, recency, confidence, and version. Do not infer mastery solely from self-rated flashcards.

AI mentoring is a separate, optional layer: retrieve only authorized, approved material; cite sources and distinguish uncertainty from fact; never send secrets or private learner data to a provider without appropriate consent and contractual controls. Do not connect the coach to industrial control systems. Treat generated recommendations as educational guidance requiring human verification, not operational instructions or proof of qualification. Log failures and surface them to users; establish human review and a documented evaluation set before release.

Readiness should begin as an explainable, evidence-coverage indicator, not a pass probability. At v0.4, show a prediction only after validation on consented, representative outcome data, calibration and subgroup checks, minimum-evidence thresholds, and monitoring for drift. Otherwise show insufficient evidence or an uncalibrated practice summary. Include uncertainty and model/version information; never use readiness as an employment decision by itself.

Use tenant-scoped authorization on every organization-owned row and request, least-privilege roles, encryption in transit and at rest, audit logs, retention/deletion policies, backups and recovery tests. Personal progress is private by default. Organization access and sharing require explicit permissions and clear notice; prohibit cross-tenant access, train/test data leakage, and unauthorized model training. Enterprise features such as SSO, tenant reporting, and integration are release-dependent.

## Proposed relational database schema

This is a logical PostgreSQL design for implementation and migration, **not an existing database or an executable migration**. IDs are UUIDs unless noted; times are UTC `timestamptz`. Published rows reference immutable version IDs. Required foreign keys are non-null unless noted. Add `created_at` and `updated_at` to mutable tables; use append-only records for evidence, published versions, and audit events. Validate content before publication and enforce unique keys, foreign keys, checks, and tenant ownership in the database as well as the API.

### Identity and tenancy

| Table | Key fields and constraints |
| --- | --- |
| `users` | `id`, identity-provider subject (unique), display name; authentication secrets stay with the identity provider. |
| `organizations` | `id`, name, status. Personal learning is owned by a user, not implicitly shared with an employer. |
| `memberships` | `organization_id`, `user_id`, role (`learner`, `manager`, `admin`), status; unique organization/user. Role and any learner-sharing consent determine access. |
| `audit_events` | `id`, nullable organization, actor, action, target type/id, time, outcome; exclude secrets and unnecessary content. |
| `subscriptions` | `id`, owner type/id (user or organization), plan, status, billing-provider reference, effective dates; provider handles payment credentials. Enforce one active subscription per owner. |

### Curated learning and competency graph

| Table | Key fields and constraints |
| --- | --- |
| `graph_versions` | `id`, label, status (`draft`, `published`, `retired`), published time; a version is immutable after publication. |
| `skills` | `id`, stable key (unique), name, description, domain. |
| `competencies` | `id`, stable key (unique), `skill_id`, name, description, proficiency level and observable outcome. |
| `graph_competencies` | `graph_version_id`, `competency_id`, versioned outcome and proficiency; composite primary key. |
| `competency_prerequisites` | `graph_version_id`, `competency_id`, `prerequisite_id`; composite primary key; both endpoints must be in that graph version, no self-edge or cycle. |
| `courses` | `id`, stable key (unique), title, domain; Ignition Core is the initial course/track. |
| `course_versions` | `id`, `course_id`, `graph_version_id`, version, status, description; unique course/version. |
| `modules` | `id`, `course_version_id`, title, position; unique course/version position. Modules group learning activities, not competencies themselves. |
| `content_items` | `id`, stable key (unique), type (`question`, `flashcard`, `scenario`); supports reuse across modules. |
| `content_versions` | `id`, `content_item_id`, version, status, source/license, author/reviewer, published time; unique item/version. Approved source links and original content are required for publication. |
| `questions` | `content_version_id` (primary key), prompt, explanation; exactly one correct choice and at least two distinct choices required before publication. |
| `question_choices` | `question_version_id`, choice key, text, position, `is_correct`; unique question/key and question/position; publication validates exactly one correct answer. |
| `flashcards` | `content_version_id` (primary key), front, back, optional source question version. Cards may be authored independently. |
| `scenarios` | `content_version_id` (primary key), context, instructions, assessment rubric and safe simulated environment reference. Scenario interactions and outcomes are versioned with the item. |
| `module_items` | `module_id`, `content_version_id`, position; unique module/position and module/content version. |
| `content_competencies` | `content_version_id`, `graph_version_id`, `competency_id`, relevance weight; composite primary key; competency must exist in the referenced graph version and weight must be positive. |
| `certifications` | `id`, stable key (unique), name, issuer, external reference; identifies a target, not a credential issued by IndustrialIQ. |
| `certification_versions` | `id`, `certification_id`, `graph_version_id`, version, status, effective dates; unique certification/version. |
| `certification_competencies` | `certification_version_id`, `competency_id`, weight; unique certification version/competency; competency must belong to its graph version. |
| `career_paths` | `id`, stable key (unique), title, description. |
| `career_path_versions` | `id`, `career_path_id`, `graph_version_id`, version, status; unique path/version. |
| `career_path_competencies` | `career_path_version_id`, `competency_id`, target level, weight; unique path version/competency; competency must belong to its graph version. |

### Learner state and evidence

| Table | Key fields and constraints |
| --- | --- |
| `enrollments` | `user_id`, `course_version_id`, enrolled time, status; unique user/course version. |
| `attempts` | `id`, `user_id`, `course_version_id`, mode, started/submitted time, status, optional simulator configuration version. |
| `attempt_responses` | `id`, `attempt_id`, `content_version_id`, response, result, answered time; unique attempt/content version for the initial quiz model. Preserve unanswered items as incorrect when submitted, matching current behavior. |
| `review_states` | `user_id`, `flashcard_content_item_id`, referenced card version, due, interval, review count, latest rating, scheduler version; unique user/card. |
| `review_events` | `id`, `user_id`, card version, rating, reviewed time, scheduler version; append-only with an idempotency key unique per user. |
| `competency_evidence` | `id`, `user_id`, `graph_version_id`, `competency_id`, source type/id, result, confidence, observed time, provenance; unique source/competency per user and graph version. Self-ratings remain distinct from assessed evidence. |
| `competency_snapshots` | `id`, `user_id`, graph version, competency, score, evidence coverage, confidence, algorithm version, computed time; retain underlying evidence. |
| `readiness_snapshots` | `id`, `user_id`, certification version, model/algorithm version, score or nullable prediction, uncertainty, evidence coverage, computed time and explanation; record when evidence is insufficient. |
| `coach_sessions` | `id`, `user_id`, optional organization context, model and policy version, created time; retention and sharing are explicitly controlled. |
| `coach_messages` | `id`, `session_id`, role, text, approved-source references, created time; minimize retention and enforce owner/tenant access. |

Use composite foreign keys or equivalent constraints to enforce graph-version membership and tenant ownership; index foreign keys, `(user_id, due)` for reviews, and `(user_id, competency_id, observed_at)` for evidence. Avoid duplicating an organization's learner progress: explicit grants govern any reporting. Scores must identify the exact graph, content, and algorithm versions used; revising a graph cannot silently rewrite historic results.

### Migration from the current product

1. Preserve all 72 question IDs, categories, original wording, explanations, source links, license, local progress key, and export format. Model the existing question-derived cards with stable IDs tied to their question IDs; do not mistake them for 72 additional independently authored cards.
2. Curate Ignition skills and assessable competencies, prerequisites, and question mappings with subject-matter review. Categories are initial grouping candidates, **not automatically validated competencies**. Version the initial graph and map only reviewed content.
3. Keep the existing browser-only experience. When accounts exist, offer a user-initiated, validated import of the current progress JSON, previewing conflicts and unknown IDs; no automatic upload. Map card schedules and answer history to their original versions and retain existing quiz-vs-self-rating distinctions. Repeated imports must not duplicate evidence; report skipped or unresolvable records. The existing export has no per-answer event ID, so use a recorded import digest and deterministic per-record identity based on the export and record position, and document that independently edited exports may require manual reconciliation.
4. Verify the migration against real exported fixtures, including corrupt files, duplicate imports, unknown questions, and storage failure. Existing learners can continue locally until they opt in. Do not delete local data on import.

## Product roadmap

Version labels express sequence, not dates or a claim that later capabilities already exist. Review content quality, accessibility, privacy, and regression tests at every release.

| Version | Scope and release gate |
| --- | --- |
| **v0.1** | Current 72 original Ignition questions and question-derived flashcards, practice, review, and local progress. Existing exam practice is not an official simulation or readiness predictor. |
| **v0.2** | Reach **300 reviewed questions and 500 flashcards** for Ignition Core; distinguish independently authored cards from question-derived cards and report unique totals. Establish skill/competency taxonomy, reviewed mappings, prerequisite graph, and content versioning. Preserve local progress. |
| **v0.3** | AI Competency Coach: opt-in, source-grounded explanations and practice recommendations based on available evidence. Release after safety, privacy, citation, failure-handling, and evaluation gates; no operational control or unsupported certification claims. |
| **v0.4** | Readiness Prediction Engine: competency coverage and explainable insights first; calibrated predictions only after the outcome-data and validation gates above. Otherwise explicitly show insufficient evidence. |
| **v0.5** | Ignition Core Certification Simulator: versioned practice blueprint, timed sessions, review, and competency breakdown. Define scope from permitted public information; do not copy official items or claim official format, difficulty, pass prediction, affiliation, or endorsement without authorization and validation. Existing exam practice is the starting point, not the completed simulator. |
| **v1.0** | IndustrialIQ launch with Free, Pro, and Enterprise offerings; accounts, secure multi-tenancy, billing, privacy controls, support, and reliability must be production-ready before selling them. Retain the current open-source license and local-first option. |
| **v2.0** | PLC and industrial cybersecurity tracks, separately reviewed competency graphs, content, and career mappings. |
| **v3.0** | Scenario Labs: safe, isolated simulations, versioned rubrics, and human-reviewed evidence; no live industrial-system access by default. |
| **v4.0** | AI Skills Assessment Platform: broader evidence, calibrated assessments, and organization workflows, subject to independent validation, privacy, fairness, and human oversight. Not an automated hiring or safety qualification decision system. |

## SaaS packaging and feature gates

This is the proposed MVP packaging, not a description of a deployed product. The product is **open core, not a crippled free trial**: the existing local application remains complete and useful without accounts or payment. Paid plans add cloud convenience, premium learning services, and organization operations.

### What remains free forever

The following are non-negotiable community commitments:

- The existing MIT-licensed source, all content already released under MIT, and the ability to fork, modify, self-host, and redistribute it.
- The complete local-first Ignition Core track: every currently open question, flashcard, quick drill, category drill, exam practice, explanation, official reference, scheduler, missed-question bank, and progress analytics.
- Unlimited local study, JSON progress export/import, and reset with no account, telemetry requirement, trial countdown, feature interruption, or proprietary runtime dependency.
- Future correctness fixes, security fixes, accessibility fixes, and compatibility updates to the existing open-source study experience.
- Community contributions and technical/content review through the public contribution process.
- A free hosted option, once accounts exist, for the core track and basic individual progress. Cloud sync is optional; users can continue locally and migrate out.

Do not move a feature already present in the open-source app behind a paywall. Do not remove questions or exports from the community edition, obscure answers, cap local review, or use account registration as a prerequisite for local study.

### What becomes paid

Paid value must come from new services and capabilities with real ongoing cost or organizational value:

| Capability | Free | Pro | Enterprise |
| --- | --- | --- | --- |
| Open local Ignition Core study and full JSON portability | Included | Included | Included |
| Hosted account, basic cloud progress, and one learner workspace | Included | Included | Included through assigned seat |
| Community content and future open tracks | Included as released | Included | Included |
| Premium authored courses, scenario labs, advanced simulator packs, and study plans | Preview only | Included within published catalog limits | Included by contract/catalog |
| Unlimited or metered source-grounded AI coach usage | Small evaluation allowance or unavailable | Metered monthly allowance; clear overage or upgrade behavior | Contracted pooled allowance with admin controls |
| Cross-device sync, version-aware history, backups, and personal exports | Basic | Advanced history and recovery | Included plus retention controls |
| Competency map, evidence coverage, career maps, and explainable readiness insights | Basic self-view when the feature ships | Full personal insights | Team views only with explicit, informed learner consent |
| Organization workspaces, member and role management | No | No | Included |
| SSO, SCIM, audit export, policy controls, security documentation, and retention configuration | No | No | Included as delivered by contract tier |
| Team, curriculum, content-assignment, and aggregate skills reporting | No | No | Included; private detail is excluded |
| API, LMS/HRIS integration, and custom content ingestion | No | No | Paid add-on or contract |
| Support | Community support | Email support and service status | Priority support, onboarding, SLA, and named contact |

Server-side entitlements are capability-based rather than page-based. The API returns an entitlement profile and enforces every protected action independently. Minimum capabilities for the MVP are `cloud_sync`, `premium_catalog`, `coach_usage`, `advanced_insights`, `org_admin`, `aggregate_reports`, `sso`, and `audit_export`. Absence of a capability must not erase free data or make it inaccessible; it only prevents access to the paid service or new paid content.

### Plan decision

| Plan | Audience | Proposed MVP offer |
| --- | --- | --- |
| **Free** — $0 | Community learners and evaluation users | Full local open-source app, hosted account, basic cloud sync, the open track, standard personal export, and community support. No credit card and no expiration. |
| **Pro** — test $19/month or $180/year | Self-directed learners and certification candidates | Premium catalog, advanced simulator and personal insights, deeper cloud history, priority email support, and a defined AI allowance. Validate willingness to pay before launch. |
| **Enterprise** — annual contract, starting from a validated per-seat floor | Training managers, employers, and education partners | Organization controls, consent-based reporting, SSO/audit/integration options, pooled content/AI allowances, onboarding, support, and security terms. Quote where implementation or service cost varies. |

Prices are test hypotheses, not commitments. Validate Pro at $12, $19, and $29 price points and Enterprise packaging with at least 10 learner interviews and 3-5 paid design partners before the public launch. Do not optimize for the highest conversion if it compromises adoption of the open project.

## Community-safe monetization model

1. **Monetize hosted operations.** Charge for sync, backups, availability, premium content review, AI inference, administration, integrations, support, and compliance work that the local app cannot provide for free.
2. **Never monetize lock-in.** A learner can export human-readable data and return to local mode at any time. Canceling Pro stops future paid access but preserves account history, open-track access, and export.
3. **Keep the on-ramp visible.** Do not add artificial delays, ads, dark-pattern counters, forced emails, or trial-expiry popups to the local study flow. Mention accounts only when the user chooses sync or a paid capability.
4. **Publish the boundary.** Every feature page, release note, and checkout must say whether a capability is local/open, hosted/free, Pro, or Enterprise. New proprietary content must not be represented as part of the MIT grant.
5. **Use soft limits.** For scarce resources such as AI, hosting, or Enterprise exports, return a clear quota and reset date. Allow study to continue and never consume or conceal existing progress.
6. **Separate employer value from learner surveillance.** Enterprise reporting defaults to aggregate, minimum-cohort measures. Learner-level access requires explicit consent, clear scope, revocation, and an organization role with a documented lawful basis.
7. **Do not sell data.** Payment revenue comes from subscriptions and services. Learner activity, coach messages, assessment evidence, and organizational data are never advertising inventory or model-training material without separate, explicit opt-in.
8. **Give evidence back to the community.** Keep core bug fixes and reusable infrastructure open where practical, publish meaningful aggregate product and model-evaluation notes, and document the provenance and license of future content.

## MVP SaaS implementation roadmap

### Phase 0 — Validate demand and define contracts (2-3 weeks)

- Interview at least 10 learners and 5 workforce/training buyers; test open-core trust, desired paid outcomes, likely price, and enterprise procurement requirements.
- Recruit 3-5 design partners willing to pilot a concierge hosted workspace; require no production controls or employment decisions in the pilot.
- Freeze the initial capability matrix, data glossary, privacy rules, support ownership, and acceptance criteria.
- Instrument only an optional, consented product telemetry plan in the future hosted product. Keep the local build free of telemetry.
- **Exit gate:** learners identify paid value in sync/premium learning, buyers request organization capability, and estimated Pro gross margin remains positive after content, hosting, and AI costs.

### Phase 1 — Account and migration foundation (3-5 weeks)

- Add hosted authentication through a managed identity provider; do not store passwords.
- Add user-owned progress, idempotent writes, local-to-cloud import preview/conflict handling, deletion/export, and recovery.
- Preserve anonymous local mode as the default and keep the existing static build deployable.
- Add `PlanCatalog`, `EntitlementService`, billing-provider webhooks, and a server-generated entitlement profile. Treat billing events as asynchronous and idempotent.
- **Exit gate:** a new user can study without an account; an existing export imports twice without duplication; a downgrade preserves open access; export/deletion and storage-failure tests pass.

### Phase 2 — Free hosted MVP (2-4 weeks)

- Ship optional accounts and basic cross-device progress for the open track.
- Add status, support, terms/privacy pages, security headers, backups, recovery exercises, and operational alerts.
- Add an optional Pro waitlist without interrupting learning. Do not launch a checkout until paid fulfillment exists.
- **Exit gate:** 30-day target cohorts can complete first practice and a return review with reliable sync, and recovery/export paths are documented and tested.

### Phase 3 — Pro paid beta (4-6 weeks)

- Add one clearly premium deliverable first: advanced curated simulator or an expanded original course—not a generic “more questions” gate.
- Add paid subscription checkout, annual discount, cancellation, failed-payment grace, invoices, and webhook reconciliation.
- Add capability-aware UI and a public plan matrix; paid actions fail explicitly and retain the learner's current work.
- If the AI coach is enabled, enforce account-level quotas, citations, safety evaluation, and a visible usage meter; do not require it for progress.
- **Exit gate:** paid beta users can purchase, use the promised capability, cancel, and continue using Free without contacting support; no open/local feature regresses.

### Phase 4 — Enterprise pilot (6-10 weeks)

- Add organizations, invitations, membership roles, tenant isolation, and consent records.
- Add an organization admin console and aggregate reporting first; defer SSO, SCIM, deep integrations, and custom content unless a paid pilot requires them.
- Add audit export, retention controls, security review artifacts, onboarding runbook, and priority support.
- Contract pilot reporting around aggregate learning outcomes, not private answer-level behavior or coach conversations.
- **Exit gate:** two tenants pass cross-tenant authorization tests, consent revocation removes access, and at least one design partner renews or signs a paid pilot.

### Phase 5 — Public SaaS launch and optimization

- Launch Free and Pro self-service; sell Enterprise through assisted onboarding and a clear minimum package.
- Publish service availability, pricing/limits, cancellation/refund, privacy, data location, and content/license boundaries.
- Track activation, D7/D30 retained learners, review return rate, competency evidence coverage, support contacts, Free-to-Pro conversion, Pro retention, AI cost per active learner, gross margin, and Enterprise pilot renewal.
- Test upgrades and annual pricing without degrading the no-account learning funnel. Review the entitlement matrix quarterly and require a migration path before changing any promise.
- **Exit gate:** launch only after billing recovery, tenant isolation, backups, incident response, privacy requests, and downgrade/export workflows have passed operational drills.

Track learning quality and community health alongside revenue. Do not use revenue, engagement time, or question volume alone as the product's success criterion. Paid growth is successful only if the open-source track remains useful, maintained, portable, and independently deployable.
