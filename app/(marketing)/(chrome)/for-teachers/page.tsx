import type { ReactNode } from 'react'
import Link from 'next/link'
import { getPageMetadata } from '@/lib/seo/page-meta'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { JsonLd } from '@/components/seo/JsonLd'
import { faqPageNode } from '@/lib/seo/structured-data'
import { FOR_TEACHERS_SEO_FAQ, TEACHER_WEEK } from '@/lib/seo/for-teachers-seo'
import { GEO_CATEGORY } from '@/lib/seo/llms-geo-qa'
import { SchoolLinkKit } from '@/components/marketing/SchoolLinkKit'
import { ToolInstrumentShell } from '@/components/tools/ToolInstrumentShell'
import {
  InkGlyphArrow,
  InkGlyphCards,
  InkGlyphNotes,
  InkGlyphProgress,
  InkGlyphTick,
} from '@/components/margin-notes'

export const metadata = getPageMetadata('/for-teachers')

const GLYPHS: Record<(typeof TEACHER_WEEK)[number]['glyph'], ReactNode> = {
  notes: <InkGlyphNotes title="" />,
  tick: <InkGlyphTick title="" />,
  cards: <InkGlyphCards title="" />,
  progress: <InkGlyphProgress title="" />,
  arrow: <InkGlyphArrow title="" />,
}

type Cell = 'done' | 'late' | 'reviewed' | 'missing' | 'excused'

const MATRIX: Array<{ name: string; cells: Array<[Cell, string]> }> = [
  { name: 'Amira K.', cells: [['reviewed', 'RV 4/4'], ['done', '✓ 7/9'], ['done', '✓ 5/5']] },
  { name: 'Ben O.', cells: [['done', '✓ 3/4'], ['late', 'L 4/9'], ['late', 'L 2/5']] },
  { name: 'Chloe W.', cells: [['done', '✓ 4/4'], ['done', '✓ 8/9'], ['missing', '—']] },
  { name: 'Dev S.', cells: [['missing', '—'], ['missing', '—'], ['missing', '—']] },
  { name: 'Ella M.', cells: [['excused', 'EXC'], ['excused', 'EXC'], ['excused', 'EXC']] },
]

/**
 * The hero artefact: a miniature of the completion matrix — the screen a
 * teacher opens on Wednesday — built from the same cell styles the product
 * uses, so the promise and the product look the same.
 */
