import Link from 'next/link'
import { getPageMetadata } from '@/lib/seo/page-meta'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { JsonLd } from '@/components/seo/JsonLd'
import { faqPageNode } from '@/lib/seo/structured-data'
import { FOR_TEACHERS_SEO_FAQ, TEACHER_FEATURES } from '@/lib/seo/for-teachers-seo'
import { GEO_CATEGORY } from '@/lib/seo/llms-geo-qa'
import { SchoolLinkKit } from '@/components/marketing/SchoolLinkKit'
import { ToolInstrumentShell } from '@/components/tools/ToolInstrumentShell'

export const metadata = getPageMetadata('/for-teachers')

const FEATURE_STAMPS = ['CLS', 'EMB', 'GAP', 'RSK', 'REV', 'M1'] as const

function TeacherDeskArtefact() {
  return (
    <aside
      className="ms-tools-artefact"
      aria-label="Example class slip: method high, analysis low"
    >
      <div className="ms-tools-artefact__head">
        <span className="ms-tools-artefact__kicker">Y12 Chem · cohort</span>
        <span className="ms-tools-artefact__stamp" aria-hidden>
          CLS
        </span>
      </div>
      <div className="ms-tools-artefact__figure">
        <span className="ms-tools-artefact__raw">84</span>
        <span className="ms-tools-artefact__of">% M</span>
      </div>
      <dl className="ms-tools-artefact__rows">
        <div className="ms-tools-artefact__row">
          <dt>Method</dt>
          <dd>84%</dd>
        </div>
        <div className="ms-tools-artefact__row ms-tools-artefact__row--gap">
          <dt>Analysis</dt>
          <dd>9%</dd>
        </div>
        <div className="ms-tools-artefact__row">
          <dt>Lesson</dt>
          <dd>Monday plan</dd>
        </div>
      </dl>
      <p className="ms-tools-artefact__cite" aria-hidden>
        not vibes — marks the class actually drops
      </p>
    </aside>
  )
}

