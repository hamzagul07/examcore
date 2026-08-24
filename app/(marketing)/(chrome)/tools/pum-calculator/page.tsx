import Link from 'next/link'
import { getPageMetadata } from '@/lib/seo/page-meta'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { JsonLd } from '@/components/seo/JsonLd'
import { faqPageNode, softwareApplicationNode } from '@/lib/seo/structured-data'
import { PageHelpStrip } from '@/components/marketing/PageHelpStrip'
import { PumConverter } from '@/components/tools/PumConverter'
import { ToolInstrumentShell } from '@/components/tools/ToolInstrumentShell'

const PATH = '/tools/pum-calculator'

const FAQS = [
  {
    q: 'What is a Percentage Uniform Mark (PUM)?',
    a: 'A PUM is a raw mark converted onto a fixed 0–100 scale so grades mean the same thing across sessions and components. The grade thresholds are pinned to set values — A=80, B=70, C=60, D=50, E=40 — with full marks at 100 and zero at 0.',
  },
  {
    q: 'How do I convert raw marks to UMS / PUM?',
    a: 'Take your raw mark, the component total, and the A–E raw-mark thresholds for your session. Between two thresholds the scale is linear, so a mark part way through a grade band converts to a PUM part way between the two anchor values. Enter them above and the tool does the interpolation.',
  },
  {
    q: 'Why is my PUM different from my raw percentage?',
    a: 'Because the scale is anchored to grade boundaries, not to the raw total. If an A needs 60 out of 75 (80% raw) the A is still pinned to 80 PUM, but a harder paper where an A needs 55/75 (73% raw) also maps to 80 PUM — so your PUM reflects the grade standard, not the raw percentage.',
  },
  {
    q: 'Is PUM the same as UMS?',
    a: 'They are the same idea — a uniform mark scale that standardises grades across sessions. UK boards usually call it UMS (often out of a fixed maximum per unit); Cambridge International reports a Percentage Uniform Mark (PUM) on a 0–100 scale. This tool uses the 0–100 PUM model.',
  },
]

export const metadata = getPageMetadata(PATH, {
  title: 'Cambridge PUM / UMS calculator (raw marks → uniform mark)',
  description:
    'Free Cambridge PUM/UMS calculator: enter your raw mark, the total, and the A–E thresholds to convert to a Percentage Uniform Mark on the 0–100 scale.',
  keywords: [
    'PUM calculator',
    'UMS calculator',
    'percentage uniform mark',
    'raw marks to UMS',
    'Cambridge uniform mark',
    'convert raw marks to PUM',
  ],
})

function PumArtefact() {
  return (
    <aside
      className="ms-tools-artefact"
      aria-label="Example: raw 62 of 75 converts to PUM 83, grade A"
    >
      <div className="ms-tools-artefact__head">
        <span className="ms-tools-artefact__kicker">Raw → PUM</span>
        <span className="ms-tools-artefact__stamp" aria-hidden>
          %
        </span>
      </div>
      <div className="ms-tools-artefact__figure">
        <span className="ms-tools-artefact__raw">83</span>
        <span className="ms-tools-artefact__of">PUM</span>
        <span className="ms-tools-artefact__grade">A</span>
      </div>
      <dl className="ms-tools-artefact__rows">
        <div className="ms-tools-artefact__row">
          <dt>Raw</dt>
          <dd>62 / 75</dd>
        </div>
        <div className="ms-tools-artefact__row ms-tools-artefact__row--gap">
          <dt>A floor</dt>
          <dd>PUM 80</dd>
        </div>
      </dl>
      <p className="ms-tools-artefact__cite" aria-hidden>
        uniform scale — same grade, any session
      </p>
    </aside>
  )
}

export default function PumCalculatorPage() {
  return (
    <>
      <PageJsonLd
        path={PATH}
        title="Cambridge PUM / UMS calculator"
        description="Convert a raw mark to a Percentage Uniform Mark (PUM/UMS) on the 0–100 scale using the A–E grade thresholds."
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Tools', path: '/tools' },
          { name: 'PUM / UMS calculator', path: PATH },
        ]}
      />
      <JsonLd data={[faqPageNode(FAQS), softwareApplicationNode()]} />

      <ToolInstrumentShell
        stamp="%"
        label="Uniform-mark instrument"
        title={
          <>
            Cambridge PUM / <em>UMS</em> calculator
          </>
        }
        lead="Convert a raw mark into a Percentage Uniform Mark on the 0–100 scale. Enter your mark, the total, and the A–E thresholds — get your PUM, grade, and marks to the next band."
        note="boundaries pin the scale — not the raw percentage"
        artefact={<PumArtefact />}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Tools', path: '/tools' },
          { name: 'PUM / UMS calculator', path: PATH },
        ]}
        after={
          <>
            <section className="ms-tool-instrument__faq" aria-labelledby="pum-faq">
              <h2 id="pum-faq" className="ms-tool-instrument__faq-title">
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
        <PumConverter />

        <div className="mt-12 max-w-2xl">
          <h2 className="ms-h3">How the uniform mark scale works</h2>
          <p className="ms-body-2" style={{ marginTop: 10 }}>
            A raw mark on its own doesn&apos;t mean the same thing from session to session, because
            papers vary in difficulty. The uniform mark scale fixes each grade boundary to a set
            value — A=80, B=70, C=60, D=50, E=40 — and interpolates linearly in between, with full
            marks at 100 and zero at 0. That way a B is a B whether the raw boundary was 53 or 58.
            A* (PUM 90) is awarded on the overall subject aggregate, not on a single component, so
            this component-level tool uses the published A–E thresholds.
          </p>
          <p className="ms-body-2" style={{ marginTop: 12 }}>
            New to the term? Read{' '}
            <Link
              href="/blog/cambridge-pum-percentage-uniform-marks-explained-2026"
              className="ec-btn-underline"
            >
              Percentage Uniform Marks explained
            </Link>{' '}
            for the full picture.
          </p>
        </div>

        <aside className="ms-mark-example-slip mt-8">
          <div className="ms-mark-example-slip__body">
            <span className="ec-ink-stamp" aria-hidden>
              EX
            </span>
            <div className="ms-mark-example-slip__copy">
              <p className="ms-mark-example-slip__title">Sitting Edexcel International?</p>
              <p className="ms-mark-example-slip__lead">
                Units cash in via UMS (same idea as PUM, different board). MarkScheme marks Wave 1
                IAL Maths, Physics and Chemistry units live.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/edexcel/international-a-level/mathematics/grade-boundaries"
              className="ec-btn-secondary ec-btn-secondary--sm"
            >
              Edexcel UMS
            </Link>
            <Link
              href="/mark?board=edexcel&subject=WMA11"
              className="ec-btn-primary ec-btn-primary--sm inline-flex items-center gap-1"
            >
              Mark WMA11
              <span className="font-mono text-[11px] font-bold" aria-hidden>
                -&gt;
              </span>
            </Link>
          </div>
        </aside>

        <aside className="ms-mark-example-slip mt-8">
          <div className="ms-mark-example-slip__body">
            <span className="ec-ink-stamp" aria-hidden>
              M1
            </span>
            <div className="ms-mark-example-slip__copy">
              <p className="ms-mark-example-slip__title">Want to know where each mark went?</p>
              <p className="ms-mark-example-slip__lead">
                Convert the scale here — then put a real script under the scheme on the marking desk.
              </p>
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
