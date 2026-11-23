import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Award, BarChart3, BookOpenCheck, BrainCircuit, CalendarDays, Check, ChevronRight, CircleAlert, Clock3, Flame, Flag, Layers3, MapPin, MapPinned, Navigation, Play, Route, Sparkles, Target, TrendingUp, Trophy, WandSparkles, Zap } from 'lucide-react'
import { buildCertificationGps } from '../certifications/certificationGps'
import type { GpsRouteStep } from '../certifications/gpsModels'
import { mentorDashboardData } from '../mentor/dashboardData'
import {
  configuredMentorCoachingService,
  type MentorCoachingInput,
  type MentorCoachingOutput,
} from '../mentor/coaching'
import type { MentorSkill, MentorTask } from '../mentor/models'
import type { Progress, StudyFilter } from '../types'
import { TopicIcon } from './TopicIcon'
import './MentorDashboard.css'

export type MentorView = 'overview' | 'readiness' | 'study-plan' | 'skills' | 'forecast'

interface Props {
  progress: Progress
  now: number
  view: MentorView
  onViewChange: (view: MentorView) => void
  onFlashcards: () => void
  onPractice: (filter?: StudyFilter, mode?: 'practice' | 'exam') => void
  onLibrary: () => void
}

const mentorTabs: { id: MentorView; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'readiness', label: 'Readiness' },
  { id: 'study-plan', label: 'Study plan' },
  { id: 'skills', label: 'Skill progress' },
  { id: 'forecast', label: 'Certification forecast' },
]
const coachingService = configuredMentorCoachingService()

function startTask(task: MentorTask, onFlashcards: () => void, onPractice: Props['onPractice']) {
  if (task.kind === 'review') onFlashcards()
  else onPractice(task.category, task.kind === 'exam' ? 'exam' : 'practice')
}

function startGpsStep(
  step: GpsRouteStep,
  onFlashcards: () => void,
  onPractice: Props['onPractice'],
  onLibrary: () => void,
) {
  if (step.kind === 'flashcards') onFlashcards()
  else if (step.kind === 'module') onLibrary()
  else onPractice(step.filter, step.kind === 'exam' ? 'exam' : 'practice')
}

function CertificationGpsPanel({
  progress,
  now,
  onFlashcards,
  onPractice,
  onLibrary,
}: Pick<Props, 'progress' | 'now' | 'onFlashcards' | 'onPractice' | 'onLibrary'>) {
  const gps = buildCertificationGps(progress, now)
  return <section className="mentor-gps" aria-label="Certification GPS">
    <div className="mentor-gps-heading">
      <div><span className="mentor-kicker"><MapPinned size={13} /> CERTIFICATION GPS</span><h3>Navigate to certification readiness.</h3><p>Your assessment becomes a route with clear stops, roadblocks, and an arrival estimate.</p></div>
      <span className="mentor-gps-live"><i /> Route updated</span>
    </div>
    <div className="mentor-gps-map">
      <div className="gps-location">
        <span className="gps-map-icon"><MapPin size={20} /></span>
        <small>Current location</small>
        <strong>{gps.currentLocation === null ? 'Baseline needed' : `${gps.currentLocation}% Ready`}</strong>
        <span className="gps-meter"><i style={{ width: `${gps.currentLocation ?? 0}%` }} /></span>
      </div>
      <span className="gps-route-line"><i /><Route size={19} /><i /></span>
      <div className="gps-destination">
        <span className="gps-map-icon destination"><Flag size={20} /></span>
        <small>Destination</small>
        <strong>{gps.destination}</strong>
        <span>{gps.distanceRemainingHours.toFixed(1)} study hours remaining</span>
      </div>
      <div className="gps-roadblocks">
        <small>Roadblocks</small>
        {gps.roadblocks.map((roadblock) => <button key={roadblock.skillId} onClick={() => onPractice(roadblock.name as GpsRouteStep['filter'])}>
          <CircleAlert size={14} />
          <span>{roadblock.name}</span>
          <b>{roadblock.score === null ? 'New' : `${roadblock.score}%`}</b>
        </button>)}
      </div>
    </div>
    <div className="mentor-gps-routes">
      <section className="gps-fastest-route">
        <div className="gps-route-heading"><span><Navigation size={16} /> Fastest route</span><small>Optimized for your biggest gaps</small></div>
        <div className="gps-steps">{gps.fastestRoute.map((step, index) => <button key={step.id} onClick={() => startGpsStep(step, onFlashcards, onPractice, onLibrary)}>
          <span className="gps-step-number">{index + 1}</span>
          <span className="gps-step-copy"><strong>{step.title}</strong><small>{step.durationMinutes} min · {step.expectedGainPercent}% potential gain</small></span>
          <ChevronRight size={14} />
        </button>)}</div>
      </section>
      <aside className="gps-arrival">
        <span className="gps-arrival-icon"><Award size={20} /></span>
        <small>Arrival prediction</small>
        <strong>{gps.currentLocation === null ? 'Baseline required' : `${gps.forecast.projectedReadiness}% Readiness`}</strong>
        <p>{gps.currentLocation === null
          ? 'Complete your first assessment'
          : `in ${gps.forecast.days} days at ${gps.forecast.dailyStudyMinutes} min/day`}</p>
        <span className="gps-confidence">{gps.forecast.confidence} signal</span>
        <button onClick={() => startGpsStep(gps.alternativeRoute[0], onFlashcards, onPractice, onLibrary)}>
          <span>Alternative route</span><strong>{gps.alternativeRoute[0].title}</strong><ArrowRight size={14} />
        </button>
      </aside>
    </div>
    <p className="gps-disclaimer"><CircleAlert size={13} /> A learning plan, not an official exam score or pass guarantee.</p>
  </section>
}

