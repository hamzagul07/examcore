'use client'

/**
 * The numbered progress line across the top of the wizard. Steps already
 * passed are buttons, so a student can go back to change a date without
 * pressing Back four times; the ones ahead are plain text until reached.
 */

import { SETUP_STEPS, type SetupStep } from '@/lib/plan/wizard-state'

export function Stepper({
  current,
  reached,
  onGo,
  disabled,
}: {
  current: SetupStep
  /** The furthest step the student has validated their way to. */
  reached: SetupStep
  onGo: (step: SetupStep) => void
  disabled?: boolean
}) {
  return (
    <nav aria-label="Setup steps">
      <ol className="ms-rm-setup-steps">
        {SETUP_STEPS.map(({ step, name }) => {
          const state = step === current ? 'current' : step < current ? 'done' : step <= reached ? 'reached' : 'ahead'
          const clickable = state !== 'current' && step <= reached && !disabled
          return (
            <li key={step} className={`ms-rm-setup-step is-${state}`} aria-current={step === current ? 'step' : undefined}>
              {clickable ? (
                <button type="button" className="ms-rm-setup-step__btn" onClick={() => onGo(step)}>
                  <span className="ms-rm-setup-step__num" aria-hidden>
                    {step}
                  </span>
                  <span className="ms-rm-setup-step__name">
                    <span className="sr-only">Step {step}: </span>
                    {name}
                  </span>
                </button>
              ) : (
                <span className="ms-rm-setup-step__btn">
                  <span className="ms-rm-setup-step__num" aria-hidden>
                    {step}
                  </span>
                  <span className="ms-rm-setup-step__name">
                    <span className="sr-only">Step {step}: </span>
                    {name}
                  </span>
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
