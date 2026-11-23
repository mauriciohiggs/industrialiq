import { Award, Flame, TrendingUp } from 'lucide-react'
import { categories } from '../data/categories'
import { questions } from '../data/bank'
import { categoryStats, localDate, streak } from '../lib/study'
import type { Progress } from '../types'
import { TopicIcon } from './TopicIcon'

export function Analytics({ progress, now }: { progress: Progress; now: number }) {
  const stats = categoryStats(questions, progress)
  const days = streak(progress.activity, now)
  const activity = new Set(progress.activity)
  const recent = Array.from({ length: 28 }, (_, index) => {
    const date = new Date(now)
    date.setDate(date.getDate() - 27 + index)
    return localDate(date.getTime())
  })
  const badges = categories.filter((category) => {
    const result = categoryStats(questions, progress, category.name)
    return result.total >= 5 && result.accuracy! >= 80
  })
  return <div className="page-content">
    <div className="section-heading"><div><span className="eyebrow">YOUR EFFORT, MADE VISIBLE</span><h2>Progress over perfection.</h2><p>Real study data. No invented pass predictions.</p></div><TrendingUp className="heading-icon" /></div>
    <div className="stats-grid analytics-stats"><div className="panel"><TargetMetric label="Recent practice accuracy" value={stats.accuracy === null ? '--' : `${stats.accuracy}%`} note={`Based on your last ${stats.total} scored answers (up to 200).`} /></div><div className="panel"><TargetMetric label="Saved answers" value={String(progress.answers.length)} note="The most recent 2,000 answers are retained." /></div><div className="panel"><TargetMetric label="Current streak" value={`${days} ${days === 1 ? 'day' : 'days'}`} note="Quiz completions and flashcard ratings count." /></div></div>
    <div className="analytics-layout">
      <section className="panel breakdown-panel"><h3>Topic confidence map</h3><p className="muted">Practice accuracy by topic across the last 200 answers. A small sample is only a starting point.</p><div className="topic-bars">{categories.map((category) => {
        const result = categoryStats(questions, progress, category.name)
        const level = result.accuracy === null ? 'unseen' : result.accuracy < 60 ? 'needs-review' : result.accuracy < 80 ? 'developing' : 'strong'
        return <div key={category.name} className={`topic-bar-row ${level}`}><div><span><TopicIcon category={category.name} size={17} />{category.name}</span><strong>{result.accuracy === null ? 'Not studied' : `${result.accuracy}%`}<small>{result.total} answers</small></strong></div><div className="progress-track"><span style={{ width: `${result.accuracy ?? 0}%` }} /></div></div>
      })}</div><div className="chart-legend"><span>Below 60% / review</span><span>60-79% / developing</span><span>80%+ / strong practice</span></div></section>
      <div className="analytics-side"><section className="panel"><div className="section-title"><h3>A habit in the making</h3><Flame size={20} /></div><p className="muted">Your last 28 days, oldest to newest.</p><div className="activity-grid">{recent.map((day) => <div key={day} className={`activity-day ${activity.has(day) ? 'active' : ''}`} role="img" aria-label={`${day}: ${activity.has(day) ? 'studied' : 'no study recorded'}`} title={`${day}: ${activity.has(day) ? 'studied' : 'no study recorded'}`} />)}</div><p className="small muted">Study days use your device's local time.</p></section>
      <section className="panel"><div className="section-title"><h3>Earned milestones</h3><Award size={20} /></div><p className="muted">At least five recent answers in a topic with 80%+ accuracy unlocks its badge.</p>{badges.length === 0 && days < 7 ? <div className="empty-badges"><Award size={32} /><p>Your first milestone is ahead.<br />Keep showing up.</p></div> : <div className="badges">{badges.map((category) => <span className="earned-badge" key={category.name}><TopicIcon category={category.name} size={16} />{category.name} Explorer</span>)}{days >= 7 && <span className="earned-badge"><Flame size={16} />7-Day Streak</span>}{days >= 30 && <span className="earned-badge">30-Day Streak</span>}{days >= 100 && <span className="earned-badge">100-Day Streak</span>}</div>}</section></div>
    </div>
  </div>
}

function TargetMetric({ label, value, note }: { label: string; value: string; note: string }) {
  return <div className="target-metric"><span>{label}</span><strong>{value}</strong><p>{note}</p></div>
}