function ReadinessOrb({ score, coverage }: { score: number | null; coverage: number }) {
  const displayScore = score ?? coverage
  return <div className="mentor-orb" style={{ '--score': `${displayScore * 3.6}deg` } as React.CSSProperties}>
    <div className="mentor-orb-inner">
      <span>{score === null ? '—' : score}</span>
      <small>{score === null ? 'building evidence' : 'readiness score'}</small>
    </div>
  </div>
}

function TaskList({ tasks, onFlashcards, onPractice, compact = false }: {
  tasks: MentorTask[]
  onFlashcards: () => void
  onPractice: Props['onPractice']
  compact?: boolean
}) {
  return <div className={`mentor-task-list ${compact ? 'compact' : ''}`}>{tasks.map((task, index) => {
    const Icon = task.kind === 'review' ? Layers3 : task.kind === 'exam' ? Trophy : Target
    return <button className="mentor-task" key={task.id} onClick={() => startTask(task, onFlashcards, onPractice)}>
      <span className={`mentor-task-icon task-${index + 1}`}><Icon size={19} /></span>
      <span className="mentor-task-copy"><strong>{task.title}</strong><small>{task.description}</small></span>
      <span className="mentor-task-meta"><span><Clock3 size={12} /> {task.duration}</span><span>+{task.xp} XP</span></span>
      <span className="mentor-task-go"><Play size={13} fill="currentColor" /></span>
    </button>
  })}</div>
}

function SkillRows({ skills, detailed = false, onPractice }: { skills: MentorSkill[]; detailed?: boolean; onPractice: Props['onPractice'] }) {
  return <div className={`mentor-skill-list ${detailed ? 'detailed' : ''}`}>{skills.map((skill) => <button className="mentor-skill-row" key={skill.id} onClick={() => onPractice(skill.name)}>
    <span className="mentor-skill-name"><span className="mentor-topic-icon"><TopicIcon category={skill.name} size={17} /></span><span><strong>{skill.name}</strong>{detailed && <small>{skill.answered ? `${skill.answered} recent answers` : 'No assessed evidence yet'}</small>}</span></span>
    <span className="mentor-skill-track"><span style={{ width: `${skill.score ?? skill.coverage}%` }} /></span>
    <span className="mentor-skill-score">{skill.score === null ? 'New' : `${skill.score}%`}</span>
    <ChevronRight size={14} />
  </button>)}</div>
}

