'use client'

import { LandingSectionReveal } from './LandingSectionReveal'
import { DeviceFrame } from '@/components/marketing/DeviceFrame'

const STEPS = [
  {
    src: '/landing-screenshots/marking-result-1.png',
    width: 811,
    height: 808,
    title: 'Your score, right there',
    body: 'Marks earned, the paper, and the question — checked against the official Cambridge scheme for that session.',
    alt: 'Examcore marking result showing 3 out of 3 marks, official 9709 mark scheme banner, and the binomial expansion question',
  },
  {
    src: '/landing-screenshots/marking-result-2.png',
    width: 793,
    height: 817,
    title: 'Every mark, accounted for',
    body: "You'll see exactly where you nailed it and where you slipped — B1, M1, A1 explained like an examiner would write them.",
    alt: 'Mark-by-mark breakdown with B1, M1, and A1 earned explanations for a Mathematics answer',
  },
  {
    src: '/landing-screenshots/marking-result-3.png',
    width: 592,
    height: 827,
    title: 'Ink on your paper',
    body: 'Stamps and notes sit on your actual handwriting — not a vague paragraph at the bottom of the page.',
    alt: "Examiner's Ink on handwritten binomial expansion work with B1, M1, and A1 stamps on the student's script",
  },
  {
    src: '/landing-screenshots/marking-result-4.png',
    width: 1067,
    height: 730,
    title: 'Then learn and retry',
    body: 'Open a worked solution when you want the method, then mark another go at the same question or move on.',
    alt: 'Worked solution prompt and buttons to mark another attempt or a new question',
  },
] as const

export function LandingScreenshotSteps() {
  return (
    <div className="space-y-24 sm:space-y-32">
      {STEPS.map((step, index) => {
        const imageOnRight = index % 2 === 1
        return (
          <LandingSectionReveal key={step.src} delay={index * 0.05}>
            <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <div className={imageOnRight ? 'lg:order-2' : ''}>
                <DeviceFrame
                  src={step.src}
                  alt={step.alt}
                  width={step.width}
                  height={step.height}
                  priority={index === 0}
                />
              </div>
              <div
                className={`max-w-lg ${imageOnRight ? 'lg:order-1 lg:pr-4' : 'lg:pl-4'}`}
              >
                <span className="ec-label-tech mb-4">Step {index + 1}</span>
                <h3 className="landing-h3 mb-4 text-[var(--ec-text-primary)]">
                  {step.title}
                </h3>
                <p className="landing-lead">{step.body}</p>
              </div>
            </div>
          </LandingSectionReveal>
        )
      })}
    </div>
  )
}
