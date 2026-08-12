import Link from 'next/link'

/**
 * What Max adds, shown rather than listed.
 *
 * Max spent the first version of this page as a column in a comparison table,
 * which is the same failure the whole page exists to fix: a tier nobody has
 * seen, described in four words. Every claim below maps to a real predicate —
 * `hasMaxResourceVault`, `vaultSubjectLimit`, `hasPriorityMarking`,
 * `hasMaxWeeklyCoach` — or a real constant (`MAX_WELCOME_BONUS_CREDITS`,
 * `MAX_SPRINT_BONUS_CREDITS`, `MAX_SPRINT_WINDOW_DAYS`), passed in by the page
 * so the numbers cannot drift from the code that grants them.
 *
 * The sprint pack is the honest version of exam urgency: it fires off the
 * student's own exam date, which is a real deadline they typed in themselves,
 * not a countdown we invented so we could sell its expiry.
 */
export function DemoMaxOffer({
  scholarSubjects,
  maxQuestions,
  scholarQuestions,
  welcomeCredits,
  sprintCredits,
  sprintWindowDays,
}: {
  scholarSubjects: number
  maxQuestions: number
  scholarQuestions: number
  welcomeCredits: number
  sprintCredits: number
  sprintWindowDays: number
}) {
  const items = [
    {
      stamp: 'ALL',
      title: 'Every subject you take, not one',
      body: `Scholar builds the desk for ${scholarSubjects === 1 ? 'a single focus subject' : `${scholarSubjects} subjects`}. Max builds one for every subject on your profile, and each exam board stays on its own shelf.`,
    },
    {
      stamp: '≡',
      title: 'The Resource Vault',
      body: 'Per-subject question desks, your own full-marks rewrites collected in one place, live diagram pads and sprint packs — the desk this whole page has been showing you, with everything on it.',
    },
    {
      stamp: '»',
      title: 'Priority marking',
      body: 'The same second-opinion depth, run at higher concurrency, so a long script comes back sooner. It matters most in the week you are marking a whole paper a day.',
    },
    {
      stamp: '✉',
      title: 'The Sunday examiner coach',
      body: 'The weekly email in full. This is the one thing on this page that Scholar does not include at all.',
    },
    {
      stamp: `+${welcomeCredits}`,
      title: 'Credits to start, and again before the exam',
      body: `${welcomeCredits} bonus credits the day you start, and another ${sprintCredits} when your exam comes inside ${sprintWindowDays} days — off the date you set yourself, not a timer we made up.`,
    },
    {
      stamp: `${maxQuestions}`,
      title: `${maxQuestions} questions a month`,
      body: `Against ${scholarQuestions} on Scholar. Enough to mark every question you write in an exam term without ever thinking about it.`,
    },
  ]

  return (
    <div className="demo-max">
      <ul className="demo-max__grid">
        {items.map((it) => (
          <li key={it.title} className="demo-max__item">
            <span className="demo-max__stamp mono" aria-hidden>
              {it.stamp}
            </span>
            <div>
              <p className="demo-max__title">{it.title}</p>
              <p className="demo-max__body">{it.body}</p>
            </div>
          </li>
        ))}
      </ul>

      <p className="demo-max__foot">
        Most students do not need this — Scholar covers one subject properly and
        is what we would pick.{' '}
        <Link href="/pricing">Max is worth it if you are marking across three
        or four subjects at once.</Link>
      </p>
    </div>
  )
}
