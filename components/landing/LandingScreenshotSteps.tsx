'use client'

import Image from 'next/image'
import { LandingSectionReveal } from './LandingSectionReveal'

const STEPS = [
  {
    src: '/landing-screenshots/marking-result-1.png',
    width: 811,
    height: 808,
    title: 'Your score, right there',
    body: 'Marks earned, the paper, and the question — checked against the official Cambridge scheme for that session.',
    alt: 'MarkScheme marking result showing 3 out of 3 marks, official 9709 mark scheme banner, and the binomial expansion question',
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
    body: 'Stamps and notes sit on your typed or handwritten working — not a vague paragraph at the bottom of the page.',
    alt: "Examiner's Ink on binomial expansion work with B1, M1, and A1 stamps on the student's script",
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
    <div className="ms-hiw-shots">
      {STEPS.map((step, index) => {
        const imageOnRight = index % 2 === 1
        return (
          <LandingSectionReveal key={step.src} delay={index * 0.05}>
            <div className="ms-hiw-shot">
              <div className={imageOnRight ? 'ms-hiw-shot__media ms-hiw-shot__media--right' : 'ms-hiw-shot__media'}>
                <figure className="ms-shot-paper">
                  <figcaption className="ms-shot-paper__cap">
                    <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
                      {index + 1}
                    </span>
                    <span className="ms-shot-paper__label">SCRIPT · STEP {index + 1}</span>
                  </figcaption>
                  <div className="ms-shot-paper__frame">
                    <Image
                      src={step.src}
                      alt={step.alt}
                      width={step.width}
                      height={step.height}
                      priority={index === 0}
                      className="ms-shot-paper__img"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 560px"
                    />
                  </div>
                </figure>
              </div>
              <div
                className={
                  imageOnRight
                    ? 'ms-hiw-shot__copy ms-hiw-shot__copy--left'
                    : 'ms-hiw-shot__copy'
                }
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
                    {index + 1}
                  </span>
                  <p className="ms-overline" style={{ marginBottom: 0 }}>
                    Step {index + 1}
                  </p>
                </div>
                <h3 className="ms-h3" style={{ marginTop: 14 }}>
                  {step.title}
                </h3>
                <p className="ms-body-2" style={{ marginTop: 10, maxWidth: 420 }}>
                  {step.body}
                </p>
              </div>
            </div>
          </LandingSectionReveal>
        )
      })}
    </div>
  )
}