function TeacherMatrixArtefact() {
  return (
    <figure className="ms-teacher-artefact" aria-labelledby="teacher-artefact-caption">
      <div className="ms-teacher-artefact__head" aria-hidden>
        <span>12B Maths · set 4</span>
        <span>due Fri 16:00</span>
      </div>
      <p className="ms-teacher-artefact__title" id="teacher-artefact-caption">
        Integration — 3 questions
      </p>
      <table className="ms-teacher-artefact__grid">
        <caption className="sr-only">
          Example class matrix: one row per student, one column per question, showing handed in,
          late, reviewed, missing and excused work.
        </caption>
        <thead>
          <tr>
            <th scope="col">
              <span className="sr-only">Student</span>
            </th>
            <th scope="col">Q1</th>
            <th scope="col">Q2</th>
            <th scope="col">Q3</th>
          </tr>
        </thead>
        <tbody>
          {MATRIX.map((row) => (
            <tr key={row.name}>
              <th scope="row">{row.name}</th>
              {row.cells.map(([state, text], i) => (
                <td key={i}>
                  <span className={`ms-set-matrix__cell ms-set-matrix__cell--${state}`}>{text}</span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <span className="ms-teacher-artefact__note" aria-hidden>
        remind Dev · Ben&apos;s in late
      </span>
    </figure>
  )
}

function Slip({ stamp, title, children }: { stamp: string; title?: string; children: ReactNode }) {
  return (
    <div className="ms-mark-example-slip">
      <div className="ms-mark-example-slip__body">
        <span className="ec-ink-stamp" aria-hidden>
          {stamp}
        </span>
        <div className="ms-mark-example-slip__copy">
          {title ? <p className="ms-mark-example-slip__title">{title}</p> : null}
          {children}
        </div>
      </div>
    </div>
  )
}

export default function ForTeachersPage() {
  return (
    <>
      <PageJsonLd
        path="/for-teachers"
        title="MarkScheme for teachers & schools"
        description="Set past-paper work, see who handed it in, review the marks and reteach the gap — Cambridge & IB handwriting marking for your class."
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
            Set the work. See <em>who handed it in</em>.
          </>
        }
        lead="Set past-paper questions, a whole paper or a topic drill. Your students mark their handwriting against the real mark scheme, and every mark lands on your desk as it happens — who is done, who is late, and what the whole class keeps dropping."
        note="free for teachers — not a trial"
        artefact={<TeacherMatrixArtefact />}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'For teachers', path: '/for-teachers' },
        ]}
        actions={
          <>
            <Link href="/for-teachers/start" className="ec-btn-primary inline-flex min-h-[48px] items-center gap-2">
              <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
                CLS
              </span>
              Set up your first class
              <span className="font-mono text-[11px] font-bold" aria-hidden>
                -&gt;
              </span>
            </Link>
            <Link href="/contact" className="ec-btn-ghost inline-flex min-h-[48px] items-center">
              Talk to us about your school
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
        <aside className="mb-10">
          <Slip stamp="QA" title="Quick answer">
            <p className="ms-mark-example-slip__lead">
              <strong>MarkScheme</strong> gives Cambridge and IB teachers a class desk: set work from
              past papers, see who handed it in and what they scored, confirm or re-mark the AI&apos;s
              marks, and reteach the gap the class shares — all on the same{' '}
              {GEO_CATEGORY.secondPassMarking} engine students use at /mark.
            </p>
          </Slip>
        </aside>

        <section className="mb-12" aria-labelledby="teacher-week">
          <h2 id="teacher-week" className="ms-h2">
            A week at the desk
          </h2>
          <p className="ms-body-2 mt-3 max-w-2xl text-[var(--ec-text-secondary)]">
            Marking a set of mocks used to be a lost weekend. This is what the same week looks like when
            the first pass is done for you and you keep the judgement.
          </p>
          <ol className="ms-teacher-week">
            {TEACHER_WEEK.map((day) => (
              <li key={`${day.when}-${day.title}`} className="ms-teacher-week__day">
                <span className="ms-teacher-week__when">{day.when}</span>
                <span className="ms-teacher-week__glyph" aria-hidden>
                  {GLYPHS[day.glyph]}
                </span>
                <div className="ms-teacher-week__copy">
                  <h3 className="ms-teacher-week__title">{day.title}</h3>
                  <p className="ms-teacher-week__body">{day.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mb-12" aria-labelledby="teacher-gap">
          <h2 id="teacher-gap" className="ms-h2">
            Not &ldquo;weak on organic&rdquo; — the marks they actually drop
          </h2>
          <div className="mt-5">
            <Slip stamp="M1">
              <p className="ms-mark-example-slip__lead" style={{ marginTop: 0 }}>
                Every script is marked point by point against the published scheme, so the class
                summary is specific: <strong>&ldquo;they earn 84% of method marks and 9% of analysis
                marks.&rdquo;</strong> That is a lesson you can plan on Monday. The blindspot report
                shows which syllabus points the class loses marks on, and which students share one
                mistake, so a short drill can go to just them.
              </p>
              <p className="ms-mark-example-slip__lead">
                Where too few scripts are in to be sure, it says so rather than guessing.
              </p>
              <span className="ms-mark-example-slip__note" aria-hidden>
                a lesson plan, not a vibe check
              </span>
            </Slip>
          </div>
        </section>

        <section className="mb-12" aria-labelledby="teacher-privacy">
          <h2 id="teacher-privacy" className="ms-h2">
            What you see — and what you don&apos;t
          </h2>
          <div className="mt-5">
            <Slip stamp="PRV">
              <p className="ms-mark-example-slip__lead" style={{ marginTop: 0 }}>
                Students are told before they join: you see the work they mark on MarkScheme{' '}
                <strong>in your class&apos;s subject, from the day they join</strong>. Nothing from
                before, nothing in other subjects, never their email address. If they leave the class,
                their new work leaves your desk with them.
              </p>
              <p className="ms-mark-example-slip__lead">
                Students never see each other&apos;s marks or names. The class average stays hidden
                from them unless you switch it on. Exports use first names and initials only.
              </p>
            </Slip>
          </div>
        </section>

        <section className="mb-12" aria-labelledby="teacher-cost">
          <h2 id="teacher-cost" className="ms-h2">
            What it costs
          </h2>
          <div className="mt-5">
            <Slip stamp="FREE">
              <p className="ms-mark-example-slip__lead" style={{ marginTop: 0 }}>
                Nothing. Classes, sets, the class matrix, reviews, feedback, exports and the Sunday
                digest are free for teachers. Verify your seat with your school email and you also get{' '}
                <strong>300 marks a month</strong> for your own marking — and every student in your
                classes gets extra marks each month on top of their own allowance.
              </p>
              <span className="ms-mark-example-slip__note" aria-hidden>
                no card, no trial, no licence
              </span>
            </Slip>
          </div>
        </section>

        <section className="mb-12" aria-labelledby="teacher-embeds">
          <h2 id="teacher-embeds" className="ms-h2">
            Free embeds for your VLE or blog
          </h2>
          <p className="ms-body-2 mt-3 max-w-2xl text-[var(--ec-text-secondary)]">
            Drop a calculator or daily practice prompt onto your school site. Each widget links back to
            MarkScheme with a clear &ldquo;Powered by MarkScheme&rdquo; credit.
          </p>
          <pre className="mt-4 overflow-x-auto rounded border border-[var(--ec-border)] bg-[var(--ec-paper,var(--ec-surface))] p-3 font-mono text-xs shadow-[var(--ec-shadow-elevation-1)]">
{`<iframe
  src="https://markscheme.app/embed/grade-boundary"
  title="Grade boundary calculator"
  style="width:100%;min-height:480px;border:0"
></iframe>`}
          </pre>
          <pre className="mt-3 overflow-x-auto rounded border border-[var(--ec-border)] bg-[var(--ec-paper,var(--ec-surface))] p-3 font-mono text-xs shadow-[var(--ec-shadow-elevation-1)]">
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
              <p className="ms-mark-example-slip__title">Ready for your first set?</p>
              <p className="ms-mark-example-slip__lead">
                Four fields and you have a class and a code to read out. Set the first piece of work
                the same afternoon.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/for-teachers/start" className="ec-btn-primary inline-flex min-h-[44px] items-center gap-2">
              Set up your first class
              <span className="font-mono text-[11px] font-bold" aria-hidden>
                -&gt;
              </span>
            </Link>
            <Link href="/contact" className="ec-btn-ghost inline-flex min-h-[44px] items-center">
              Talk to us about your school
            </Link>
          </div>
        </aside>
      </ToolInstrumentShell>
    </>
  )
}
