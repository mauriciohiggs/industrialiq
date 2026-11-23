import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, CircleCheck, CircleX, Clock3, Flag, RotateCcw, Target } from 'lucide-react'
import { categories, sourceFor } from '../data/categories'
import { questions } from '../data/bank'
import { analyticsService, createAnalyticsId } from '../analytics/analyticsService'
import { ignitionCoreCourse, ignitionCoreModules } from '../courses/industrial-automation/ignition-core/course'
import { addActivity, categoryStats, createQuiz, filterBank, gradeQuiz } from '../lib/study'
import type { Progress, QuizSession, StudyFilter } from '../types'

interface Props {
  progress: Progress
  onSave: (progress: Progress) => void
  initialFilter: StudyFilter
  initialMode: 'practice' | 'exam'
  filterVersion: number
}

interface Results { session: QuizSession; expired: boolean }

export function Practice({ progress, onSave, initialFilter, initialMode, filterVersion }: Props) {
  return <PracticeInner key={filterVersion} progress={progress} onSave={onSave} initialFilter={initialFilter} initialMode={initialMode} />
}

function PracticeInner({ progress, onSave, initialFilter, initialMode }: Omit<Props, 'filterVersion'>) {
  const [filter, setFilter] = useState<StudyFilter>(initialFilter)
  const [mode, setMode] = useState<'practice' | 'exam'>(initialMode)
  const [count, setCount] = useState(10)
  const [timed, setTimed] = useState(true)
  const [session, setSession] = useState<QuizSession | null>(null)
  const [results, setResults] = useState<Results | null>(null)
  const [clock, setClock] = useState(Date.now)
  const [confirmEnd, setConfirmEnd] = useState(false)
  const attemptRef = useRef<{ id: string; startedAt: number } | null>(null)
  const finishingRef = useRef(false)
  const pool = filterBank(questions, filter, progress)
  const questionCount = Math.min(mode === 'exam' ? 50 : count, pool.length)
  const finish = useCallback((active: QuizSession, expired = false) => {
    if (finishingRef.current) return
    finishingRef.current = true
    const now = Date.now()
    const graded = gradeQuiz(active.questions, active.selections, now)
    const attempt = attemptRef.current ?? { id: createAnalyticsId(), startedAt: now }
    for (const question of active.questions) {
      const selection = active.selections[question.id]
      const module = ignitionCoreModules.find((item) => item.title === question.category)
      if (selection !== undefined) {
        analyticsService.track('Question Answered', {
          courseId: ignitionCoreCourse.id,
          examId: attempt.id,
          moduleId: module?.id ?? question.category,
          questionId: question.id,
          mode: active.mode,
          correct: selection === question.correct,
        })
      }
      if (selection !== question.correct) {
        analyticsService.track('Question Missed', {
          courseId: ignitionCoreCourse.id,
          examId: attempt.id,
          moduleId: module?.id ?? question.category,
          questionId: question.id,
          mode: active.mode,
          unanswered: selection === undefined,
        })
      }
    }
    if (active.mode === 'exam') {
      analyticsService.track('Exam Finished', {
        courseId: ignitionCoreCourse.id,
        examId: attempt.id,
        moduleFilter: filter,
        questionCount: graded.total,
        answeredCount: Object.keys(active.selections).length,
        correctCount: graded.correct,
        incorrectCount: graded.total - graded.correct,
        scorePercent: graded.percentage,
        durationSeconds: Math.max(0, Math.round((now - attempt.startedAt) / 1000)),
        expired,
      })
    }
    onSave({
      ...progress,
      answers: [...progress.answers, ...graded.answers].slice(-2000),
      activity: addActivity(progress, now),
    })
    setResults({ session: active, expired })
    setSession(null)
    setConfirmEnd(false)
  }, [filter, onSave, progress])

  useEffect(() => {
    if (!session?.deadline) return
    const timer = setInterval(() => {
      const now = Date.now()
      setClock(now)
      if (now >= session.deadline!) finish(session, true)
    }, 250)
    return () => clearInterval(timer)
  }, [session, finish])

  function start() {
    const now = Date.now()
    const quiz = createQuiz(pool, mode === 'exam' ? 50 : count)
    const attempt = { id: createAnalyticsId(), startedAt: now }
    attemptRef.current = attempt
    finishingRef.current = false
    if (mode === 'exam') {
      analyticsService.track('Exam Started', {
        courseId: ignitionCoreCourse.id,
        examId: attempt.id,
        moduleFilter: filter,
        questionCount: quiz.length,
        timed,
        durationSeconds: timed ? 90 * 60 : null,
      })
    }
    setClock(now)
    setResults(null)
    setConfirmEnd(false)
    setSession({
      questions: quiz,
      selections: {}, index: 0, mode, deadline: mode === 'exam' && timed ? now + 90 * 60_000 : null, revealed: false,
    })
  }

  if (results) {
    const { questions: quiz, selections } = results.session
    const { answers, correct, percentage } = gradeQuiz(quiz, selections, 0)
    const statsProgress: Progress = {
      ...progress,
      answers,
    }
    return <div className="page-content">
      <div className="panel result-hero"><div className="score-orb">{percentage}<small>%</small></div><div><span className="eyebrow">PRACTICE, REFLECT, REPEAT</span><h2>Every attempt is progress.</h2><p>{correct} of {quiz.length} correct. {results.expired ? 'Time expired; unanswered questions count as incorrect.' : 'Unanswered questions count as incorrect.'}</p><p className="muted">Practice performance only. This is not an official exam score or pass prediction.</p><div className="button-row"><button className="button primary" onClick={start}><RotateCcw size={16} /> Randomize & try again</button><button className="button secondary" onClick={() => setResults(null)}>Change settings</button></div></div></div>
      <h3 className="subheading">Your topic breakdown</h3>
      <div className="result-topics">{categories.map((category) => {
        const stats = categoryStats(quiz, statsProgress, category.name)
        return stats.total > 0 && <div className="panel" key={category.name}><span>{category.name}</span><strong>{stats.accuracy}% <small>{stats.correct}/{stats.total}</small></strong></div>
      })}</div>
      <h3 className="subheading">Review your answers</h3>
      <div className="answer-review">{quiz.map((question, index) => {
        const isCorrect = selections[question.id] === question.correct
        return <details className="panel" key={question.id}><summary>{isCorrect ? <CircleCheck className="positive" size={20} /> : <CircleX className="negative" size={20} />}<span>{index + 1}. {question.question}</span></summary>
          <div className="review-detail"><p><strong>Your answer:</strong> {question.options[selections[question.id]] ?? 'Not answered'}</p><p><strong>Correct answer:</strong> {question.options[question.correct]}</p><p>{question.explanation}</p><a href={sourceFor(question.category)} target="_blank" rel="noreferrer">Official topic reference <ArrowRight size={14} /></a></div>
        </details>
      })}</div>
    </div>
  }

  if (session) {
    const question = session.questions[session.index]
    const selected = session.selections[question.id]
    const seconds = session.deadline ? Math.max(0, Math.ceil((session.deadline - clock) / 1000)) : null
    const finalQuestion = session.index === session.questions.length - 1
    return <div className="page-content narrow">
      <div className="session-top"><span className="pill"><Target size={14} /> {session.mode === 'exam' ? 'Exam simulator' : 'Practice drill'}</span>{seconds !== null && <span className={`timer ${seconds < 300 ? 'negative' : ''}`} aria-label="Time remaining"><Clock3 size={16} /> {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</span>}<button className="text-button" onClick={() => setConfirmEnd(!confirmEnd)}><Flag size={15} /> Finish early</button></div>
      {confirmEnd && <div className="notice" role="alert"><p>Finish this attempt? Unanswered questions will count as incorrect.</p><div className="button-row"><button className="button primary" onClick={() => finish(session)}>Finish & score</button><button className="button secondary" onClick={() => setConfirmEnd(false)}>Keep studying</button></div></div>}
      <div className="quiz-progress"><span>Question {session.index + 1} of {session.questions.length}</span><span>{Object.keys(session.selections).length} answered</span></div>
      <div className="progress-track"><span style={{ width: `${(session.index + 1) / session.questions.length * 100}%` }} /></div>
      <div className="panel question-panel">
        <span className="eyebrow">{question.category}</span><h2>{question.question}</h2>
        <div className="answer-options" role="group" aria-label="Answer choices">{question.choices.map((choice, index) => {
          const right = session.revealed && choice.originalIndex === question.correct
          const wrong = session.revealed && choice.originalIndex === selected && selected !== question.correct
          return <button key={choice.originalIndex} disabled={session.revealed} aria-pressed={selected === choice.originalIndex} className={`answer-option ${selected === choice.originalIndex ? 'selected' : ''} ${right ? 'correct' : ''} ${wrong ? 'incorrect' : ''}`} onClick={() => setSession({ ...session, selections: { ...session.selections, [question.id]: choice.originalIndex } })}><span className="answer-letter">{String.fromCharCode(65 + index)}</span><span>{choice.text}</span>{right && <Check size={19} />}{wrong && <CircleX size={19} />}</button>
        })}</div>
        {session.revealed && <div className="explanation" role="status"><strong>{selected === question.correct ? 'That is correct.' : 'A learning moment.'}</strong><p>{question.explanation}</p><a href={sourceFor(question.category)} target="_blank" rel="noreferrer">Read the official topic reference <ArrowRight size={14} /></a></div>}
        <div className="question-actions">
          {session.mode === 'exam' ? <button className="button secondary" disabled={session.index === 0} onClick={() => setSession({ ...session, index: session.index - 1 })}><ArrowLeft size={16} /> Previous</button> : <span className="muted">One question at a time.</span>}
          {session.mode === 'practice' && !session.revealed ? <button className="button primary" disabled={selected === undefined} onClick={() => setSession({ ...session, revealed: true })}>Check answer <Check size={16} /></button> : <button className="button primary" onClick={() => finalQuestion ? finish(session) : setSession({ ...session, index: session.index + 1, revealed: false })}>{finalQuestion ? 'Finish & see results' : 'Next question'} <ArrowRight size={16} /></button>}
        </div>
      </div>
      <p className="session-footnote">{session.mode === 'exam' ? 'No answer feedback until you finish. Use Previous to revisit your answers.' : 'Questions and answer choices are shuffled for every new attempt.'}</p>
    </div>
  }

  return <div className="page-content narrow">
    <div className="section-heading"><div><span className="eyebrow">TURN KNOWLEDGE INTO CONFIDENCE</span><h2>Your next practice starts here.</h2><p>Fresh question order. Shuffled choices. A clearer picture of what you know.</p></div><Target className="heading-icon" /></div>
    <div className="panel setup-panel">
      <div className="mode-options">
        <button className={`mode-option ${mode === 'practice' ? 'selected' : ''}`} onClick={() => setMode('practice')}><Target /><strong>Practice drill</strong><span>Learn with immediate explanations</span></button>
        <button className={`mode-option ${mode === 'exam' ? 'selected' : ''}`} onClick={() => setMode('exam')}><Clock3 /><strong>Exam simulator</strong><span>Up to 50 questions, focused practice</span></button>
      </div>
      <div className="field-row"><label>Learning module or selection<select value={filter} onChange={(event) => setFilter(event.target.value as StudyFilter)}><option>All topics</option><option>Missed questions</option>{categories.map((category) => <option key={category.name}>{category.name}</option>)}</select></label>
        {mode === 'practice' ? <label>Session length<select value={count} onChange={(event) => setCount(Number(event.target.value))}><option value={10}>Quick drill / 10 questions</option><option value={25}>Deep dive / 25 questions</option><option value={50}>Long practice / 50 questions</option></select></label> : <label>Timer<select value={timed ? 'timed' : 'untimed'} onChange={(event) => setTimed(event.target.value === 'timed')}><option value="timed">Timed / 90 minutes</option><option value="untimed">Untimed / at your pace</option></select></label>}
      </div>
      <div className="setup-footer"><p><strong>{questionCount}</strong> unique questions <span className="muted">from {pool.length} available</span></p><button className="button primary" disabled={questionCount === 0} onClick={start}>Start {mode === 'exam' ? 'exam' : 'practice'} <ArrowRight size={16} /></button></div>
      {questionCount === 0 && <p className="empty-note">No missed questions yet. Try an all-topic drill first.</p>}
    </div>
    <div className="info-strip"><Flag size={22} /><div><strong>A simulator, not an exam dump</strong><p>These are original community practice questions for Ignition 8.1. Topic weighting, difficulty, and format are not a reproduction of the official certification assessment. Smaller banks use every available question without repeats.</p></div></div>
  </div>
}
