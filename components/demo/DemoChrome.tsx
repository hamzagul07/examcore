import { CTA_MARK } from '@/lib/copy/product-lexicon'
import Link from 'next/link'

/**
 * Framing for /demo.
 *
 * The page shows the real dashboard components driven by a seeded student
 * (`lib/demo/student.ts`). Two jobs fall to this chrome, and only one of them
 * is decoration:
 *
 * 1. **Honesty.** Seeded numbers must never read as the visitor's own. Every
 *    scene carries a visible example label, and the ribbon sits above the fold.
 *    A blurred panel of invented figures presented as "your progress" is the one
 *    version of this page that would deserve the screenshot it would get.
 *
 * 2. **The delta.** Each scene states what a free account sees in that exact
 *    slot. That comparison is the whole argument — a reader who has never had a
 *    weak-topic map cannot miss it, so the page has to put the two states next
 *    to each other rather than describe the paid one.
 */

/**
 * Cambridge grades are read aloud as letters, so A and A* take "an" while
 * B/C/D/E take "a". Without this the persona line reads "Targeting a A".
 */
function grade(article: string): string {
  return article.startsWith('A') ? 'an' : 'a'
}

/** Persistent, unmissable statement that nothing here belongs to the reader. */
export function DemoRibbon() {
  return (
    <div className="demo-ribbon">
      <span className="ec-ink-stamp demo-ribbon__stamp" aria-hidden>
        EX
      </span>
      <p className="demo-ribbon__text">
        <strong>This is an example account.</strong> Every figure below belongs to
        a student we made up, marked against the real Cambridge 9709 syllabus.
        Nothing here is your data.
      </p>
    </div>
  )
}

/**
 * The seeded student, stated plainly. Deliberately reads like a cover sheet —
 * candidate, subject, target, deadline — because that is the object the whole
 * dashboard is about.
 */
export function DemoPersona({
  firstName,
  subjectLine,
  targetGrade,
  examLabel,
  daysToExam,
  scriptsMarked,
  marksEarned,
  weeksActive,
}: {
  firstName: string
  subjectLine: string
  targetGrade: string
  examLabel: string
  daysToExam: number
  scriptsMarked: number
  marksEarned: number
  weeksActive: number
}) {
  return (
    <section className="demo-persona" aria-label="The example student">
      <div className="demo-persona__head">
        <p className="ms-overline demo-persona__eyebrow">The account you are looking at</p>
        <h2 className="demo-persona__name serif">
          {firstName} — {subjectLine}
        </h2>
        <p className="demo-persona__sub">
          Targeting {grade(targetGrade)} <strong>{targetGrade}</strong>.{' '}
          {examLabel}, in <strong>{daysToExam} days</strong>.
        </p>
      </div>
      <dl className="demo-persona__stats">
        <div className="demo-persona__stat">
          <dt>Scripts marked</dt>
          <dd className="mono">{scriptsMarked}</dd>
        </div>
        <div className="demo-persona__stat">
          <dt>Marks earned</dt>
          <dd className="mono">{marksEarned}</dd>
        </div>
        <div className="demo-persona__stat">
          <dt>Weeks active</dt>
          <dd className="mono">{weeksActive}</dd>
        </div>
      </dl>
    </section>
  )
}

/**
 * Where the 38 topics stand, as counts.
 *
 * Mastery level is a STATUS, not a magnitude, so it takes the reserved status
 * palette the chips already use everywhere else — and status never travels as
 * colour alone, so every group carries its label and its number as text. A
 * second chart was the wrong answer here: the matrix in scene 2 already plots
 * this, and a count row answers "where am I?" without repeating it.
 */
