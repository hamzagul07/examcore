import Link from 'next/link'
import { Chip } from '@/components/margin-notes'

const STEPS = [
  {
    num: '1.',
    title: 'Upload your working',
    body: 'Snap your handwritten answer or drop a PDF. Pick the paper code so we fetch the right scheme.',
    chips: [
      { variant: 'outline' as const, label: '9702_s23_qp_22.pdf' },
      { variant: 'outline' as const, label: 'IMG_0231.jpg · Q3 (a)–(c)' },
    ],
  },
  {
    num: '2.',
    title: 'Marked mark-by-mark',
    body: "Each line of working is checked against the scheme's criteria — and stamped where the mark lands.",
    chips: [
      { variant: 'ok' as const, label: 'C1 ✓ ω = 2π/T' },
      { variant: 'no' as const, label: 'M0 ✗ wrong relation' },
      { variant: 'ok' as const, label: 'B1 ✓ sketch correct' },
    ],
  },
  {
    num: '3.',
    title: 'Fix what lost marks',
    body: 'Every dropped mark links to the syllabus point and a free lesson — so the same mistake doesn\u2019t repeat.',
    chips: [
      { variant: 'warn' as const, label: 'Fix next: SHM equations' },
      { variant: 'dim' as const, label: '→ free lesson · 9702 unit 17' },
    ],
  },
]

export function LandingSteps() {
  return (
    <section id="how-it-works" className="ms-pg ms-sec scroll-mt-20">
      <p className="ms-overline">How it works</p>
      <h2 className="ms-h2">
        Upload. Mark. <em>Fix.</em>
      </h2>
      <p className="ms-body-2" style={{ marginTop: 4 }}>
        <Link href="/how-it-works" className="ec-btn-underline" style={{ fontSize: 15 }}>
          Full walkthrough — honest about the AI →
        </Link>
      </p>
      <div className="ms-steps">
        {STEPS.map((step) => (
          <div key={step.num} className="ec-card ms-step">
            <div className="ms-num">{step.num}</div>
            <h3 className="ms-h3">{step.title}</h3>
            <p className="ms-body-2">{step.body}</p>
            <div className="ms-step-art">
              {step.chips.map((c) => (
                <Chip key={c.label} variant={c.variant}>
                  {c.label}
                </Chip>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
