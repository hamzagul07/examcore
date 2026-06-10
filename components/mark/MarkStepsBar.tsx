'use client'

type MarkStepsBarProps = {
  /** 0 = upload, 1 = marking, 2 = examiner's ink / results */
  stage: 0 | 1 | 2
}

const STEPS = ['Upload', 'Marking', "Examiner's Ink"] as const

export function MarkStepsBar({ stage }: MarkStepsBarProps) {
  return (
    <div className="ms-mark-steps-bar" aria-label="Marking progress">
      {STEPS.map((label, i) => (
        <span key={label} className="contents">
          {i > 0 ? <span className="ms-mstep-sep" aria-hidden="true" /> : null}
          <span
            className={[
              'ms-mstep',
              stage === i ? 'on' : '',
              stage > i ? 'done' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <span className="dot" aria-hidden="true">
              {stage > i ? '✓' : i + 1}
            </span>
            {label}
          </span>
        </span>
      ))}
    </div>
  )
}
