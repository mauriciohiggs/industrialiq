# IndustrialIQ Competency Intelligence Engine

## Scope and safety boundary

The engine converts versioned learning evidence into explainable skill, competency, certification, and career-path scores. A readiness score is an **evidence-coverage indicator**, not a probability of passing an exam, proof of qualification, or an employment decision.

The calculation core is [`src/analytics/competencyEngine.ts`](src/analytics/competencyEngine.ts). The target relational model is [`database/001_competency_intelligence.sql`](database/001_competency_intelligence.sql). The current application remains local-first and is not connected to these backend tables yet.

## Inputs

Every evidence event contains:

- A unique event and idempotency identity.
- Source: `question`, `flashcard`, `exam`, or `module`.
- A source/content version identity and observation time.
- A 0-100 normalized result.
- One or more skill mappings with positive relevance weights.
- Optional assessor confidence and quality weights.
- Immutable provenance and graph/algorithm versions.

Questions and exams may produce assessed evidence. A flashcard rating is self-assessment and receives lower reliability by default. Module completion alone is low-quality learning evidence; completion with a scored assessment may produce a separate, stronger event.

Published graph rows are immutable. Skill, competency, certification, and career-path mappings are reviewed and versioned together before use.

## Algorithms

### Evidence reliability

Default source reliability:

| Source | Reliability |
| --- | ---: |
| Exam | 1.00 |
| Question | 0.80 |
| Module | 0.50 |
| Flashcard self-rating | 0.25 |

An event's base weight for a mapped skill is:

```text
baseWeight =
  mappingWeight
  × sourceReliability
  × assessorConfidence
  × qualityWeight
  × repetitionWeight
```

`repetitionWeight = 0.5^r`, where `r` is the zero-based recency rank of attempts on the same source identity. This preserves retakes without allowing many attempts on one item to dominate independent evidence.

### Knowledge decay

For a skill with half-life `H` days, evidence observed `d` days ago has:

```text
retention = 0.5^(max(0, d) / H)
```

The default half-life is 90 days and can be configured per skill. Future-dated evidence has zero age. The score is retained toward zero over time, so a single 90-day-old 100% result cannot remain 100% forever.

```text
retainedScore = Σ(score × baseWeight × retention) / Σ(baseWeight)
decayLoss     = originalWeightedScore - retainedScore
```

### Skill mastery

```text
originalWeightedScore = Σ(score × baseWeight) / Σ(baseWeight)
skillScore            = Σ(score × baseWeight × retention) / Σ(baseWeight)
effectiveEvidence     = Σ(baseWeight × retention)
coverage              = clamp(effectiveEvidence / 6, 0, 1)
diversity             = clamp(distinctSourceTypes / 4, 0, 1)
confidence            = coverage × (0.5 + 0.5 × diversity)
```

No evidence returns `null`, not zero. A skill is:

- `weak`: score below 70.
- `developing`: below the skill mastery threshold or below the required coverage.
- `mastered`: score and coverage meet the configured gates.
- `no-evidence`: no valid mapped evidence.

The coverage reference, diversity target, and thresholds are configuration values and are stored with the algorithm version used to compute a snapshot.

### Competency mastery

Competencies use reviewed skill weights:

```text
competencyScore =
  Σ(availableSkillScore × skillWeight) / Σ(availableSkillWeight)
```

Coverage is `Σ(evidencedSkillWeight) / Σ(allSkillWeight)`. Missing skills stay `null` and are explicitly reported; they are never treated as zero inside the score. Confidence is the weighted mean of skill confidence.

### Weakness detection

Each skill receives a 0-100 learning priority:

```text
masteryGap = missing ? 1 : clamp((80 - score) / 80, 0, 1)
coverageGap = 1 - coverage
decayRisk = decayLoss / originalWeightedScore

priority = 100 × (
  0.45 × masteryGap +
  0.40 × coverageGap +
  0.15 × decayRisk
)
```

The primary reason is `no-evidence`, `low-mastery`, `low-confidence`, or `knowledge-decay`. Consumers should combine this priority with product constraints such as prerequisites, daily workload, and accessibility.

### Certification readiness

Certification readiness is the weighted aggregation of competency scores:

```text
score = Σ(availableCompetencyScore × competencyWeight)
        / Σ(availableCompetencyWeight)
```

Coverage and confidence are weighted across all required competencies. The output state is:

- `insufficient-evidence` when score is missing or coverage/confidence gates fail.
- `ready` when evidence gates pass and score meets the certification threshold.
- `nearly-ready` when evidence gates pass and score is at least 70 but below threshold.
- `not-ready` otherwise.