export default function ForTeachersPage() {
  return (
    <>
      <PageJsonLd
        path="/for-teachers"
        title="MarkScheme for teachers & schools"
        description="Classrooms, blindspot analytics, and review queues on top of Cambridge & IB past-paper marking."
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'For teachers', path: '/for-teachers' },
        ]}
      />
      <JsonLd
        data={faqPageNode(FOR_TEACHERS_SEO_FAQ, {
          speakableSelectors: ['.for-teachers-faq dt', '.for-teachers-faq dd'],
        })}
      />

      <ToolInstrumentShell
        stamp="TCH"
        label="For teachers & schools"
        title={
          <>
            Class desk on <em>real</em> past-paper marking
          </>
        }
        lead="Students mark handwriting at /mark; you see class blindspots, grade risk, and can override AI marks when it matters."
        note="free for teachers — not a trial"
        artefact={<TeacherDeskArtefact />}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'For teachers', path: '/for-teachers' },
        ]}
        actions={
          <>
            <Link
              href="/for-teachers/start"
              className="ec-btn-primary inline-flex min-h-[48px] items-center gap-2"
            >
              <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
                CLS
              </span>
              Set up your first class
              <span className="font-mono text-[11px] font-bold" aria-hidden>
                -&gt;
              </span>
            </Link>
            <Link href="/contact" className="ec-btn-ghost inline-flex min-h-[48px] items-center">
              Contact for schools
            </Link>
          </>
        }
        after={
          <section className="ms-tool-instrument__faq" aria-labelledby="teachers-faq">
            <h2 id="teachers-faq" className="ms-tool-instrument__faq-title">
              Frequently asked
            </h2>
            <dl className="for-teachers-faq ms-tool-faq">
              {FOR_TEACHERS_SEO_FAQ.map((item) => (
                <div key={item.q}>
                  <dt>{item.q}</dt>
                  <dd>{item.a}</dd>
                </div>
              ))}
            </dl>
          </section>
        }
      >
        <aside className="ms-mark-example-slip mb-10">
          <div className="ms-mark-example-slip__body">
            <span className="ec-ink-stamp" aria-hidden>
              QA
            </span>
            <div className="ms-mark-example-slip__copy">
              <p className="ms-mark-example-slip__title">Quick answer</p>
              <p className="ms-mark-example-slip__lead">
                <strong>MarkScheme</strong> lets Cambridge and IB teachers create classrooms with
                invite codes, view class-wide topic blindspots, and review student past-paper
                marking — built on the same {GEO_CATEGORY.secondPassMarking} engine students use at
                /mark.
              </p>
            </div>
          </div>
        </aside>

        <section className="mb-12">
          <h2 className="ms-h2">Marking a set of mocks is a lost weekend</h2>
          <div className="ms-mark-example-slip mt-5">
            <div className="ms-mark-example-slip__body">
              <span className="ec-ink-stamp" aria-hidden>
                ¶
              </span>
              <div className="ms-mark-example-slip__copy">
                <p className="ms-mark-example-slip__lead" style={{ marginTop: 0 }}>
                  Put the class set through and you get every script marked against the real mark
                  scheme, plus one page telling you what the cohort actually cannot do — not
                  &ldquo;they&apos;re weak on organic chemistry&rdquo;, but{' '}
                  <strong>
                    &ldquo;they earn 84% of method marks and 9% of analysis marks&rdquo;
                  </strong>
                  . That is a lesson you can plan on Monday.
                </p>
                <p className="ms-mark-example-slip__lead">
                  Where too few scripts have been marked to be sure, it says so rather than
                  guessing. Teacher accounts are free — set one up yourself in about thirty seconds.
                </p>
                <span className="ms-mark-example-slip__note" aria-hidden>
                  a lesson plan, not a vibe check
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="ms-h2">What teachers get</h2>
          <ul className="ms-board-index ms-board-index--guides mt-5">
            {TEACHER_FEATURES.map((f, i) => (
              <li key={f.title} className="ms-board-slip">
                <span className="ms-board-slip__code">{FEATURE_STAMPS[i] ?? 'T'}</span>
                <span className="ms-board-slip__body">
                  <span className="ms-board-slip__name">{f.title}</span>
                  <span className="ms-board-slip__blurb">{f.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="ms-h2">Free embeds for your VLE or blog</h2>
          <p className="ms-body-2 mt-3 max-w-2xl text-[var(--ec-text-secondary)]">
            Drop a calculator or daily practice prompt onto your school site. Each widget links back
            to MarkScheme with a clear &ldquo;Powered by MarkScheme&rdquo; credit.
          </p>
          <pre className="mt-4 overflow-x-auto rounded border border-[var(--ec-border)] bg-[var(--ec-paper,var(--ec-surface))] p-3 font-mono text-xs shadow-[var(--ec-shadow-hard,2px_2px_0_rgba(0,0,0,0.05))]">
{`<iframe
  src="https://markscheme.app/embed/grade-boundary"
  title="Grade boundary calculator"
  style="width:100%;min-height:480px;border:0"
></iframe>`}
          </pre>
          <pre className="mt-3 overflow-x-auto rounded border border-[var(--ec-border)] bg-[var(--ec-paper,var(--ec-surface))] p-3 font-mono text-xs shadow-[var(--ec-shadow-hard,2px_2px_0_rgba(0,0,0,0.05))]">
{`<iframe
  src="https://markscheme.app/embed/question-of-day"
  title="Question of the day"
  style="width:100%;min-height:280px;border:0"
></iframe>`}
          </pre>
        </section>

        <SchoolLinkKit />

        <aside className="ms-mark-example-slip mt-12">
          <div className="ms-mark-example-slip__body">
            <span className="ec-ink-stamp" aria-hidden>
              CLS
            </span>
            <div className="ms-mark-example-slip__copy">
              <p className="ms-mark-example-slip__title">Ready to open the class desk?</p>
              <p className="ms-mark-example-slip__lead">
                Four fields, one invite code, then your students mark as usual. Analytics fill in as
                they go.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/for-teachers/start"
              className="ec-btn-primary inline-flex min-h-[44px] items-center gap-2"
            >
              Set up your first class
              <span className="font-mono text-[11px] font-bold" aria-hidden>
                -&gt;
              </span>
            </Link>
            <Link href="/contact" className="ec-btn-ghost inline-flex min-h-[44px] items-center">
              Contact for schools
            </Link>
          </div>
        </aside>
      </ToolInstrumentShell>
    </>
  )
}