export function DemoMasteryStrip({
  groups,
}: {
  groups: Array<{ key: string; label: string; count: number; chip: string }>
}) {
  const total = groups.reduce((s, g) => s + g.count, 0)
  return (
    <div className="demo-strip">
      <p className="demo-strip__title mono">
        {total} topics on the 9709 syllabus
      </p>
      <ul className="demo-strip__list">
        {groups.map((g) => (
          <li key={g.key} className="demo-strip__item">
            <span className={`ec-chip ${g.chip} demo-strip__chip`}>
              <span className="demo-strip__n mono">{g.count}</span>
              {g.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * One scene of the tour: a numbered exhibit, the claim it makes, the real
 * component, and the free-tier counterpart.
 *
 * `freeState` is the conversion mechanic and is required rather than optional —
 * a scene that cannot say what free shows instead is a feature list entry, not
 * an argument, and should not be on this page.
 */
export function DemoScene({
  id,
  index,
  label,
  title,
  claim,
  freeState,
  children,
}: {
  /**
   * Stable slug (`mark`, `map`, `cards`, …). Rendered as `demo-<id>` so the
   * sticky nav and the `?scene=` deep links from the locked gates can find it.
   */
  id: string
  index: number
  label: string
  title: string
  claim: string
  freeState: string
  children: React.ReactNode
}) {
  const n = String(index).padStart(2, '0')
  return (
    // Labelled by its own heading rather than an aria-label: the heading is the
    // real title, and duplicating a shorter label over it makes the landmark
    // announce something different from what is on screen.
    <section
      className="demo-scene"
      id={`demo-${id}`}
      aria-labelledby={`demo-${id}-title`}
    >
      <div className="demo-scene__head">
        <div className="demo-scene__marker" aria-hidden>
          <span className="demo-scene__n mono">{n}</span>
          <span className="demo-scene__rule" />
        </div>
        <div className="demo-scene__intro">
          <p className="ms-overline demo-scene__label">{label}</p>
          <h2 className="demo-scene__title serif" id={`demo-${id}-title`}>
            {title}
          </h2>
          <p className="demo-scene__claim">{claim}</p>
        </div>
      </div>

      <div className="demo-scene__stage">
        <p className="demo-scene__tag mono" aria-hidden>
          Example data
        </p>
        {children}
      </div>

      <p className="demo-scene__free">
        <span className="demo-scene__free-stamp mono" aria-hidden>
          FREE
        </span>
        <span>{freeState}</span>
      </p>
    </section>
  )
}

/**
 * The cost comparison a parent is already making.
 *
 * Deliberately compares *volume of marked work* rather than claiming
 * equivalence to a human tutor — the second would be an overclaim and the first
 * is checkable. This is the frame that works on the person holding the card,
 * which is a different frame from the one that works on the student.
 */
export function DemoAnchor({
  scriptsMarked,
  weeksActive,
  scholarMonthlyCap,
}: {
  scriptsMarked: number
  weeksActive: number
  scholarMonthlyCap: number
}) {
  return (
    <section className="demo-anchor">
      <p className="ms-overline demo-anchor__eyebrow">What this much marking costs elsewhere</p>
      <p className="demo-anchor__line serif">
        A private tutor charges <strong>£30–50 an hour</strong> and works through
        roughly <strong>one answer</strong> in that time.
      </p>
      <p className="demo-anchor__body">
        Aisha marked <strong>{scriptsMarked}</strong> in {weeksActive} weeks, each
        one against the official scheme, each one back in about three minutes.
        A Scholar plan covers{' '}
        <strong>{scholarMonthlyCap} questions a month</strong> — more in four
        weeks than she got through in {weeksActive}.
      </p>
    </section>
  )
}

/** Row in the plan ladder. Each cell is what that tier genuinely gets. */
type LadderRow = {
  label: string
  free: string | boolean
  scholar: string | boolean
  max: string | boolean
}

/**
 * The whole argument on one screen, after it has been demonstrated rather than
 * before.
 *
 * Three columns rather than "free vs paid", because two columns forced the
 * weekly examiner report to be listed as simply "paid" when
 * `lib/reports/weekly-report.ts` sends it to `.eq('tier','mastery')` — Max
 * only. A comparison table that overstates the middle tier is the kind of thing
 * a student discovers in week two and posts about, so every row here maps to a
 * real predicate in `lib/billing/features.ts` or a real cap in `caps.ts`.
 */
export function DemoLadder({
  rows,
  plans,
}: {
  rows: LadderRow[]
  plans: { free: string; scholarMonthly: string; scholarYearly: string; maxMonthly: string }
}) {
  const cell = (v: string | boolean) =>
    v === true ? (
      <span className="demo-ladder__yes" aria-label="included">
        ✓
      </span>
    ) : v === false ? (
      <span className="demo-ladder__no" aria-label="not included">
        —
      </span>
    ) : (
      <span className="demo-ladder__val mono">{v}</span>
    )

  return (
    <section className="demo-ladder" id="demo-plans">
      <p className="ms-overline demo-ladder__eyebrow">Everything you just saw, as a list</p>
      <h2 className="demo-ladder__title serif">What you get on each plan</h2>

      <div className="demo-ladder__scroll">
        <table className="demo-ladder__table">
          <thead>
            <tr>
              <th scope="col">&nbsp;</th>
              <th scope="col">
                Free
                <span className="demo-ladder__price-head mono">{plans.free}</span>
              </th>
              <th scope="col" className="demo-ladder__col--pick">
                Scholar
                <span className="demo-ladder__price-head mono">
                  {plans.scholarMonthly}/mo
                </span>
              </th>
              <th scope="col">
                Max
                <span className="demo-ladder__price-head mono">
                  {plans.maxMonthly}/mo
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <th scope="row">{r.label}</th>
                <td>{cell(r.free)}</td>
                <td className="demo-ladder__col--pick">{cell(r.scholar)}</td>
                <td>{cell(r.max)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="demo-ladder__price">
        <p className="demo-ladder__price-line">
          Most students want <strong>Scholar</strong> —{' '}
          {plans.scholarMonthly} a month, or{' '}
          <strong>{plans.scholarYearly} for the whole exam year</strong>.
        </p>
        <p className="demo-ladder__price-foot">
          Priced in US dollars and converted at checkout. Cancel whenever you
          like — everything you marked stays in your account either way.
        </p>
        <div className="demo-ladder__actions">
          <Link href="/pricing" className="ec-btn-primary">
            Pick a plan
          </Link>
          <Link href="/mark" className="ec-btn-ghost">
            Or mark one free first
          </Link>
        </div>
      </div>
    </section>
  )
}

/** Closing ask. One destination, stated once, after the argument is made. */
export function DemoClose({
  targetGrade,
  pointsToGo,
  weakTopic,
}: {
  targetGrade: string
  pointsToGo: number | null
  weakTopic: string | null
}) {
  return (
    <section className="demo-close">
      <p className="ms-overline demo-close__eyebrow">What it takes to see this on your own account</p>
      <h2 className="demo-close__title serif">
        Eighteen scripts. That is the whole trick.
      </h2>
      <p className="demo-close__body">
        Everything above was computed from Aisha&rsquo;s marked answers — the map,
        the trajectory, the{' '}
        {weakTopic ? (
          <>
            fact that <strong>{weakTopic}</strong> is what stands between her and
            {pointsToGo != null
              ? ` ${grade(targetGrade)} ${targetGrade}, ${pointsToGo} points away`
              : ` ${grade(targetGrade)} ${targetGrade}`}
          </>
        ) : (
          <>route to her target grade</>
        )}
        . None of it was written by us. Mark your own questions and the same page
        fills in with your topics, your gaps and your deadline.
      </p>
      <div className="demo-close__actions">
        <Link href="/mark" className="ec-btn-primary demo-close__cta">
          {CTA_MARK}
        </Link>
        <Link href="/pricing" className="ec-btn-ghost demo-close__cta">
          See plans
        </Link>
      </div>
      <p className="demo-close__foot">
        No card, and no account needed for the first one. The ink and the
        per-mark breakdown are free, always — paid adds the route: the rewrite,
        the drills, the mastery map and the weekly report.
      </p>
    </section>
  )
}
