import Link from 'next/link'
import { Chip } from '@/components/margin-notes'
import { InkDemoVideo } from '@/components/marketing/InkDemoVideo'

const STEPS = [
  {
    num: '1.',
    title: 'Put the working on the desk',
    body: 'Type it, snap the page, or drop a PDF. Name the paper — we pull the scheme that examiner used.',
    chips: [
      { variant: 'outline' as const, label: 'Typed · Q7(b) working' },
      { variant: 'outline' as const, label: '9702_s23_qp_22.pdf' },
    ],
  },
  {
    num: '2.',
    title: 'Every mark earns a stamp',
    body: 'Line by line against the scheme — green when it lands, crimson when it slips, codes in the margin like the real hall.',
    chips: [
      { variant: 'ok' as const, label: 'C1 ✓ ω = 2π/T' },
      { variant: 'no' as const, label: 'M0 ✗ wrong relation' },
      { variant: 'ok' as const, label: 'B1 ✓ sketch correct' },
    ],
  },
  {
    num: '3.',
    title: 'Chase the leak, not the chapter',
    body: 'Dropped marks open the exact syllabus point — and on Max, the Vault rebuilds a desk and Cinema beat around it.',
    chips: [
      { variant: 'warn' as const, label: 'Fix next: SHM equations' },
      { variant: 'dim' as const, label: '→ free lesson · 9702 unit 17' },
    ],
  },
]

export function LandingMarkingSection() {
  return (
    <section id="how-it-works" className="ms-pg ms-sec scroll-mt-20 ec-section-tint ec-section-tint--mark">
      <p className="ms-overline">How marking works</p>
      <h2 className="ms-h2">
        Ink lands. Truth <em>shows.</em>
      </h2>
      <p className="ms-lead ms-marking-lead">
        Not a chatbot guessing. The real scheme for that paper — B1, M1, A1 — stamped onto{' '}
        <em>your</em> lines, so the next attempt hits what this one missed.
      </p>

      {/* The whole journey in 38 seconds — snap, upload, stamps, the withheld
          mark and its reason. Lazy-mounted: costs a 55 KB poster until the
          viewer scrolls near. */}
      <InkDemoVideo className="mx-auto mt-10 max-w-[880px]" />

      <div className="ms-steps">
        {STEPS.map((step, i) => (
          <div key={step.num} className={`ms-step ms-step--paper ms-step--${i + 1}`}>
            <div className="ms-num">{step.num}</div>
            <h3 className="ms-h3">{step.title}</h3>
            <p className="ms-body-2">{step.body}</p>
            <div className="ms-step-art ms-step-art--ruled">
              {step.chips.map((c) => (
                <Chip key={c.label} variant={c.variant}>
                  {c.label}
                </Chip>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="ms-marking-foot">
        <Link href="/how-it-works" className="ec-btn-underline" style={{ fontSize: 15 }}>
          Full walkthrough — honest about the AI →
        </Link>
      </p>
    </section>
  )
}
