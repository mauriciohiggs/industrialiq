# Contributing

Thanks for helping make Ignition knowledge more accessible.

## Questions and corrections

1. Fork the repository and create a topic branch.
2. Edit `src/data/questions.json`. Each question also becomes a flashcard, using the correct option as its answer.
3. Add a unique, stable ID. Do not rename an existing ID for a different question: learners' progress is keyed by ID.
4. Use exactly one existing category: Gateway, Vision, Perspective, Tags, Security, Reporting, Historian, Transaction Groups, or Alarming.
5. Supply four distinct choices, exactly one correct answer, and a concise explanation of why it is correct.
6. Target Ignition 8.1. Favor practical concepts over fragile navigation-path trivia.
7. Include an official documentation URL and your reasoning in the pull request. Topic reference URLs live in `src/data/categories.ts`; update those if a documentation section moves.

```json
{
  "id": "security-09",
  "category": "Security",
  "question": "Which approach makes an operator action easier to attribute to a person?",
  "options": [
    "Give everyone the same administrator account",
    "Use individual authenticated accounts with appropriate auditing",
    "Remove all event timestamps",
    "Disable authentication on every client"
  ],
  "correct": 1,
  "explanation": "Individual accounts and appropriate audit records support attribution. Shared credentials make it harder to identify who performed an action."
}
```

`correct` is the **zero-based** index in the original options array. The app shuffles choices while preserving that identity.

### Content rules

- Submit only your own original wording that you have the right to license under MIT.
- Never submit real certification questions, exam dumps, recalled assessment material, paid training content, or copied documentation.
- Link to authoritative documentation rather than reproducing it.
- Clearly distinguish facts, best practices, version-specific details, and assumptions.
- Avoid ambiguous choices, unsupported guarantees, and vendor affiliation claims.
- Do not include production credentials, private customer information, or internal project exports.

## Checks

```powershell
npm ci
npm test
npm run lint
npm run build
```

Tests validate bank shape, duplicate IDs, answer identity during shuffling, unique exam selection, scoring, missed-question filtering, review scheduling, analytics, streaks, and progress imports. For UI changes, also verify narrow-screen layouts and keyboard interaction.

In the pull request, describe the change, reference the relevant official source, and list the checks you ran. Maintainers should review technical accuracy and originality before merging. Automated shape checks do not establish technical accuracy.

By contributing, you agree to license your original contribution under this project's MIT license.
