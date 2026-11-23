import { useEffect, useRef, useState } from 'react'
import { ArrowDownToLine, ArrowRight, BookOpen, ChartNoAxesCombined, Check, ChevronRight, CircleHelp, Code2, Download, ExternalLink, FileQuestion, Flame, Globe, Heart, LayoutDashboard, Layers3, Menu, Search, ShieldCheck, Target, Upload, Users, X, Zap } from 'lucide-react'
import { Analytics } from './components/Analytics'
import { Dashboard } from './components/Dashboard'
import { Flashcards } from './components/Flashcards'
import { Practice } from './components/Practice'
import { TopicIcon } from './components/TopicIcon'
import { questions } from './data/bank'
import { categories, sourceFor } from './data/categories'
import { emptyProgress, streak } from './lib/study'
import { loadProgress, parseProgress, STORAGE_KEY } from './lib/storage'
import { useNow } from './lib/useNow'
import type { Progress, StudyFilter } from './types'
import license from '../LICENSE?raw'
import './App.css'

type Page = 'overview' | 'flashcards' | 'practice' | 'bank' | 'analytics' | 'community'
const navigation = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'flashcards', label: 'Flashcards', icon: Layers3 },
  { id: 'practice', label: 'Practice & exams', icon: Target },
  { id: 'bank', label: 'Learning modules', icon: BookOpen },
  { id: 'analytics', label: 'My progress', icon: ChartNoAxesCombined },
] as const
const titles: Record<Page, string> = { overview: 'Study dashboard', flashcards: 'Flashcards', practice: 'Practice & exams', bank: 'Learning modules', analytics: 'My progress', community: 'The open study project' }
const issuesUrl = 'https://github.com/mauriciohiggs/industrialiq/issues/new'

