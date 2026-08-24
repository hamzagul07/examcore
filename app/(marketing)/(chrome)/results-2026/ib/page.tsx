import Link from 'next/link'

import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { getPageMetadata } from '@/lib/seo/page-meta'
import { MockPackEmailCapture } from '@/components/tools/MockPackEmailCapture'
import { ToolInstrumentShell } from '@/components/tools/ToolInstrumentShell'

export const metadata = getPageMetadata('/results-2026/ib', {
  title: 'IB Diploma results 2026 — points, remarks, next steps',
  description:
    'IB Diploma results season hub: interpret your points, plan EARs/retakes, use the IB points calculator, and capture a mock-season pack for November.',
  keywords: [
    'IB results 2026',
    'IB Diploma points',
    'IB remark',
    'IB points calculator',
  ],
})

function IbResultsArtefact() {
  return (
    <aside
      className="ms-tools-artefact"
      aria-label="Example: 38 points out of 45"
    >
      <div className="ms-tools-artefact__head">
        <span className="ms-tools-artefact__kicker">Diploma · results</span>
        <span className="ms-tools-artefact__stamp" aria-hidden>
          45
        </span>
      </div>
      <div className="ms-tools-artefact__figure">
        <span className="ms-tools-artefact__raw">38</span>
        <span className="ms-tools-artefact__of">/ 45</span>
      </div>
      <dl className="ms-tools-artefact__rows">
        <div className="ms-tools-artefact__row">
          <dt>Pass</dt>
          <dd>Check conditions</dd>
        </div>
        <div className="ms-tools-artefact__row ms-tools-artefact__row--gap">
          <dt>Next</dt>
          <dd>EAR / retake</dd>
        </div>
      </dl>
      <p className="ms-tools-artefact__cite" aria-hidden>
        points first — then which band to climb
      </p>
    </aside>
  )
}

export default function Results2026IbPage() {
  const path = '/results-2026/ib'

  return (
    <>
      <PageJsonLd
        path={path}
        title="IB Diploma results 2026"
        description="Interpret IB points, plan remarks or retakes, and practise criterion marking."
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Results 2026', path: '/results-2026' },
          { name: 'IB Diploma', path },
        ]}
      />

      <ToolInstrumentShell
        stamp="45"
        label="IB Diploma · 2026"
        title={
          <>
            IB results — points, remarks, <em>next papers</em>
          </>
        }
        lead="Use your points total and subject grades to decide on enquiries upon results, retakes, and which HL/SL topics to rebuild before the next session."
        note="24 is the floor — conditions decide the award"
        artefact={<IbResultsArtefact />}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Results 2026', path: '/results-2026' },
          { name: 'IB', path },
        ]}
        actions={
          <>
            <Link
              href="/tools/ib-points-calculator"
              className="ec-btn-primary inline-flex min-h-[48px] items-center gap-2"
            >
              IB points calculator
              <span className="font-mono text-[11px] font-bold" aria-hidden>
                -&gt;
              </span>
            </Link>
            <Link
              href="/ib/courses"
              className="ec-btn-ghost inline-flex min-h-[48px] items-center"
            >
              Free IB courses
            </Link>
            <Link
              href="/mark?board=ib"
              className="ec-btn-ghost inline-flex min-h-[48px] items-center"
            >
              Mark with IB criteria
            </Link>
          </>
        }
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <h2 className="ms-h2">After results</h2>
            <ul className="ms-body-2 list-disc space-y-2 pl-5">
              <li>
                Confirm university / school conditions against your total points and core
                requirements.
              </li>
              <li>
                Discuss category 1 / 2 / 3 enquiries with your IB coordinator before deadlines.
              </li>
              <li>
                Retake planning: pick the components where a band move is realistic, not every
                paper.
              </li>
              <li>
                Rebuild weak topics in{' '}
                <Link href="/ib/topic-practice" className="underline">
                  IB topic practice
                </Link>{' '}
                then mark a typed answer.
              </li>
            </ul>
          </div>
          <MockPackEmailCapture source="results-2026-ib" />
        </div>

        <div className="ms-tool-instrument__links mt-10">
          <Link href="/results-2026" className="ec-link">
            Cambridge Results Day hub -&gt;
          </Link>
          <Link href="/results-2026/edexcel" className="ec-link">
            Edexcel International -&gt;
          </Link>
        </div>
      </ToolInstrumentShell>
    </>
  )
}
