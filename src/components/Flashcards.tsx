import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Clock3, RotateCcw, Sparkles, Zap } from 'lucide-react'
import { categories, sourceFor } from '../data/categories'
import { questions } from '../data/bank'
import { addActivity, filterBank, reviewQueue, scheduleCard } from '../lib/study'
import type { Progress, Question, Rating, StudyFilter } from '../types'

interface Props {
  progress: Progress
  now: number
  onSave: (progress: Progress) => void
}

function ReviewCard({ question, lightning, progress, onRate }: {
  question: Question; lightning: boolean; progress: Progress; onRate: (rating: Rating) => void
}) {
  const [revealed, setRevealed] = useState(false)
  const [deadline] = useState(() => Date.now() + 15_000)
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    if (!lightning || revealed) return
    const timer = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(timer)
  }, [lightning, revealed])
  const seconds = Math.max(0, Math.ceil((deadline - now) / 1000))
  const showAnswer = revealed || (lightning && seconds === 0)
  const ratings: { value: Rating; label: string }[] = [
    { value: 'again', label: 'Again' }, { value: 'hard', label: 'Hard' },
    { value: 'good', label: 'Good' }, { value: 'easy', label: 'Easy' },
  ]
  return <>
    <div className={`flashcard ${showAnswer ? 'is-revealed' : ''}`}>
      <div className="card-overline"><span>{question.category}</span><span>{lightning ? <><Clock3 size={14} /> {seconds}s</> : 'ACTIVE RECALL'}</span></div>
      <span className="eyebrow">{showAnswer ? 'THE ANSWER' : 'THINK IT THROUGH'}</span>
      <h2>{question.question}</h2>
      {showAnswer ? <div className="flash-answer">
        <h3>{question.options[question.correct]}</h3>
        <p>{question.explanation}</p>
        <a href={sourceFor(question.category)} target="_blank" rel="noreferrer">Explore the official documentation <ArrowRight size={14} /></a>
      </div> : <p className="muted">Try answering out loud before you turn the card.</p>}
      {!showAnswer && <button className="button primary" onClick={() => setRevealed(true)}>Reveal answer <RotateCcw size={17} /></button>}
    </div>
    {showAnswer && <div className="rating-area">
      <p>How well did you remember? <span className="muted">Choose your next review.</span></p>
      <div className="rating-buttons">{ratings.map(({ value, label }) => {
        const interval = scheduleCard(progress.cards[question.id], value, now).interval
        return <button key={value} className={`rating ${value}`} onClick={() => onRate(value)}>
          <strong>{label}</strong><span>{interval} {interval === 1 ? 'day' : 'days'}</span>
        </button>
      })}</div>
    </div>}
  </>
}

export function Flashcards({ progress, now, onSave }: Props) {
  const [filter, setFilter] = useState<StudyFilter>('All topics')
  const [lightning, setLightning] = useState(false)
  const [queue, setQueue] = useState<Question[] | null>(null)
  const [index, setIndex] = useState(0)
  const [attempt, setAttempt] = useState(0)
  const [finished, setFinished] = useState(false)
  const pool = filterBank(questions, filter, progress)
  const due = pool.filter((question) => !progress.cards[question.id] || progress.cards[question.id].due <= now)

  function start(ahead = false) {
    setQueue(reviewQueue(pool, progress, Date.now(), ahead || lightning).slice(0, lightning ? 100 : 30))
    setIndex(0)
    setFinished(false)
    setAttempt((value) => value + 1)
  }

  function rate(rating: Rating) {
    if (!queue) return
    const question = queue[index]
    const now = Date.now()
    onSave({
      ...progress,
      cards: { ...progress.cards, [question.id]: scheduleCard(progress.cards[question.id], rating, now) },
      activity: addActivity(progress, now),
    })
    if (index + 1 === queue.length) setFinished(true)
    else setIndex(index + 1)
  }

  return <div className="page-content narrow">
    <div className="section-heading"><div><span className="eyebrow">MAKE IT STICK</span><h2>Small cards. Lasting knowledge.</h2><p>Recall first. Reveal second. Review when it matters.</p></div><Sparkles className="heading-icon" /></div>
    {!queue || queue.length === 0 ? <>
      <div className="panel setup-panel">
        <div className="field-row"><label>Learning module or selection<select value={filter} onChange={(event) => setFilter(event.target.value as StudyFilter)}>
          <option>All topics</option><option>Missed questions</option>{categories.map((category) => <option key={category.name}>{category.name}</option>)}
        </select></label></div>
        <div className="mode-options">
          <button className={`mode-option ${!lightning ? 'selected' : ''}`} onClick={() => setLightning(false)}><RotateCcw /><strong>Spaced repetition</strong><span>Up to 30 new & due cards</span></button>
          <button className={`mode-option ${lightning ? 'selected' : ''}`} onClick={() => setLightning(true)}><Zap /><strong>Lightning round</strong><span>Up to 100 cards, 15s to recall</span></button>
        </div>
        <div className="setup-footer"><p><strong>{lightning ? pool.length : due.length}</strong> cards ready <span className="muted">/ {pool.length} in this selection</span></p><button className="button primary" disabled={!(lightning ? pool.length : due.length)} onClick={() => start()}>Start reviewing <ArrowRight size={16} /></button></div>
        {due.length === 0 && pool.length > 0 && !lightning && <p className="empty-note">You're caught up. <button className="text-button" onClick={() => start(true)}>Study ahead instead</button></p>}
        {pool.length === 0 && <p className="empty-note">No cards in this selection. Answer practice questions to build a missed-question bank.</p>}
      </div>
      <div className="info-strip"><Clock3 size={21} /><div><strong>A rhythm that works for you</strong><p>Anki-inspired, not the Anki algorithm: first reviews are 1, 3, 7, or 21 days away. Successful reviews expand the interval; Again resets it to one day. Overdue, missed, and weaker topics are prioritized.</p></div></div>
    </> : finished ? <div className="panel completion">
      <div className="success-orb"><Check size={30} /></div><span className="eyebrow">ONE SESSION STRONGER</span>
      <h2>{queue.length} cards reviewed.</h2><p>Your next reviews are scheduled. A little consistency goes a long way.</p>
      <button className="button primary" onClick={() => setQueue(null)}>Back to review setup <ArrowRight size={16} /></button>
    </div> : <>
      <div className="session-top"><button className="text-button" onClick={() => setQueue(null)}><ArrowLeft size={15} /> End review</button><span>Card {index + 1} of {queue.length}</span></div>
      <div className="progress-track"><span style={{ width: `${index / queue.length * 100}%` }} /></div>
      <ReviewCard key={`${attempt}-${index}`} question={queue[index]} lightning={lightning} progress={progress} onRate={rate} />
    </>}
  </div>
}