function download(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function App() {
  const [loaded] = useState(loadProgress)
  const now = useNow()
  const [progress, setProgress] = useState(loaded.progress)
  const [storageError, setStorageError] = useState(loaded.error)
  const [saveBlocked, setSaveBlocked] = useState(!!loaded.error)
  const [notice, setNotice] = useState('')
  const [page, setPage] = useState<Page>('overview')
  const [mobileMenu, setMobileMenu] = useState(false)
  const [search, setSearch] = useState('')
  const [bankFilter, setBankFilter] = useState<StudyFilter>('All topics')
  const [practiceSetup, setPracticeSetup] = useState<{ filter: StudyFilter; mode: 'practice' | 'exam'; version: number }>({ filter: 'All topics', mode: 'practice', version: 0 })
  const [confirmReset, setConfirmReset] = useState(false)
  const [dataVersion, setDataVersion] = useState(0)
  const importRef = useRef<HTMLInputElement>(null)
  const contentRef = useRef<HTMLElement>(null)
  const sidebarRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (mobileMenu) sidebarRef.current?.querySelector<HTMLButtonElement>('button')?.focus()
  }, [mobileMenu])

  function closeMenu() {
    setMobileMenu(false)
    contentRef.current?.focus({ preventScroll: true })
  }

  function navigate(next: Page) {
    setPage(next)
    setMobileMenu(false)
    contentRef.current?.scrollTo({ top: 0 })
    if (mobileMenu) contentRef.current?.focus({ preventScroll: true })
  }

  function startPractice(filter: StudyFilter = 'All topics', mode: 'practice' | 'exam' = 'practice') {
    setPracticeSetup({ filter, mode, version: practiceSetup.version + 1 })
    navigate('practice')
  }

  function save(next: Progress, explicitReplace = false) {
    setProgress(next)
    if (saveBlocked && !explicitReplace) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      setStorageError(null)
      setSaveBlocked(false)
    } catch (error) {
      setStorageError(`Progress is only in memory and will be lost on reload: ${error instanceof Error ? error.message : String(error)}. Export your progress before leaving.`)
    }
  }

  async function importProgress(file: File | undefined) {
    if (!file) return
    try {
      if (file.size > 5_000_000) throw new Error('Please use a progress file smaller than 5 MB.')
      const imported = parseProgress(await file.text())
      save(imported, true)
      setDataVersion((version) => version + 1)
      setNotice('Progress imported into this session. Check any storage warning above before closing.')
    } catch (error) {
      setNotice(`Import failed: ${error instanceof Error ? error.message : String(error)}. Your current progress was not changed.`)
    }
    if (importRef.current) importRef.current.value = ''
  }

  function exportProgress() {
    try {
      const raw = saveBlocked ? localStorage.getItem(STORAGE_KEY) : null
      download('ignition-study-progress.json', raw ?? JSON.stringify(progress, null, 2))
      if (saveBlocked) download('ignition-study-current-session.json', JSON.stringify(progress, null, 2))
      setNotice(saveBlocked ? 'Downloaded the original stored data and current-session progress separately.' : 'Progress exported. Keep this file to restore it later.')
    } catch (error) {
      download('ignition-study-current-session.json', JSON.stringify(progress, null, 2))
      setNotice(`Original storage could not be read: ${error instanceof Error ? error.message : String(error)}. Current-session progress was exported instead.`)
    }
  }

  const filteredQuestions = questions.filter((question) =>
    (bankFilter === 'All topics' || question.category === bankFilter) &&
    `${question.question} ${question.category} ${question.explanation}`.toLowerCase().includes(search.toLowerCase()),
  )
  const days = streak(progress.activity, now)

  return <div className="app-shell">
    <a className="skip-link" href="#main-content">Skip to study content</a>
    {mobileMenu && <button className="sidebar-backdrop" onClick={closeMenu} aria-label="Close navigation" tabIndex={-1} />}
    <aside ref={sidebarRef} className={`sidebar ${mobileMenu ? 'mobile-open' : ''}`} role={mobileMenu ? 'dialog' : undefined} aria-modal={mobileMenu || undefined} aria-label="Study navigation" onKeyDown={(event) => {
      if (!mobileMenu) return
      if (event.key === 'Escape') closeMenu()
      if (event.key !== 'Tab') return
      const controls = event.currentTarget.querySelectorAll<HTMLElement>('button, a[href]')
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }}>
      <button className="icon-button mobile-close" onClick={closeMenu} aria-label="Close study navigation"><X size={18} /></button>
      <button className="brand" onClick={() => navigate('overview')} aria-label="IndustrialIQ home"><span className="brand-mark"><Zap size={24} fill="currentColor" /></span><span>Industrial<span className="brand-core">IQ</span><small>INDUSTRIAL LEARNING</small></span></button>
      <div className="workspace-label"><span className="tiny-orbit"><Globe size={16} /></span><div>Ignition Core<small>Industrial Automation</small></div><span className="version-chip">8.1</span></div>
      <div className="nav-label">YOUR STUDY SPACE</div>
      <nav aria-label="Main navigation">{navigation.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-item ${page === id ? 'active' : ''}`} aria-current={page === id ? 'page' : undefined} onClick={() => navigate(id)}><Icon size={19} /><span>{label}</span>{id === 'flashcards' && <span className="nav-count">{questions.length}</span>}{page === id && <span className="active-dot" />}</button>)}</nav>
      <div className="sidebar-divider" /><div className="nav-label">BETTER TOGETHER</div>
      <button className={`nav-item ${page === 'community' ? 'active' : ''}`} aria-current={page === 'community' ? 'page' : undefined} onClick={() => navigate('community')}><Users size={19} /><span>Community & sharing</span></button>
      <a className="nav-item" href="https://www.docs.inductiveautomation.com/docs/8.1" target="_blank" rel="noreferrer"><BookOpen size={19} /><span>Official documentation</span><ExternalLink size={13} /></a>
      <div className="sidebar-bottom"><div className="open-source-card"><span className="sidebar-heart"><Heart size={19} /></span><h3>Made to be shared.</h3><p>Free to learn. Open to everyone.<br />Better with your contribution.</p><button onClick={() => navigate('community')}>Explore the project <ArrowRight size={15} /></button></div><div className="local-profile"><span><ShieldCheck size={20} /></span><div>Your personal study space<small>Saved on this device only</small></div><span className="local-dot" /></div></div>
    </aside>
    <div className="main-shell">
      <header className="topbar"><div className="breadcrumb"><button className="icon-button mobile-toggle" aria-label="Open navigation" onClick={() => setMobileMenu(true)}><Menu size={21} /></button><span>My workspace</span><ChevronRight size={14} /><strong>{titles[page]}</strong></div><div className="topbar-tools"><label className="global-search"><Search size={16} /><input type="search" aria-label="Search learning modules" placeholder="Search learning modules..." value={search} onChange={(event) => { setSearch(event.target.value); setBankFilter('All topics'); navigate('bank') }} /></label><span className="header-streak" title={`${days} day study streak`}><Flame size={18} />{days}<span>day streak</span></span><button className="icon-button help-button" aria-label="About this project" onClick={() => navigate('community')}><CircleHelp size={20} /></button></div></header>
      <main id="main-content" ref={contentRef} tabIndex={-1}>
        <h1 className="sr-only">{titles[page]}</h1>
        {storageError && <div className="notice error-notice" role="alert">{storageError} <button className="text-button" onClick={exportProgress}>Export data</button></div>}
        {notice && <div className="notice" role="status">{notice}<button className="icon-button" aria-label="Dismiss notification" onClick={() => setNotice('')}><X size={16} /></button></div>}
        <section hidden={page !== 'overview'} aria-label="Study dashboard"><Dashboard progress={progress} now={now} onFlashcards={() => navigate('flashcards')} onPractice={startPractice} onBank={() => navigate('bank')} onAnalytics={() => navigate('analytics')} /></section>
        <section hidden={page !== 'flashcards'} aria-label="Flashcards"><Flashcards key={dataVersion} progress={progress} now={now} onSave={save} /></section>
        <section hidden={page !== 'practice'} aria-label="Practice and exams"><Practice key={dataVersion} progress={progress} onSave={save} initialFilter={practiceSetup.filter} initialMode={practiceSetup.mode} filterVersion={practiceSetup.version} /></section>
        <section hidden={page !== 'analytics'} aria-label="Progress analytics"><Analytics progress={progress} now={now} /></section>
        <section hidden={page !== 'bank'} className="page-content">
          <div className="section-heading"><div><span className="eyebrow">INDUSTRIAL AUTOMATION / IGNITION CORE</span><h2>Nine learning modules. One open library.</h2><p>{questions.length} original questions, each with an explanation. Explore freely or build a focused drill.</p></div><BookOpen className="heading-icon" /></div>
          <div className="bank-filters"><label className="bank-search"><Search size={17} /><input type="search" aria-label="Filter questions" placeholder="Find a concept, question, or topic..." value={search} onChange={(event) => setSearch(event.target.value)} /></label><label className="sr-only" htmlFor="bank-category">Filter by topic</label><select id="bank-category" value={bankFilter} onChange={(event) => setBankFilter(event.target.value as StudyFilter)}><option>All topics</option>{categories.map((category) => <option key={category.name}>{category.name}</option>)}</select><button className="button primary" onClick={() => startPractice(bankFilter)}>Practice this selection <ArrowRight size={15} /></button></div>
          <p className="muted small">{filteredQuestions.length} {filteredQuestions.length === 1 ? 'question' : 'questions'} shown. Search filters this library; drills use the selected topic.</p>
          <div className="bank-list">{filteredQuestions.map((question) => <details className="panel bank-question" key={question.id}><summary><span className="topic-icon teal"><TopicIcon category={question.category} size={18} /></span><span><small>{question.category} <span className="question-id">/ {question.id}</span></small><strong>{question.question}</strong></span><span className="expand-plus">+</span></summary><div className="review-detail"><h4>{question.options[question.correct]}</h4><p>{question.explanation}</p><div className="review-actions"><a href={sourceFor(question.category)} target="_blank" rel="noreferrer">Read the official topic reference <ExternalLink size={14} /></a><a href={`${issuesUrl}?template=question-report.yml&title=${encodeURIComponent(`[Question]: ${question.id}`)}`} target="_blank" rel="noreferrer">Report this question <ExternalLink size={14} /></a></div></div></details>)}</div>
          {filteredQuestions.length === 0 && <div className="panel completion"><FileQuestion size={35} /><h3>No matching questions.</h3><p>Try another phrase or choose a different topic.</p></div>}
        </section>
        <section hidden={page !== 'community'} className="page-content">
          <div className="section-heading"><div><span className="eyebrow">OPEN KNOWLEDGE IS FOR EVERYONE</span><h2>Learn together. Build together.</h2><p>A free, independent study companion made for sharing.</p></div><Heart className="heading-icon" /></div>
          <div className="community-grid"><article className="panel community-panel"><span className="tile-icon teal"><Code2 /></span><h3>Make it your own</h3><p>The app and original question bank are MIT licensed. Fork it, improve it, host it, and share it. No accounts, API keys, trackers, or database required.</p><ol><li>Use the source to build your own study experience.</li><li>Keep original content original and attribute retained licenses.</li><li>Share improvements with the community through pull requests.</li></ol><p className="muted small">Public releases are validated by tests, lint, and a production build before deployment.</p></article>
          <article className="panel community-panel"><span className="tile-icon purple"><Users /></span><h3>A better bank starts with you</h3><p>Request a topic, suggest an improvement, or report a question. Please share original work and public references; never include proprietary or sensitive industrial-system details.</p><div className="feedback-links"><a className="button secondary" href={`${issuesUrl}?template=course-request.yml`} target="_blank" rel="noreferrer">Request a Course <ExternalLink size={14} /></a><a className="button secondary" href={`${issuesUrl}?template=feature-request.yml`} target="_blank" rel="noreferrer">Request a Feature <ExternalLink size={14} /></a><a className="button secondary" href={`${issuesUrl}?template=question-report.yml`} target="_blank" rel="noreferrer">Report a Question <ExternalLink size={14} /></a></div><p className="muted small">Every report helps shape the public roadmap.</p><button className="button secondary" onClick={() => download('ignition-original-questions.json', JSON.stringify(questions, null, 2))}><Download size={16} /> Download original bank</button></article></div>
          <section className="panel data-panel"><div><span className="eyebrow">YOUR DATA STAYS YOURS</span><h3>Take your progress with you.</h3><p>Progress is stored in this browser, not in an account. Export a backup before switching devices or clearing browser data. Import replaces current progress.</p></div><div className="button-row"><button className="button secondary" onClick={exportProgress}><ArrowDownToLine size={16} /> Export progress</button><button className="button secondary" onClick={() => importRef.current?.click()}><Upload size={16} /> Import & replace</button><input ref={importRef} type="file" accept=".json,application/json" hidden aria-label="Import progress file" onChange={(event) => void importProgress(event.target.files?.[0])} /><button className="text-button danger" onClick={() => setConfirmReset(true)}>Reset progress</button></div>
          {confirmReset && <div className="notice reset-confirm" role="alert"><p>Clear all answers, card schedules, and study streaks on this browser? Export first if you want to keep them.</p><button className="button danger-button" onClick={() => { save(emptyProgress(), true); setConfirmReset(false); setDataVersion((version) => version + 1); setNotice('Progress reset for this session. Check any storage warning before leaving.') }}>Yes, clear progress</button><button className="button secondary" onClick={() => setConfirmReset(false)}>Cancel</button></div>}</section>
          <section className="panel references-panel"><h3>Go straight to the source</h3><p className="muted">Practice targets Ignition 8.1 concepts. Use official documentation and hands-on projects to verify your understanding and check version-specific behavior.</p><div className="reference-links">{categories.map((category) => <a key={category.name} href={category.source} target="_blank" rel="noreferrer"><TopicIcon category={category.name} size={17} />{category.name}<ExternalLink size={13} /></a>)}</div></section>
          <div className="independent-note"><ShieldCheck size={22} /><p><strong>Independent by design.</strong> Not affiliated with, endorsed by, or sponsored by Inductive Automation. Ignition is a trademark of Inductive Automation. These original questions are not official certification questions, exam dumps, or a guarantee of passing. This is a learning aid, not production engineering advice.</p></div>
          <details className="panel license-panel"><summary><Check size={17} /> MIT license / use, modify, and share</summary><pre>{license}</pre></details>
        </section>
        <footer className="app-footer"><span><Zap size={13} /> IndustrialIQ <span className="footer-dot">/</span> Ignition Core learning track</span><nav className="footer-links" aria-label="Project"><a href={`${issuesUrl}?template=user-feedback.yml`} target="_blank" rel="noreferrer">Feedback</a><a href="./roadmap.html">Roadmap</a><a href="./privacy.html">Privacy</a><a href="./terms.html">Terms</a><a href="./disclaimer.html">Disclaimer</a><button className="text-button" onClick={() => navigate('community')}>About the project <ArrowRight size={13} /></button></nav></footer>
      </main>
    </div>
  </div>
}

export default App
