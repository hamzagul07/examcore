import type { Metadata } from 'next'
import Link from 'next/link'

import { topicDrillHref } from '@/lib/insights/drill-link'
import { TIER_MONTHLY_CAPS } from '@/lib/billing/caps'
import {
  INTERACTIVE_DIAGRAMS_FREE,
  MAX_SPRINT_BONUS_CREDITS,
  MAX_SPRINT_WINDOW_DAYS,
  MAX_WELCOME_BONUS_CREDITS,
} from '@/lib/billing/features'
import { DISPLAY_PRICES_USD } from '@/lib/polar/products'
import { getCourseLesson } from '@/lib/courses'
import { DEMO_STUDENT, DEMO_SUBJECT_CODE } from '@/lib/demo/student'
import { deriveDemoDashboard } from '@/lib/demo/derive'
import { DEMO_MARK_RESULT_PAID } from '@/lib/demo/marked-script'
import type { MasteryLevel } from '@/lib/mastery'

import { SyllabusCoverage } from '@/components/progress/SyllabusCoverage'
import { GradeTrajectory } from '@/components/progress/GradeTrajectory'
import { MasteryMatrix } from '@/components/progress/MasteryMatrix'
import { WeakSpotDrillCard } from '@/components/insights/WeakSpotDrillCard'
import { MarkingResultView } from '@/components/MarkingResultView'
import {
  DemoAnchor,
  DemoClose,
  DemoLadder,
  DemoMasteryStrip,
  DemoPersona,
  DemoRibbon,
  DemoScene,
} from '@/components/demo/DemoChrome'
import { DemoSectionNav } from '@/components/demo/DemoSectionNav'
import { DemoPlanStrip } from '@/components/demo/DemoPlanStrip'
import { DemoWeeklyReport } from '@/components/demo/DemoWeeklyReport'
import { DemoFlashcards } from '@/components/demo/DemoFlashcards'
import { DemoQuestionPaper } from '@/components/demo/DemoQuestionPaper'
import { DemoMaxOffer } from '@/components/demo/DemoMaxOffer'

/**
 * /demo — the paid product, populated.
 *
 * Why this route exists: every paid surface is computed from a student's own
 * marking history, so a visitor with no attempts sees an empty premium feature
 * no matter how it is framed — and so does a subscriber on day one. Before this
 * page the locked gates could only *describe* what they were hiding, which asks
 * a reader to buy something they have never seen.
 *
 * Shape: the whole argument, in sequence, with price near the top. Every scene
 * is rendered — an intermediate version made them tabs, which fixed the length
 * by hiding seven eighths of the page, and the length was never the thing worth
 * fixing. `DemoSectionNav` sticks to the top instead, so the page can be long
 * and still navigable.
 *
 * Each scene carries a stable `id`, which is the `?scene=` target the locked
 * gates link to: a refused flashcard section sends the reader to
 * `/demo?scene=cards` and lands them on that scene, inside the full page rather
 * than instead of it.
 *
 * Everything inside is the real dashboard component, driven by the seeded
 * attempts in `lib/demo/student.ts` via `deriveDemoDashboard()`, which runs the
 * same chain the signed-in dashboard runs. The lesson is a real published
 * lesson read off disk.
 */

/** A real published lesson — the courses half of the product. */
const DEMO_LESSON = {
  subject: '2281',
  slug: '1-1-the-nature-of-the-economic-problem',
  subjectLabel: 'Economics',
} as const

/** Status groups for the mastery strip, in the order the heatmap uses. */
const LEVELS: Array<{ key: MasteryLevel; label: string; chip: string }> = [
  { key: 'exam_ready', label: 'Exam ready', chip: 'ec-chip-success' },
  { key: 'proficient', label: 'Proficient', chip: 'ec-chip-warning' },
  { key: 'critical', label: 'Needs work', chip: 'ec-chip-critical' },
  { key: 'sampled', label: 'Too few tries', chip: 'ec-chip-sampled' },
  { key: 'unattempted', label: 'Not started', chip: 'ec-chip-neutral' },
]

