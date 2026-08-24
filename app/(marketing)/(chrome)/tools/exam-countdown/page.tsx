import Link from 'next/link'

import { getPageMetadata } from '@/lib/seo/page-meta'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { JsonLd } from '@/components/seo/JsonLd'
import { faqPageNode, softwareApplicationNode } from '@/lib/seo/structured-data'
import { PageHelpStrip } from '@/components/marketing/PageHelpStrip'
import { ExamCountdown } from '@/components/tools/ExamCountdown'
import { ToolInstrumentShell } from '@/components/tools/ToolInstrumentShell'

const PATH = '/tools/exam-countdown'

const FAQS = [
  {
    q: 'When should I start doing past papers?',
    a: 'Start topic-by-topic past-paper questions as soon as you have covered a topic. Move to full timed papers roughly four weeks out, once most of the syllabus is covered. The countdown above flags which phase you are in based on your exam date.',
  },
  {
    q: 'How many past papers should I do?',
    a: 'There is no magic number, but a useful target is every paper from the last three to five sessions per subject, each marked strictly against the scheme. Enter your subjects and papers-each above and the tool suggests a weekly pace to clear them by exam day.',
  },
  {
    q: 'How long before exams should I start revising?',
    a: 'Serious revision usually needs 6–10 weeks, but it depends on how well you know the content. With more than ~12 weeks, prioritise understanding each topic; inside 4 weeks, shift almost entirely to timed past papers and review.',
  },
  {
    q: 'Does the countdown decay or need updating?',
    a: 'No — you enter your own exam date, so it works for any session and any subject. There are no hardcoded dates, so the plan stays accurate whenever you use it.',
  },
]

export const metadata = getPageMetadata(PATH, {
  ogImagePath: '/api/og/tools/exam-countdown',
  title: 'Exam countdown & revision pacing planner',
  description:
    'Free exam countdown: enter your exam date to see days and weeks left, which revision phase you are in, and how many past papers a week to clear your target.',
  keywords: [
    'exam countdown',
    'days until exams',
    'revision planner',
    'past paper plan',
    'how many past papers per week',
    'revision timetable',
  ],
})

function CountdownArtefact() {
  return (
    <aside
      className="ms-tools-artefact"
      aria-label="Example: 47 days left, timed-papers phase"
    >
      <div className="ms-tools-artefact__head">
        <span className="ms-tools-artefact__kicker">Session · your date</span>
        <span className="ms-tools-artefact__stamp" aria-hidden>
          T
        </span>
      </div>
      <div className="ms-tools-artefact__figure">
        <span className="ms-tools-artefact__raw">47</span>
        <span className="ms-tools-artefact__of">days</span>
      </div>
      <dl className="ms-tools-artefact__rows">
        <div className="ms-tools-artefact__row">
          <dt>Phase</dt>
          <dd>Timed papers</dd>
        </div>
        <div className="ms-tools-artefact__row ms-tools-artefact__row--gap">
          <dt>Pace</dt>
          <dd>~3 / week</dd>
        </div>
      </dl>
      <p className="ms-tools-artefact__cite" aria-hidden>
        the calendar is the examiner you can&apos;t argue with
      </p>
    </aside>
  )
}

export default function ExamCountdownPage() {
  return (
    <>
      <PageJsonLd
        path={PATH}
        title="Exam countdown & revision planner"
        description="Count down to your exam date and get a past-paper pacing plan for the weeks remaining."
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Tools', path: '/tools' },
          { name: 'Exam countdown', path: PATH },
        ]}
      />
      <JsonLd data={[faqPageNode(FAQS), softwareApplicationNode()]} />

      <ToolInstrumentShell
        stamp="T"
        label="Pacing instrument"
        title={
          <>
            Exam countdown &amp; <em>revision planner</em>
          </>
        }
        lead="Enter your exam date to see exactly how long is left, which revision phase you should be in, and how many past papers a week it takes to clear your target."
        note="put ink on a script before the calendar wins"
        artefact={<CountdownArtefact />}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Tools', path: '/tools' },
          { name: 'Exam countdown', path: PATH },
        ]}
        after={
          <>
            <section className="ms-tool-instrument__faq" aria-labelledby="countdown-faq">
              <h2 id="countdown-faq" className="ms-tool-instrument__faq-title">
                FAQ
              </h2>
              <dl className="ms-tool-faq">
                {FAQS.map((f) => (
                  <div key={f.q}>
                    <dt>{f.q}</dt>
                    <dd className="ms-body-2">{f.a}</dd>
                  </div>
                ))}
              </dl>
            </section>
            <PageHelpStrip />
          </>
        }
      >
        <ExamCountdown />

        <div className="mt-12 max-w-2xl">
          <h2 className="ms-h3">Revision phases as the exam nears</h2>
          <p className="ms-body-2" style={{ marginTop: 10 }}>
            Good revision changes shape as time runs out. With months to go, the priority is
            understanding every topic. Inside two months, you start layering past papers on top of
            that knowledge. In the final weeks it becomes almost entirely timed papers, strict
            marking, and fixing your weakest spots — not new content. The planner tells you which
            phase your date puts you in and roughly how many papers a week keeps you on track.
          </p>
          <p className="ms-body-2" style={{ marginTop: 12 }}>
            The real gains come from <strong>marking</strong> each paper honestly against the
            scheme. For the method, see{' '}
            <Link
              href="/blog/how-to-revise-with-cambridge-past-papers"
              className="ec-btn-underline"
            >
              how to revise with past papers
            </Link>
            .
          </p>
        </div>

        <aside className="ms-mark-example-slip mt-12">
          <div className="ms-mark-example-slip__body">
            <span className="ec-ink-stamp" aria-hidden>
              M1
            </span>
            <div className="ms-mark-example-slip__copy">
              <p className="ms-mark-example-slip__title">Make every paper count</p>
              <p className="ms-mark-example-slip__lead">
                A plan gets you doing papers. MarkScheme makes each one teach you something —
                upload your answers for mark-by-mark feedback against the real scheme.
              </p>
              <span className="ms-mark-example-slip__note" aria-hidden>
                the plan is nothing without the ink
              </span>
            </div>
          </div>
          <Link
            href="/mark"
            className="ec-btn-primary ms-mark-example-slip__cta inline-flex min-h-[44px] items-center gap-2"
          >
            Mark a paper free
            <span className="font-mono text-[11px] font-bold" aria-hidden>
              -&gt;
            </span>
          </Link>
        </aside>
      </ToolInstrumentShell>
    </>
  )
}
