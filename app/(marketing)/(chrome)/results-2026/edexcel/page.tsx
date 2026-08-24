import Link from 'next/link'

import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { getPageMetadata } from '@/lib/seo/page-meta'
import { MockPackEmailCapture } from '@/components/tools/MockPackEmailCapture'
import { FunnelLandingView } from '@/components/analytics/FunnelLandingView'
import { ToolInstrumentShell } from '@/components/tools/ToolInstrumentShell'

const GUIDE_LINKS = [
  {
    href: '/blog/edexcel-ial-maths-grade-boundaries-ums-2026',
    title: 'IAL Maths grade boundaries & UMS',
    blurb: 'Raw marks → UMS → cash-in, without mixing Cambridge thresholds.',
    stamp: 'UMS',
  },
  {
    href: '/blog/edexcel-wma11-pure-mathematics-1-guide-2026',
    title: 'WMA11 Pure Mathematics 1',
    blurb: 'Unit map, past-paper loop, and mark CTA for Pure 1.',
    stamp: 'P1',
  },
  {
    href: '/blog/edexcel-ial-maths-past-papers-guide-2026',
    title: 'IAL Maths past papers',
    blurb: 'How to practise units without defaulting to CAIE dialect.',
    stamp: 'PP',
  },
  {
    href: '/blog/edexcel-ial-maths-marking-guide-2026',
    title: 'IAL Maths marking guide',
    blurb: 'Method / accuracy conventions when you second-pass handwriting.',
    stamp: 'M/A',
  },
] as const

export const metadata = getPageMetadata('/results-2026/edexcel', {
  title: 'Edexcel International results 2026 — UMS, remarks, next units',
  description:
    'Edexcel International A Level results hub: interpret UMS, plan remarks or retakes, browse IAL Maths units, and mark practice answers with method/accuracy conventions.',
  keywords: [
    'Edexcel International results 2026',
    'Edexcel IAL UMS',
    'Edexcel IAL remark',
    'Edexcel International A Level results',
  ],
})

function EdexcelArtefact() {
  return (
    <aside
      className="ms-tools-artefact"
      aria-label="Example: WMA11 unit UMS cash-in context"
    >
      <div className="ms-tools-artefact__head">
        <span className="ms-tools-artefact__kicker">IAL · UMS</span>
        <span className="ms-tools-artefact__stamp" aria-hidden>
          EX
        </span>
      </div>
      <div className="ms-tools-artefact__figure">
        <span className="ms-tools-artefact__raw" style={{ fontSize: '1.6rem' }}>
          WMA
        </span>
      </div>
      <dl className="ms-tools-artefact__rows">
        <div className="ms-tools-artefact__row">
          <dt>Scale</dt>
          <dd>UMS</dd>
        </div>
        <div className="ms-tools-artefact__row ms-tools-artefact__row--gap">
          <dt>Cash-in</dt>
          <dd>Units</dd>
        </div>
      </dl>
      <p className="ms-tools-artefact__cite" aria-hidden>
        not Cambridge thresholds — different ink
      </p>
    </aside>
  )
}

export default function Results2026EdexcelPage() {
  const path = '/results-2026/edexcel'

  return (
    <>
      <FunnelLandingView source="results-2026-edexcel" />
      <PageJsonLd
        path={path}
        title="Edexcel International results 2026"
        description="Interpret IAL UMS, plan remarks or retakes, and practise with examiner-style marking."
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Results 2026', path: '/results-2026' },
          { name: 'Edexcel International', path },
        ]}
      />

      <ToolInstrumentShell
        stamp="EX"
        label="Edexcel International · 2026"
        title={
          <>
            IAL results — <em>UMS</em>, remarks, next units
          </>
        }
        lead="Modular International A Levels cash in via UMS. Use your unit results to decide on enquiries, retakes, and which Pure/Mechanics/Statistics papers to rebuild."
        note="Cambridge tables do not map onto IAL units"
        artefact={<EdexcelArtefact />}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Results 2026', path: '/results-2026' },
          { name: 'Edexcel', path },
        ]}
        actions={
          <>
            <Link
              href="/edexcel/international-a-level/mathematics"
              className="ec-btn-primary inline-flex min-h-[48px] items-center gap-2"
            >
              IAL Mathematics hub
              <span className="font-mono text-[11px] font-bold" aria-hidden>
                -&gt;
              </span>
            </Link>
            <Link
              href="/mark?board=edexcel&subject=WMA11"
              className="ec-btn-ghost inline-flex min-h-[48px] items-center"
            >
              Mark WMA11
            </Link>
            <Link
              href="/blog/edexcel-ial-maths-grade-boundaries-ums-2026"
              className="ec-btn-ghost inline-flex min-h-[48px] items-center"
            >
              UMS explainer
            </Link>
          </>
        }
      >
        <h2 className="ms-h2">IAL Maths guides</h2>
        <p className="ms-lead mt-3" style={{ maxWidth: '56ch' }}>
          Cambridge Results Day traffic often lands here by mistake. Start with UMS, then practise
          the unit you are rebuilding.
        </p>
        <ul className="mt-6 grid list-none gap-3 p-0 sm:grid-cols-2">
          {GUIDE_LINKS.map((g) => (
            <li key={g.href}>
              <Link href={g.href} className="ms-mark-example-slip h-full no-underline">
                <div className="ms-mark-example-slip__body">
                  <span className="ec-ink-stamp" aria-hidden>
                    {g.stamp}
                  </span>
                  <div className="ms-mark-example-slip__copy">
                    <p className="ms-mark-example-slip__title">{g.title}</p>
                    <p className="ms-mark-example-slip__lead">{g.blurb}</p>
                  </div>
                </div>
                <span className="font-mono text-[11px] font-bold text-[var(--ec-brand)]" aria-hidden>
                  -&gt;
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <h2 className="ms-h2">After results</h2>
            <ul className="ms-body-2 list-disc space-y-2 pl-5">
              <li>Map each unit grade to your cash-in combination and overall UMS target.</li>
              <li>
                Talk to your exams officer about enquiries upon results before centre deadlines.
              </li>
              <li>Retake the unit where a mark move is realistic — not every modular paper.</li>
              <li>
                Rebuild weak topics on the{' '}
                <Link href="/edexcel/international-a-level/mathematics" className="underline">
                  IAL Maths unit map
                </Link>{' '}
                then mark a typed or photographed answer.
              </li>
            </ul>
          </div>
          <MockPackEmailCapture source="results-2026-edexcel" />
        </div>

        <div className="ms-tool-instrument__links mt-10">
          <Link href="/results-2026" className="ec-link">
            Cambridge Results Day hub -&gt;
          </Link>
          <Link href="/results-2026/ib" className="ec-link">
            IB Diploma results -&gt;
          </Link>
        </div>
      </ToolInstrumentShell>
    </>
  )
}