/** USD cents → a clean display string ($19.99, $199). */
function usd(cents: number): string {
  return cents % 100 === 0 ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`
}

export const metadata: Metadata = {
  title: 'See the full product — a worked example account | MarkScheme',
  description:
    'A complete MarkScheme account, filled in: the mastery map, grade trajectory, weak-topic drills, full-marks rewrite, weekly examiner report and the paid half of a lesson — all from one student’s 18 marked scripts.',
  alternates: { canonical: '/demo' },
  openGraph: {
    title: 'See the full product — a worked example account',
    description:
      'The mastery map, grade trajectory, drills, rewrite, weekly report and lesson flashcards, computed from 18 marked scripts.',
    url: '/demo',
    type: 'website',
  },
}

/** Hourly, so the exam countdown and "this week" figures stay true without per-request work. */
export const revalidate = 3600

export default function DemoPage() {
  const d = deriveDemoDashboard()
  // Bound to a local so TypeScript keeps the narrowing inside the JSX: on the
  // `paper` arm of NextDrill `topicCode` is optional, so the union has to be
  // discriminated before the drill deep-link can be built.
  const drill = d.drill?.kind === 'topic' ? d.drill : null

  const strip = LEVELS.map((l) => ({
    key: l.key,
    label: l.label,
    chip: l.chip,
    count: d.masteries.filter((m) => m.level === l.key).length,
  })).filter((g) => g.count > 0)

  const lesson = getCourseLesson(DEMO_LESSON.subject, DEMO_LESSON.slug)
  const lessonCards = lesson?.flashcards?.slice(0, 4) ?? []

  const free = TIER_MONTHLY_CAPS.free
  const scholar = TIER_MONTHLY_CAPS.scholar
  const max = TIER_MONTHLY_CAPS.mastery

  // Every scene renders, in order — the sticky nav moves through them rather
  // than hiding them. `id` is the `?scene=` target the locked gates link to.
  const scenes: Array<{ id: string; label: string; tag?: string; node: React.ReactNode }> = [
    {
      id: 'mark',
      label: 'The mark',
      tag: 'Free',
      node: (
        <DemoScene
          id="mark"
          index={1}
          label="The mark"
          title="Every answer comes back with the examiner&rsquo;s reasoning on it"
          claim="This part is free and stays free. It is the bit that makes everything else worth having."
          freeState="Exactly the same on a free account — the ink, the reason for every mark, and the note on the one that got away. The only thing free misses here is the rewrite at the bottom."
        >
          <MarkingResultView
            result={DEMO_MARK_RESULT_PAID}
            isPaid
            isSample
            evidenceDefaultOpen={false}
            moreDefaultOpen={false}
          />
        </DemoScene>
      ),
    },
    {
      id: 'map',
      label: 'The map',
      node: (
        <DemoScene
          id="map"
          index={2}
          label="The map"
          title="Your answers turn into a picture of what you actually know"
          claim="Each one gets tagged to the syllabus, so the map fills itself in. It waits for three tries on a topic before calling it — one bad morning is not a weakness."
          freeState="Empty on a free account, because there is nothing to put in it until you have marked something. That is the real reason it is paid, not a rule we invented."
        >
          <div className="demo-stack">
            <SyllabusCoverage
              masteries={d.masteries}
              coverage={d.coverage}
              hasAnyData
              subjectLabel={d.subjectLine}
              totalTopics={d.totalTopics}
            />
            <MasteryMatrix
              parentMasteries={d.parentMasteries}
              attempts={d.attempts}
              hasAnyData
              subjectCode={DEMO_SUBJECT_CODE}
              subjectLabel={DEMO_STUDENT.subjectLabel}
            />
          </div>
        </DemoScene>
      ),
    },
    {
      id: 'gap',
      label: 'The gap',
      node: (
        <DemoScene
          id="gap"
          index={3}
          label="The gap"
          title={
            d.gap
              ? `Tracking a ${d.prediction.predictedGrade}. Wants ${DEMO_STUDENT.targetGrade}. ${d.gap.pointsToGo} points in between.`
              : `Tracking a ${d.prediction.predictedGrade} against a target of ${DEMO_STUDENT.targetGrade}.`
          }
          claim="Your recent scores against real grade boundaries. It is not flattering on purpose — the two dips are the topics costing her the grade."
          freeState="Free shows the score on each question. It cannot draw a line, because a line needs a history."
        >
          <GradeTrajectory
            attempts={d.attempts}
            prediction={d.prediction}
            ibMode={false}
            targetGrade={DEMO_STUDENT.targetGrade}
          />
        </DemoScene>
      ),
    },
    ...(drill
      ? [
          {
            id: 'drill',
            label: 'The route',
            node: (
              <DemoScene
                id="drill"
                index={4}
                label="The route"
                title="Then it tells you which question to do next, and why"
                claim="The map finds the weakest topic. The drill turns it into one specific thing to do this afternoon."
                freeState="Free tells you how each answer went. It does not pick the next question for you or say why that one."
              >
                <div className="demo-drill">
                  <WeakSpotDrillCard
                    subjectCode={DEMO_SUBJECT_CODE}
                    drill={drill}
                    title="Drill this next"
                  />
                  <p className="demo-drill__note">
                    That button opens{' '}
                    <Link
                      href={topicDrillHref(DEMO_SUBJECT_CODE, drill.topicCode)}
                    >
                      the real marking page
                    </Link>{' '}
                    for {d.weakest?.name}. Try it now — your first mark is free
                    and needs no account.
                  </p>
                </div>
              </DemoScene>
            ),
          },
        ]
      : []),
    {
      id: 'paper',
      label: 'The question desk',
      node: (
        <DemoScene
          id="paper"
          index={5}
          label="The question desk"
          title="It keeps a paper waiting for you, built from your weak topics"
          claim="Not a browsable index — a queue. These four came up because Differential equations and Complex numbers are the two topics on her map marked “Needs work”, and each one opens straight into marking."
          freeState="Free can search the past papers and mark 5 questions a month. What it does not do is keep a queue for you, or pick the questions from what you keep getting wrong."
        >
          <DemoQuestionPaper />
        </DemoScene>
      ),
    },
    ...(lesson && lessonCards.length > 0
      ? [
          {
            id: 'cards',
            label: 'The lessons',
            node: (
              <DemoScene
                id="cards"
                index={6}
                label="The lessons"
                title="And the courses have a half you have probably never seen"
                claim={`Every lesson is free to read — notes, worked examples and the live diagram. The part that makes it stick is the recall half. These are the real cards from “${lesson.title}”.`}
                freeState="Free gets the whole lesson to read, plus the interactive diagram and the quick check. Flashcards, the concept map and the practice questions need a plan."
              >
                <div className="demo-lesson">
                  <div className="demo-lesson__meta">
                    <span className="demo-lesson__badge mono">
                      {DEMO_LESSON.subject} {DEMO_LESSON.subjectLabel}
                    </span>
                    <span className="demo-lesson__facts mono">
                      {lesson.durationMin} min · {lesson.sections?.length ?? 0}{' '}
                      sections · {lesson.flashcards?.length ?? 0} cards
                    </span>
                  </div>
                  <DemoFlashcards cards={lessonCards} />
                  <p className="demo-drill__note">
                    <Link
                      href={`/courses/${DEMO_LESSON.subject}/${DEMO_LESSON.slug}`}
                    >
                      Read the whole lesson free →
                    </Link>
                  </p>
                </div>
              </DemoScene>
            ),
          },
        ]
      : []),
    ...(d.averageThisWeek != null
      ? [
          {
            id: 'weekly',
            label: 'The weekly email',
            tag: 'Max',
            node: (
              <DemoScene
                id="weekly"
                index={7}
                label="The weekly email"
                title="Every Sunday it writes to you, whether you showed up or not"
                claim="One email a week: what moved, what did not, and the topic still sitting where it was."
                freeState="On Max only — not on Free or Scholar. It compares this week against last week, so there has to be a few weeks of marking behind it before it says anything useful."
              >
                <DemoWeeklyReport
                  firstName={DEMO_STUDENT.firstName}
                  marksThisWeek={d.thisWeek.reduce(
                    (s, a) => s + a.marks_earned,
                    0
                  )}
                  scriptsThisWeek={d.thisWeek.length}
                  averageThisWeek={d.averageThisWeek}
                  averageDelta={
                    d.averagePriorWeek != null
                      ? d.averageThisWeek - d.averagePriorWeek
                      : null
                  }
                  weakTopic={d.weakest?.name ?? null}
                  weakTopicPercentage={d.weakest?.percentage ?? null}
                  targetGrade={DEMO_STUDENT.targetGrade}
                  pointsToTarget={d.gap ? d.gap.pointsToGo : null}
                  daysToExam={d.daysToExam}
                />
              </DemoScene>
            ),
          },
        ]
      : []),
    {
      id: 'max',
      label: 'What Max adds',
      tag: 'Max',
      node: (
        <DemoScene
          id="max"
          index={8}
          label="What Max adds"
          title="And if you are marking across four subjects, there is a tier above"
          claim="Scholar is the one most students want. Max is for the year you are sitting everything at once."
          freeState="Everything in this panel is Max only. Scholar keeps the marking, the map, the trajectory, the drills and the lessons — it does not get the vault, the weekly email or priority marking."
        >
          <DemoMaxOffer
            scholarSubjects={1}
            maxQuestions={max}
            scholarQuestions={scholar}
            welcomeCredits={MAX_WELCOME_BONUS_CREDITS}
            sprintCredits={MAX_SPRINT_BONUS_CREDITS}
            sprintWindowDays={MAX_SPRINT_WINDOW_DAYS}
          />
        </DemoScene>
      ),
    },
  ]

  return (
    <main className="demo-page">
      <div className="demo-page__inner">
        <header className="demo-hero">
          <p className="ms-overline demo-hero__eyebrow">A worked example</p>
          <h1 className="demo-hero__title serif">
            This is what you actually get, on a real account.
          </h1>
          <p className="demo-hero__lede">
            Most of what you pay for is built from your own marked answers — so a
            new account has nothing to show you, and nor does a screenshot. Here
            is a whole one instead: eighteen questions marked, seven weeks, one
            topic quietly costing her the grade.
          </p>
          <DemoRibbon />
        </header>

        <DemoPlanStrip
          scholarMonthlyCents={DISPLAY_PRICES_USD.scholar.monthly}
          scholarYearlyCents={DISPLAY_PRICES_USD.scholar.yearly}
          maxMonthlyCents={DISPLAY_PRICES_USD.mastery.monthly}
          freeQuestions={free}
          scholarQuestions={scholar}
          maxQuestions={max}
        />

        <DemoPersona
          firstName={DEMO_STUDENT.firstName}
          subjectLine={d.subjectLine}
          targetGrade={DEMO_STUDENT.targetGrade}
          examLabel={DEMO_STUDENT.examLabel}
          daysToExam={d.daysToExam}
          scriptsMarked={d.attempts.length}
          marksEarned={d.marksEarned}
          weeksActive={d.weeksActive}
        />

        <DemoMasteryStrip groups={strip} />

        <DemoSectionNav
          sections={scenes.map((s) => ({ id: s.id, label: s.label, tag: s.tag }))}
        />

        {scenes.map((s) => (
          <div key={s.id}>{s.node}</div>
        ))}

        <DemoAnchor
          scriptsMarked={d.attempts.length}
          weeksActive={d.weeksActive}
          scholarMonthlyCap={scholar}
        />

        <DemoLadder
          rows={[
            { label: 'Marked against the official scheme', free: true, scholar: true, max: true },
            { label: 'A reason for every mark, in the margin', free: true, scholar: true, max: true },
            // Diagrams are free under a launch promo, not permanently. Read the
            // flag rather than hardcoding `true`, so flipping
            // INTERACTIVE_DIAGRAMS_FREE re-tiers the lesson AND corrects this
            // table in one move instead of leaving a public page overstating
            // what free includes.
            {
              label: INTERACTIVE_DIAGRAMS_FREE
                ? 'Course notes and live diagrams'
                : 'Course notes',
              free: true,
              scholar: true,
              max: true,
            },
            ...(INTERACTIVE_DIAGRAMS_FREE
              ? []
              : [
                  {
                    label: 'Live lesson diagrams',
                    free: false,
                    scholar: true,
                    max: true,
                  },
                ]),
            { label: 'Lesson flashcards, concept map, practice', free: false, scholar: true, max: true },
            { label: 'Your answer rewritten to full marks', free: false, scholar: true, max: true },
            { label: 'Second opinion on long scripts', free: false, scholar: true, max: true },
            { label: 'Topic mastery map', free: false, scholar: true, max: true },
            { label: 'Grade trajectory and prediction', free: false, scholar: true, max: true },
            { label: 'Next question picked for you', free: false, scholar: true, max: true },
            { label: 'Resource vault', free: false, scholar: '1 subject', max: 'All' },
            { label: 'Weekly examiner email', free: false, scholar: false, max: true },
            { label: 'Priority marking', free: false, scholar: false, max: true },
            {
              label: 'Questions marked per month',
              free: String(free),
              scholar: String(scholar),
              max: String(max),
            },
          ]}
          plans={{
            free: '$0',
            scholarMonthly: usd(DISPLAY_PRICES_USD.scholar.monthly),
            scholarYearly: usd(DISPLAY_PRICES_USD.scholar.yearly),
            maxMonthly: usd(DISPLAY_PRICES_USD.mastery.monthly),
          }}
        />

        <DemoClose
          targetGrade={DEMO_STUDENT.targetGrade}
          pointsToGo={d.gap ? d.gap.pointsToGo : null}
          weakTopic={d.weakest?.name ?? null}
        />
      </div>
    </main>
  )
}