The engine returns blocking competencies and never emits a pass probability.

### Career readiness

Career paths map competencies to target levels. Each competency contributes:

```text
targetAttainment = min(100, competencyScore / targetScore × 100)
careerScore      = weighted average of targetAttainment
```

Career readiness is `ready` only when all evidence gates pass and the normalized weighted attainment is 100. Targets can vary by role rather than forcing every career path to use the same mastery cutoff.

### Spaced repetition weighting

Scheduling remains in the existing learner state model. Candidate ordering combines:

```text
queuePriority =
  0.70 × weaknessPriority
  + 25 × min(overdueDays / intervalDays, 1)
  + 5 when due
```

The highest current learning weakness on the card is identified for explanations. Scheduling uses the current `Again/Hard/Good/Easy` intervals, while queue priority prevents a hard-to-learn skill from being starved by recently due easy cards.

## Database model

The SQL schema separates immutable graph definitions, append-only learner evidence, and reproducible snapshots:

- `graph_versions`, `competency_skills`: versioned weighted mappings.
- `certification_versions`, `certification_competencies`: evidence-based certification targets.
- `career_path_versions`, `career_path_competencies`: role-specific target levels.
- `learner_evidence`, `learner_evidence_skills`: idempotent event ingestion and many-to-many skill mapping.
- `skill_snapshots`, `competency_snapshots`: explainable rollups with algorithm version, coverage, and confidence.
- `readiness_snapshots`: certification/career state with blockers and explanation JSON.
- `review_states`: due date, interval, rating, and scheduler version.

Required backend guarantees:

1. Enforce graph-version membership with composite foreign keys in service-specific migrations.
2. Treat learner data as tenant/user scoped and authorize every read and write.
3. Make evidence ingestion idempotent by `(user_id, idempotency_key)`.
4. Append snapshots; never overwrite history needed to audit a readiness result.
5. Validate a graph is acyclic and publish it atomically.
6. Store explanations from exact evidence and graph/algorithm versions.

## Implementation plan

### Phase 1: Graph foundation

1. Curate observable skills and competencies with subject-matter review.
2. Map questions, flashcards, exams, and modules to approved weighted skill relationships.
3. Add version/publication validation and provenance.
4. Preserve unmapped learning content without generating competency evidence.

**Gate:** reviewed graph, immutable versions, and deterministic validation fixtures.

### Phase 2: Local intelligence adapter

1. Convert existing `Progress.answers` into question evidence without changing the version-1 export format.
2. Convert flashcard ratings into explicitly labeled self-assessment evidence at lower reliability.
3. Use existing modules and categories only for grouping, not automatic competency assertions.
4. Show score, coverage, confidence, decay, and blockers separately.

**Gate:** backwards-compatible storage/import/export tests and no implied certification prediction.

### Phase 3: Evidence service

1. Deploy the PostgreSQL schema behind a modular-monolith service.
2. Ingest learning events transactionally and idempotently.
3. Recalculate affected skill snapshots asynchronously, then roll up competency/readiness snapshots.
4. Use an outbox/job model and exact graph/algorithm versions for replay.

**Gate:** replay produces identical snapshots; partial jobs are retryable.

### Phase 4: Readiness experience

1. Add skill and competency detail views with evidence provenance.
2. Recommend weak and decayed skills into the spaced-review queue.
3. Label insufficient evidence prominently and provide a remediation path.
4. Add certification and career dashboards only after reviewed target mappings exist.

**Gate:** usability, accessibility, privacy, and explanatory-language review.

### Phase 5: Calibration and governance

1. Collect consented, representative outcomes with retention controls.
2. Calibrate decay, weights, coverage, and thresholds offline.
3. Evaluate subgroup performance, drift, and minimum-evidence behavior.
4. Version changes and maintain a changelog from score input to output.

**Gate:** no pass-probability feature until validated calibration evidence exists.

## Acceptance tests

- Missing skills remain `null`, never zero or a fabricated score.
- Flashcard-only evidence cannot satisfy high-confidence readiness.
- Evidence halves exactly at one skill half-life.
- Repeated attempts on one source have diminishing weight.
- Invalid scores, duplicate IDs, unknown mappings, and invalid weights fail explicitly.
- Replaying a snapshot with the same evidence, graph, time, and algorithm version is identical.
- Readiness exposes coverage, confidence, blockers, and algorithm version.
- Existing version-1 progress imports and local-first study flows remain unchanged.