function readinessLabel(status: 'insufficient-evidence' | 'not-ready' | 'nearly-ready' | 'ready') {
  return status === 'insufficient-evidence' ? 'Building evidence' : status.replace('-', ' ')
}

export function MentorDashboard({ progress, now, view, onViewChange, onFlashcards, onPractice, onLibrary }: Props) {
  const data = useMemo(() => mentorDashboardData(progress, now), [progress, now])
  const templateCoaching = useMemo(
    () => coachingService.template(data.coachingInput),
    [data.coachingInput],
  )
  const [providerCoaching, setProviderCoaching] = useState<{
    input: MentorCoachingInput
    output: MentorCoachingOutput
  } | null>(null)
  const coaching = providerCoaching?.input === data.coachingInput
    ? providerCoaching.output
    : templateCoaching
  useEffect(() => {
    let active = true
    coachingService.coach(data.coachingInput).then((output) => {
      if (active) setProviderCoaching({ input: data.coachingInput, output })
    })
    return () => {
      active = false
    }
  }, [data.coachingInput])
  const weakAreas = data.skills.filter((skill) => skill.score !== null).sort((a, b) => (a.score ?? 0) - (b.score ?? 0)).slice(0, 3)
  const strongest = [...data.skills].filter((skill) => skill.score !== null).sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0]
  const confidenceCopy = data.confidence === 'ready'
    ? 'Evidence across your core topics is strong enough for a useful practice summary.'
    : data.confidence === 'building'
      ? 'Your direction is becoming clearer. A few more practice sets will improve this summary.'
      : 'Start with a short baseline drill. Your mentor gets more useful with every assessed answer.'

  return <div className="page-content mentor-dashboard">
    <header className="mentor-heading">
      <div><span className="mentor-eyebrow"><BrainCircuit size={14} /> AI MENTOR · PERSONAL LEARNING COACH</span><h2>Your next best step.</h2><p>A clear, focused path from practice to certification readiness.</p></div>
      <div className="mentor-streak"><span><Flame size={20} fill="currentColor" /></span><div><strong>{progress.activity.length}</strong><small>days learning</small></div></div>
    </header>

    <nav className="mentor-tabs" aria-label="AI mentor views">{mentorTabs.map((tab) => <button key={tab.id} className={view === tab.id ? 'active' : ''} aria-current={view === tab.id ? 'page' : undefined} onClick={() => onViewChange(tab.id)}>{tab.label}</button>)}</nav>

    {view === 'overview' && <>
      <section className="mentor-overview-hero">
        <div className="mentor-coach">
          <span className="mentor-avatar"><WandSparkles size={26} /></span>
          <div><span className="mentor-status"><i /> Mentor update <b>{coaching.mode === 'provider' ? 'AI' : 'LOCAL'}</b></span><h3>{data.readiness === null ? 'Let’s discover your starting point.' : `You’re at ${data.readiness}% readiness — keep the momentum.`}</h3><p>{coaching.message}</p><button className="mentor-primary" onClick={() => startTask(data.tasks[0], onFlashcards, onPractice)}>Start today’s focus <ArrowRight size={16} /></button></div>
        </div>
        <div className="mentor-hero-readiness"><ReadinessOrb score={data.readiness} coverage={data.coverage} /><div><span>Current readiness</span><strong>{data.readiness === null ? 'Baseline needed' : `${data.readiness}% prepared`}</strong><small>{data.evidenceCount} recent evidence points</small></div></div>
      </section>

      <section className="mentor-quick-stats" aria-label="Mentor overview">
        <div><span className="mentor-stat-icon green"><Target size={19} /></span><span><small>Evidence coverage</small><strong>{data.coverage}%</strong><em>{data.coverage >= 50 ? 'Well distributed' : 'Building your map'}</em></span></div>
        <div><span className="mentor-stat-icon amber"><Zap size={19} /></span><span><small>Today’s target</small><strong>15 min</strong><em>3 quick wins</em></span></div>
        <div><span className="mentor-stat-icon purple"><TrendingUp size={19} /></span><span><small>Strongest skill</small><strong>{strongest?.name ?? 'Not yet known'}</strong><em>{strongest ? `${strongest.score}% recent accuracy` : 'Complete a drill'}</em></span></div>
      </section>

      <CertificationGpsPanel progress={progress} now={now} onFlashcards={onFlashcards} onPractice={onPractice} onLibrary={onLibrary} />

      <section className="mentor-card mentor-summary-card" aria-label="IndustrialIQ mentor summary">
        <div className="mentor-summary-heading"><span className="mentor-avatar small"><WandSparkles size={20} /></span><div><span className="mentor-kicker">INDUSTRIALIQ MENTOR · {coaching.mode.toUpperCase()}</span><h3>Your learning signal, summarized.</h3></div></div>
        <p className="mentor-coaching-message">{coaching.message}</p>
        <div className="mentor-summary-grid">
          <div><small>Readiness</small><strong>{coaching.readinessPercent === null ? 'Baseline needed' : `${coaching.readinessPercent}%`}</strong></div>
          <div><small>Top strength</small><strong>{coaching.strongestArea?.name ?? 'Not yet known'}</strong></div>
          <div><small>Biggest gap</small><strong>{coaching.largestGap?.name ?? 'Not yet known'}</strong></div>
          <div><small>Recommended action</small><strong>{coaching.actions[0]?.resourceName ?? data.summary.recommendedAction}</strong></div>
          <div><small>Estimated improvement</small><strong>+{data.summary.estimatedImprovement}%</strong></div>
        </div>
      </section>

      <div className="mentor-overview-grid">
        <section className="mentor-card mentor-recommended">
          <div className="mentor-card-heading"><div><span className="mentor-kicker"><Sparkles size={13} /> PRIORITIZED FOR YOU</span><h3>Recommended next tasks</h3></div><button className="mentor-link" onClick={() => onViewChange('study-plan')}>Full plan <ArrowRight size={13} /></button></div>
          <TaskList tasks={data.tasks} onFlashcards={onFlashcards} onPractice={onPractice} />
        </section>
        <section className="mentor-card mentor-weak-card">
          <div className="mentor-card-heading"><div><span className="mentor-kicker">GROWTH OPPORTUNITIES</span><h3>Areas to strengthen</h3></div><CircleAlert size={19} /></div>
          {weakAreas.length ? <div className="mentor-weak-list">{weakAreas.map((skill, index) => <button key={skill.id} onClick={() => onPractice(skill.name)}><span className={`mentor-rank rank-${index + 1}`}>{index + 1}</span><span><strong>{skill.name}</strong><small>{skill.answered} answers · practice this next</small></span><b>{skill.score}%</b><ArrowRight size={14} /></button>)}</div> : <div className="mentor-empty-growth"><BrainCircuit size={29} /><strong>No weak areas yet — great news?</strong><p>Not quite: your mentor needs evidence first. Complete a baseline drill to reveal your priorities.</p><button className="mentor-link" onClick={() => onPractice()}>Build my baseline <ArrowRight size={13} /></button></div>}
          <div className="mentor-coach-note"><Sparkles size={15} /><p>Your plan updates as you learn. Focus beats cramming.</p></div>
        </section>
      </div>

      <div className="mentor-overview-grid lower">
        <section className="mentor-card">
          <div className="mentor-card-heading"><div><span className="mentor-kicker">THIS WEEK</span><h3>Your study rhythm</h3></div><button className="mentor-link" onClick={() => onViewChange('study-plan')}>View plan <ArrowRight size={13} /></button></div>
          <div className="mentor-week-strip">{data.studyPlan.map((day) => <div className={`mentor-day ${day.state}`} key={day.label}><span>{day.label}</span><strong>{day.date}</strong><i>{day.state === 'done' ? <Check size={11} /> : day.state === 'today' ? <Zap size={10} /> : null}</i><small>{day.minutes}m</small></div>)}</div>
        </section>
        <section className="mentor-card mentor-forecast-mini">
          <span className="mentor-forecast-icon"><Award size={20} /></span><div><span className="mentor-kicker">CERTIFICATION FORECAST</span><h3>{data.forecastDays === null ? 'Forecast warming up' : `On track in ~${data.forecastDays} days`}</h3><p>{data.forecastDays === null ? 'More practice evidence is needed before a timeline is useful.' : 'An estimate based on study rhythm and practice coverage — not a pass guarantee.'}</p></div><button className="mentor-link" onClick={() => onViewChange('forecast')}>See forecast <ArrowRight size={13} /></button>
        </section>
      </div>
    </>}

    {view === 'readiness' && <div className="mentor-detail-layout">
      <section className="mentor-card mentor-readiness-detail">
        <span className="mentor-kicker">CURRENT READINESS</span><h3>Evidence, not guesswork.</h3><p className="mentor-lead">This is an explainable practice summary. It is not an exam pass probability or proof of qualification.</p>
        <div className="mentor-readiness-summary"><ReadinessOrb score={data.readiness} coverage={data.coverage} /><div className="mentor-readiness-metrics"><div><small>Evidence points</small><strong>{data.evidenceCount}</strong></div><div><small>Topic coverage</small><strong>{data.coverage}%</strong></div><div><small>Confidence</small><strong className={`confidence-${data.confidence}`}>{data.confidence}</strong></div></div></div>
        <div className="mentor-confidence-note"><BrainCircuit size={20} /><div><strong>{confidenceCopy}</strong><p>Scores use assessed answers plus lower-weight flashcard self-ratings, adjusted for recency.</p></div></div>
      </section>
      <section className="mentor-card"><div className="mentor-card-heading"><div><span className="mentor-kicker">SIGNALS</span><h3>What shapes this score</h3></div><BarChart3 size={20} /></div><SkillRows skills={data.skills.slice(0, 5)} onPractice={onPractice} /><button className="mentor-secondary" onClick={() => onViewChange('skills')}>Explore every skill <ArrowRight size={15} /></button></section>
      <section className="mentor-card mentor-certification-card">
        <div className="mentor-card-heading"><div><span className="mentor-kicker">CERTIFICATION READINESS</span><h3>Evidence for your next milestone</h3></div><Award size={20} /></div>
        {data.certifications.map((item) => <div className="mentor-readiness-row" key={item.id}><div><strong>{item.name}</strong><small>{readinessLabel(item.status)}</small></div><span>{item.score === null ? '—' : `${item.score}%`}</span></div>)}
      </section>
      <section className="mentor-card mentor-career-card">
        <div className="mentor-card-heading"><div><span className="mentor-kicker">CAREER READINESS</span><h3>Role-aligned competency view</h3></div><TrendingUp size={20} /></div>
        <div className="mentor-career-list">{data.careers.map((career) => <div key={career.id}><span><strong>{career.name}</strong><small>{readinessLabel(career.status)}</small></span><b>{career.score === null ? '—' : `${career.score}%`}</b></div>)}</div>
      </section>
    </div>}

    {view === 'study-plan' && <div className="mentor-detail-layout plan-layout">
      <section className="mentor-card mentor-plan-card"><div className="mentor-card-heading"><div><span className="mentor-kicker"><CalendarDays size={13} /> NEXT 7 DAYS</span><h3>Your focused study plan</h3></div><span className="mentor-time-pill">80 min / week</span></div><div className="mentor-plan-days">{data.studyPlan.map((day, index) => <div className={`mentor-plan-day ${day.state}`} key={`${day.label}-${index}`}><span className="mentor-plan-date"><small>{day.label}</small><strong>{day.date}</strong></span><span className="mentor-plan-line" /><span className="mentor-plan-copy"><strong>{day.title}</strong><small>{day.minutes} minute focused session</small></span>{day.state === 'today' ? <button onClick={() => startTask(data.tasks[0], onFlashcards, onPractice)}>Start <Play size={11} fill="currentColor" /></button> : <Check size={16} />}</div>)}</div></section>
      <section className="mentor-card"><div className="mentor-card-heading"><div><span className="mentor-kicker">TODAY’S PRIORITIES</span><h3>Small sessions. Real progress.</h3></div></div><TaskList tasks={data.tasks} onFlashcards={onFlashcards} onPractice={onPractice} compact /><div className="mentor-plan-tip"><Sparkles size={17} /><p><strong>Mentor tip</strong> Try the hardest topic first, while your attention is highest.</p></div></section>
    </div>}

    {view === 'skills' && <section className="mentor-card mentor-skills-card">
      <div className="mentor-card-heading"><div><span className="mentor-kicker">SKILL PROGRESS</span><h3>Your Ignition Core skill map</h3><p>Question and flashcard behavior flows through skills into competencies, certification, and career readiness.</p></div><button className="mentor-secondary" onClick={onLibrary}>Open learning library <BookOpenCheck size={15} /></button></div>
      <div className="mentor-skill-legend"><span><i className="legend-mastered" /> 80%+ strong</span><span><i className="legend-growing" /> 50–79% growing</span><span><i className="legend-focus" /> below 50% focus</span><span><i className="legend-new" /> no evidence</span></div>
      <SkillRows skills={data.skills} detailed onPractice={onPractice} />
    </section>}

    {view === 'forecast' && <div className="mentor-forecast-page">
      <section className="mentor-card mentor-forecast-hero"><div><span className="mentor-kicker">CERTIFICATION FORECAST</span><h3>{data.forecastDays === null ? 'Build your first evidence window.' : `You’re approximately ${data.forecastDays} days from your target.`}</h3><p>This timeline estimates when continued practice could reach broader evidence coverage. It does not predict an official exam result.</p><button className="mentor-primary" onClick={() => onViewChange('study-plan')}>Follow my study plan <ArrowRight size={16} /></button></div><div className="mentor-forecast-emblem"><Award size={55} /><span>IGNITION<br />CORE</span></div></section>
      <div className="mentor-forecast-factors">
        <section className="mentor-card"><span className="mentor-stat-icon green"><Target size={18} /></span><small>Readiness</small><strong>{data.readiness === null ? 'Not enough data' : `${data.readiness}%`}</strong><p>{data.readiness === null ? 'Complete at least three topic baselines.' : 'Based on your recent assessed answers.'}</p></section>
        <section className="mentor-card"><span className="mentor-stat-icon amber"><Clock3 size={18} /></span><small>Study pace</small><strong>80 min / week</strong><p>Your current plan supports consistent progress.</p></section>
        <section className="mentor-card"><span className="mentor-stat-icon purple"><Layers3 size={18} /></span><small>Evidence coverage</small><strong>{data.coverage}%</strong><p>Practice all core topics for a clearer forecast.</p></section>
      </div>
      <section className="mentor-card mentor-forecast-path"><div className="mentor-card-heading"><div><span className="mentor-kicker">MILESTONE PATH</span><h3>The route to exam-ready practice</h3></div></div><div className="mentor-milestones"><div className="complete"><span><Check size={15} /></span><strong>Start learning</strong><small>Question bank explored</small></div><div className={data.evidenceCount >= 10 ? 'complete' : 'active'}><span>2</span><strong>Build evidence</strong><small>10+ assessed answers</small></div><div className={data.confidence === 'ready' ? 'complete' : ''}><span>3</span><strong>Cover every topic</strong><small>Balanced practice map</small></div><div><span>4</span><strong>Final simulation</strong><small>Review a full practice set</small></div></div><div className="mentor-disclaimer"><CircleAlert size={15} /><p>For learning planning only. Your score is private, stored on this device, and never an employment or safety qualification decision.</p></div></section>
    </div>}
  </div>
}
