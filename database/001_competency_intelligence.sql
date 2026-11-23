BEGIN;

CREATE TABLE graph_versions (
  id uuid PRIMARY KEY,
  label text NOT NULL UNIQUE,
  status text NOT NULL CHECK (status IN ('draft', 'published', 'retired')),
  algorithm_version text NOT NULL,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE skills (
  id uuid PRIMARY KEY,
  stable_key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL,
  decay_half_life_days integer NOT NULL DEFAULT 90 CHECK (decay_half_life_days > 0),
  mastery_threshold numeric(5,2) NOT NULL DEFAULT 80 CHECK (mastery_threshold BETWEEN 0 AND 100)
);

CREATE TABLE competencies (
  id uuid PRIMARY KEY,
  stable_key text NOT NULL UNIQUE,
  name text NOT NULL,
  observable_outcome text NOT NULL,
  proficiency_level text NOT NULL
);

CREATE TABLE competency_skills (
  graph_version_id uuid NOT NULL REFERENCES graph_versions(id),
  competency_id uuid NOT NULL REFERENCES competencies(id),
  skill_id uuid NOT NULL REFERENCES skills(id),
  weight numeric(8,4) NOT NULL CHECK (weight > 0),
  PRIMARY KEY (graph_version_id, competency_id, skill_id)
);

CREATE TABLE certification_versions (
  id uuid PRIMARY KEY,
  graph_version_id uuid NOT NULL REFERENCES graph_versions(id),
  stable_key text NOT NULL,
  version integer NOT NULL,
  name text NOT NULL,
  issuer text NOT NULL,
  mastery_threshold numeric(5,2) NOT NULL DEFAULT 80 CHECK (mastery_threshold BETWEEN 0 AND 100),
  minimum_coverage numeric(4,3) NOT NULL DEFAULT 0.8 CHECK (minimum_coverage BETWEEN 0 AND 1),
  minimum_confidence numeric(4,3) NOT NULL DEFAULT 0.65 CHECK (minimum_confidence BETWEEN 0 AND 1),
  status text NOT NULL CHECK (status IN ('draft', 'published', 'retired')),
  UNIQUE (stable_key, version)
);

CREATE TABLE certification_competencies (
  certification_version_id uuid NOT NULL REFERENCES certification_versions(id) ON DELETE CASCADE,
  competency_id uuid NOT NULL REFERENCES competencies(id),
  weight numeric(8,4) NOT NULL CHECK (weight > 0),
  PRIMARY KEY (certification_version_id, competency_id)
);

CREATE TABLE career_path_versions (
  id uuid PRIMARY KEY,
  graph_version_id uuid NOT NULL REFERENCES graph_versions(id),
  stable_key text NOT NULL,
  version integer NOT NULL,
  name text NOT NULL,
  status text NOT NULL CHECK (status IN ('draft', 'published', 'retired')),
  minimum_coverage numeric(4,3) NOT NULL DEFAULT 0.8 CHECK (minimum_coverage BETWEEN 0 AND 1),
  minimum_confidence numeric(4,3) NOT NULL DEFAULT 0.65 CHECK (minimum_confidence BETWEEN 0 AND 1),
  UNIQUE (stable_key, version)
);

CREATE TABLE career_path_competencies (
  career_path_version_id uuid NOT NULL REFERENCES career_path_versions(id) ON DELETE CASCADE,
  competency_id uuid NOT NULL REFERENCES competencies(id),
  target_score numeric(5,2) NOT NULL CHECK (target_score BETWEEN 0 AND 100),
  weight numeric(8,4) NOT NULL CHECK (weight > 0),
  PRIMARY KEY (career_path_version_id, competency_id)
);

CREATE TABLE learner_evidence (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  graph_version_id uuid NOT NULL REFERENCES graph_versions(id),
  source_type text NOT NULL CHECK (source_type IN ('question', 'flashcard', 'exam', 'module')),
  source_id text NOT NULL,
  source_version_id uuid,
  observed_at timestamptz NOT NULL,
  result numeric(5,2) NOT NULL CHECK (result BETWEEN 0 AND 100),
  confidence numeric(4,3) NOT NULL DEFAULT 1 CHECK (confidence BETWEEN 0 AND 1),
  quality_weight numeric(8,4) NOT NULL DEFAULT 1 CHECK (quality_weight > 0),
  idempotency_key text NOT NULL,
  provenance jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key)
);

