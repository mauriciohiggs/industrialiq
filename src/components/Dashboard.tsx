import { ArrowDownToLine, ArrowRight, BookOpen, Check, ChevronRight, Clock3, Flame, Layers3, LockKeyhole, Shuffle, Sparkles, Target, Zap } from 'lucide-react'
import { categories } from '../data/categories'
import { questions } from '../data/bank'
import { categoryStats, streak } from '../lib/study'
import type { Progress, StudyFilter } from '../types'
import { TopicIcon } from './TopicIcon'
import { ignitionCoreCourse, ignitionCoreModules } from '../courses/industrial-automation/ignition-core/course'

interface Props {
  progress: Progress
  now: number
  onFlashcards: () => void
  onPractice: (filter?: StudyFilter, mode?: 'practice' | 'exam') => void
  onBank: () => void
  onAnalytics: () => void
}

export function Dashboard({ progress, now, onFlashcards, onPractice, onBank, onAnalytics }: Props) {
  const stats = categoryStats(questions, progress)
  const ready = questions.filter((question) => !progress.cards[question.id] || progress.cards[question.id].due <= now).length
  const studied = Object.keys(progress.cards).filter((id) => questions.some((question) => question.id === id)).length
  const days = streak(progress.activity, now)
  const weak = categories.map((category) => ({ ...category, stats: categoryStats(questions, progress, category.name) }))
    .filter((category) => category.stats.total > 0).sort((a, b) => a.stats.accuracy! - b.stats.accuracy!).slice(0, 3)
  return <div className="page-content dashboard">
    <div className="welcome-line"><div><span className="eyebrow">INDUSTRIALIQ / INDUSTRIAL AUTOMATION / IGNITION CORE</span><h2>IndustrialIQ</h2><p>Start with the Ignition Core learning track.</p></div><div className="version-pill"><span /> IGNITION 8.1</div></div>
    <section className="hero-panel">
      <div className="hero-copy"><span className="hero-label"><span /> INDUSTRIALIQ</span><h2>Build Competence.<br /><span>Earn Certifications.</span><br />Advance Your Career.</h2><p>AI-powered competency tracking, certification preparation, and industrial workforce development.</p><p>AI and competency tracking are planned. Start today with free Ignition Core practice and spaced review.</p><div className="button-row"><button className="button lime" onClick={onFlashcards}>Study Ignition Core <ArrowRight size={18} /></button><button className="hero-secondary" onClick={() => onPractice()}>Take a quick drill <ChevronRight size={17} /></button></div><div className="hero-meta"><span><Check size={14} /> Free current track</span><span><Check size={14} /> No account needed</span><span><Check size={14} /> Open source</span></div></div>
      <div className="hero-art" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="orbit-dot dot-one" /><div className="orbit-dot dot-two" /><div className="floating-topic float-tags"><TopicIcon category="Tags" size={18} /><span>Tags</span></div><div className="floating-topic float-security"><LockKeyhole size={17} /><span>Security</span></div><div className="core-emblem"><Zap size={69} strokeWidth={1.5} fill="currentColor" /></div><div className="art-caption">LEARN. RECALL. MASTER.<span>One concept at a time.</span></div></div>
    </section>
    <section className="tracks-section" aria-labelledby="tracks-heading">
      <div className="section-title"><h3 id="tracks-heading">Explore learning tracks</h3></div>
      <div className="tracks-grid">
        <button className="track-card available" onClick={onBank}><strong>Industrial Automation</strong><span>{ignitionCoreCourse.title} / {ignitionCoreModules.length} learning modules</span><span>Explore course <ArrowRight size={14} /></span></button>
        {['Cybersecurity', 'Engineering', 'Manufacturing'].map((track) => <article className="track-card" key={track}><strong>{track}</strong><span>Coming Soon</span></article>)}
      </div>
    </section>
    <section className="stats-grid" aria-label="Study overview">
      <div className="stat-card"><span className="stat-icon teal"><Layers3 size={20} /></span><div><span>Ready to review</span><strong>{ready} <small>cards</small></strong><p>New + due for a refresh</p></div></div>
      <div className="stat-card"><span className="stat-icon blue"><Target size={20} /></span><div><span>Practice accuracy</span><strong>{stats.accuracy === null ? '--' : `${stats.accuracy}%`}</strong><p>{stats.total ? `Last ${stats.total} scored answers` : 'Your first drill starts the story'}</p></div></div>
      <div className="stat-card"><span className="stat-icon amber"><Flame size={20} /></span><div><span>Study streak</span><strong>{days} <small>{days === 1 ? 'day' : 'days'}</small></strong><p>{days ? 'Keep your momentum going' : 'Make today day one'}</p></div></div>
      <div className="stat-card"><span className="stat-icon purple"><BookOpen size={20} /></span><div><span>Cards explored</span><strong>{studied}<small> / {questions.length}</small></strong><p>Nine topics. One strong foundation.</p></div></div>
    </section>
    <section>
      <div className="section-title"><h3>Find your study flow <span className="mini-label">PICK A MODE</span></h3><span className="muted small">Made for the way you learn</span></div>
      <div className="study-mode-grid">
        <button className="study-mode-card" onClick={onFlashcards}><div className="mode-card-top"><span className="tile-icon teal"><Layers3 /></span><span className="small-tag">SMART REVIEW</span></div><h3>Flashcards</h3><p>Recall, reveal, repeat. Spaced repetition brings the right concepts back at the right time.</p><div className="mode-card-bottom"><span><Clock3 size={14} /> Your own pace</span><span className="circle-arrow"><ArrowRight size={17} /></span></div></button>
        <button className="study-mode-card" onClick={() => onPractice()}><div className="mode-card-top"><span className="tile-icon blue"><Shuffle /></span><span className="small-tag">A FRESH CHALLENGE</span></div><h3>Quick drill</h3><p>Ten randomized questions. Instant explanations. Turn a spare moment into real progress.</p><div className="mode-card-bottom"><span><Target size={14} /> 10 questions</span><span className="circle-arrow"><ArrowRight size={17} /></span></div></button>
        <button className="study-mode-card exam-mode" onClick={() => onPractice('All topics', 'exam')}><div className="mode-card-top"><span className="tile-icon amber"><Clock3 /></span><span className="small-tag">PUT IT ALL TOGETHER</span></div><h3>Exam simulator</h3><p>Build focus with a full-length practice session and discover the topics that need a second look.</p><div className="mode-card-bottom"><span><Clock3 size={14} /> 50 questions / 90 min</span><span className="circle-arrow"><ArrowRight size={17} /></span></div></button>
      </div>
    </section>
    <div className="dashboard-lower">
      <section><div className="section-title"><h3>Explore Ignition Core topics</h3><button className="text-button" onClick={onBank}>View library <ArrowRight size={14} /></button></div><div className="topic-grid">{categories.map((category) => <button className="topic-card" key={category.name} onClick={() => onPractice(category.name)}><span className={`topic-icon ${category.color}`}><TopicIcon category={category.name} /></span><span><strong>{category.name}</strong><small>{questions.filter((question) => question.category === category.name).length} questions</small></span><ChevronRight size={15} /></button>)}</div></section>
      <aside className="focus-panel"><div className="focus-heading"><Sparkles size={19} /><span>YOUR LEARNING COMPASS</span></div><h3>{weak.length ? 'Give these a little attention.' : 'Your starting point is here.'}</h3><p>{weak.length ? 'Your lowest-scoring topics, based on recent practice. Every review helps.' : 'Take your first drill to discover your strengths and the concepts worth another look.'}</p>{weak.length ? <div className="weak-topics">{weak.map((category) => <button key={category.name} onClick={() => onPractice(category.name)}><span>{category.name}</span><strong>{category.stats.accuracy}% <ArrowRight size={14} /></strong></button>)}</div> : <div className="starting-steps"><span><span>1</span> Try a quick practice drill</span><span><span>2</span> Review your explanations</span><span><span>3</span> Make recall a daily habit</span></div>}<button className="button secondary" onClick={weak.length ? onAnalytics : () => onPractice()}>{weak.length ? 'See your progress' : 'Find my starting point'} <ArrowRight size={15} /></button></aside>
    </div>
    <div className="community-strip"><span className="community-symbol"><ArrowDownToLine size={22} /></span><div><strong>Knowledge is better when it's shared.</strong><p>Original questions. Open source. Built to grow with the community.</p></div><span className="pill">FREE FOREVER</span></div>
  </div>
}
