# IndustrialIQ: Ignition Core learning track

IndustrialIQ is envisioned as an industrial competency platform. Its first learning track is a free, open-source, local-first study companion for Ignition 8.1, built with React, TypeScript, and Vite. No account, backend, database, API keys, or paid services are required today.

The first course, Industrial Automation > Ignition Core, organizes its existing questions into nine learning modules. TypeScript graph models, an illustrative readiness service, and a mock mentor are foundations only: the app does not yet have curated skill mappings, competency tracking, readiness prediction, or AI coaching. Cybersecurity, Engineering, Manufacturing, and SaaS plans are **planned, not implemented**.

See the [migration notes](INDUSTRIALIQ_MIGRATION.md), [roadmap](ROADMAP.md), and [platform strategy](INDUSTRIALIQ_STRATEGY.md).

**Independent community project.** Not affiliated with or endorsed by Inductive Automation. Ignition is a trademark of Inductive Automation. These are original practice questions, not real certification questions or exam dumps. The simulator does not reproduce the official assessment, its weighting, or its difficulty, and does not predict whether you will pass.

## Run locally

Use Node.js 24 LTS and npm.

```powershell
npm ci
npm run dev
```

Open the localhost URL printed by Vite.

```powershell
npm test
npm run lint
npm run build
npm run preview
```

The production site is generated in `dist`. Serve it over HTTP; do not open `index.html` directly from the filesystem.

## What's included

- **72 original questions / flashcards** across Gateway, Vision, Perspective, Tags, Security, Reporting, Historian, Transaction Groups, and Alarming.
- **Spaced-repetition flashcards:** reveal the answer, then choose Again, Hard, Good, or Easy.
- **Lightning review:** up to 100 available cards, with automatic answer reveal after 15 seconds. Rate your recall manually; a timeout is not silently recorded as a correct answer.
- **Quick and category drills:** choose 10, 25, or 50 questions with immediate explanations.
- **Exam practice:** up to 50 unique questions, optional 90-minute timer, no feedback until submission, previous-question navigation, per-topic results, and answer review.
- **Fresh randomization:** Fisher-Yates shuffling of questions and answer choices on every new attempt. A random shuffle can occasionally repeat an order by chance.
- **Missed-question bank:** questions whose most recent saved quiz result was incorrect. A later correct answer removes them from that bank.
- **Searchable library:** study answers and explanations with links to official topic documentation.
- **Real analytics:** recent accuracy, a color-coded topic map, study streaks, activity calendar, and earned milestones.
- **Portable progress:** browser storage, JSON export/import, and explicit reset.
- Responsive interface, keyboard-accessible native controls, a skip link, visible focus states, and reduced-motion support.

Smaller topic banks use all available questions without duplication: for example, a Security-only exam currently has eight questions. The 50-question mixed exam is a study convention, not a claim about the official certification format.

## How review scheduling works

This is **Anki-inspired**, not Anki's scheduler or FSRS. For the first rating:

| Rating | Next review |
| --- | --- |
| Again | 1 day |
| Hard | 3 days |
| Good | 7 days |
| Easy | 21 days |

On subsequent ratings, Again resets the interval to one day. Hard, Good, and Easy multiply the previous interval by 1.2, 2, and 2.5 respectively, rounded to the nearest whole day and never below the initial interval. One day means 24 elapsed hours, so a due card may become available at a different wall-clock hour after daylight-saving changes.

Normal review includes new and due cards, up to 30 per session. Priority is overdue cards, then most recently missed questions, then weaker topics; ties are shuffled. A card appears once in a session. There are no same-session learning steps. When caught up, use **Study ahead**. Lightning includes scheduled cards too and is capped at 100 available cards.

## Progress, privacy, and limitations

- Progress is in `localStorage` under `ignition-open-study-v1`. It belongs to this browser **and site origin**. Clearing site data, changing domain, or changing ports will not transfer it. Export before switching devices.
- Fonts and application assets are bundled locally. There are no analytics trackers or external runtime API calls. Opening official references takes you to the third-party documentation site.
- Only completed quizzes are saved; every flashcard rating is saved immediately. Switching app sections preserves an in-progress session. Reloading the page discards an unfinished quiz/review; importing or resetting progress also ends active sessions.
- An exam's timer continues while its section is hidden. On return from a throttled/background tab, elapsed wall-clock time is checked. An expired exam is submitted automatically.
- Unanswered questions in submitted/expired quizzes count as incorrect.
- Up to 2,000 quiz answers are retained. The missed bank uses the latest result per question within that saved history. Analytics and topic badges use the last 200 answers overall. Flashcard self-ratings do not count as quiz accuracy.
- Topic badges require at least five recent answers in the topic and 80% accuracy. They are practice milestones, not certification credentials.
- A study day means a completed quiz or rated card, measured in the device's local timezone. The streak remains alive if you studied yesterday but not yet today.
- Failed or corrupted storage produces a visible warning. Corrupt stored data is not automatically overwritten. Export it for recovery, or explicitly import/reset to replace it. If storage is unavailable, you can still study, but must export current-session progress before closing.
- Import validates the version, records, ratings, and dates before replacing progress. Only import a trusted progress export. Maximum import size is 5 MB.
- The app is static, not a multi-user server. It does not connect to any industrial system. It has no cloud sync, user accounts, AI question generator, PWA installation, or guaranteed offline reload. There is deliberately no service worker caching older banks.

## Public releases

Releases are built from `main` after the test, lint, and production-build gates pass. The repository includes GitHub Pages, Vercel, and continuous-integration workflows. The static app uses a relative Vite base so it supports repository subpaths and root domains without route rewrites.

See [CHANGELOG.md](CHANGELOG.md) for release history and [SECURITY.md](SECURITY.md) for vulnerability reporting. The published site links to its privacy policy, terms, and disclaimer.

## Contribute

See [CONTRIBUTING.md](CONTRIBUTING.md). The question bank is [src/data/questions.json](src/data/questions.json). Topic metadata and official reference links are in [src/data/categories.ts](src/data/categories.ts).

Core logic lives in [src/lib/study.ts](src/lib/study.ts), import validation in [src/lib/storage.ts](src/lib/storage.ts), and study screens in [src/components](src/components).

## License and sources

Application code, original questions, and original documentation are [MIT licensed](LICENSE). Dependencies and bundled fonts retain their respective licenses; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

Questions were independently authored as concept exercises using the public [Ignition 8.1 documentation](https://www.docs.inductiveautomation.com/docs/8.1) as reference. No documentation text or official exam content is included. Every topic links to its official reference from the app. Check current documentation for version-specific behavior and use hands-on projects alongside this guide.