CREATE TABLE learner_evidence_skills (
  evidence_id uuid NOT NULL REFERENCES learner_evidence(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES skills(id),
  relevance_weight numeric(8,4) NOT NULL CHECK (relevance_weight > 0),
  PRIMARY KEY (evidence_id, skill_id)
);

CREATE TABLE skill_snapshots (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  graph_version_id uuid NOT NULL REFERENCES graph_versions(id),
  skill_id uuid NOT NULL REFERENCES skills(id),
  algorithm_version text NOT NULL,
  score numeric(5,2) CHECK (score BETWEEN 0 AND 100),
  coverage numeric(4,3) NOT NULL CHECK (coverage BETWEEN 0 AND 1),
  confidence numeric(4,3) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  decay_loss numeric(5,2) NOT NULL CHECK (decay_loss BETWEEN 0 AND 100),
  evidence_count integer NOT NULL CHECK (evidence_count >= 0),
  computed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE competency_snapshots (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  graph_version_id uuid NOT NULL REFERENCES graph_versions(id),
  competency_id uuid NOT NULL REFERENCES competencies(id),
  algorithm_version text NOT NULL,
  score numeric(5,2) CHECK (score BETWEEN 0 AND 100),
  coverage numeric(4,3) NOT NULL CHECK (coverage BETWEEN 0 AND 1),
  confidence numeric(4,3) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  missing_skill_ids uuid[] NOT NULL DEFAULT '{}',
  weak_skill_ids uuid[] NOT NULL DEFAULT '{}',
  computed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE readiness_snapshots (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  target_type text NOT NULL CHECK (target_type IN ('certification', 'career-path')),
  target_version_id uuid NOT NULL,
  algorithm_version text NOT NULL,
  score numeric(5,2) CHECK (score BETWEEN 0 AND 100),
  coverage numeric(4,3) NOT NULL CHECK (coverage BETWEEN 0 AND 1),
  confidence numeric(4,3) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  status text NOT NULL CHECK (status IN ('insufficient-evidence', 'not-ready', 'nearly-ready', 'ready')),
  blocking_competency_ids uuid[] NOT NULL DEFAULT '{}',
  explanation jsonb NOT NULL,
  computed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE review_states (
  user_id uuid NOT NULL,
  content_item_id uuid NOT NULL,
  skill_ids uuid[] NOT NULL,
  due_at timestamptz NOT NULL,
  interval_days integer NOT NULL CHECK (interval_days > 0),
  reviews integer NOT NULL DEFAULT 0 CHECK (reviews >= 0),
  latest_rating text CHECK (latest_rating IN ('again', 'hard', 'good', 'easy')),
  scheduler_version text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, content_item_id)
);

CREATE INDEX learner_evidence_skill_time_idx
  ON learner_evidence (user_id, graph_version_id, observed_at DESC);
CREATE INDEX learner_evidence_source_idx
  ON learner_evidence (user_id, source_type, source_id);
CREATE INDEX review_states_due_idx
  ON review_states (user_id, due_at);
CREATE INDEX skill_snapshots_latest_idx
  ON skill_snapshots (user_id, skill_id, computed_at DESC);
CREATE INDEX competency_snapshots_latest_idx
  ON competency_snapshots (user_id, competency_id, computed_at DESC);
CREATE INDEX readiness_snapshots_latest_idx
  ON readiness_snapshots (user_id, target_type, target_version_id, computed_at DESC);

COMMIT;
