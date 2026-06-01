'use client'

import { LandingSectionReveal } from './LandingSectionReveal'
import { X, Check } from 'lucide-react'

const ROWS = [
  {
    without: 'Wait weeks for marked papers',
    with: 'Mark a question in about a minute',
  },
  {
    without: 'Guess what the examiner wanted',
    with: 'See the exact scheme they used',
  },
  {
    without: 'Mark yourself with the scheme alone',
    with: 'Get feedback like an examiner wrote it',
  },
  {
    without: 'No idea which topics are weak',
    with: 'Live mastery map down to spec points',
  },
] as const

export function LandingComparison() {
  return (
    <LandingSectionReveal>
      <div className="mb-10 text-center sm:mb-12">
        <p className="ec-label-tech mb-4 justify-center">
          THE OLD WAY VS THIS
        </p>
        <h2 className="landing-h2">
          <span className="gradient-text">Revision without the wait.</span>
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="ec-card p-6 sm:p-8">
          <p className="mb-6 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ec-text-secondary)]">
            Without Examcore
          </p>
          <ul className="space-y-4">
            {ROWS.map((row) => (
              <li
                key={row.without}
                className="flex gap-3 text-base leading-relaxed text-[var(--ec-text-secondary)]"
              >
                <X
                  className="mt-0.5 h-5 w-5 shrink-0 text-[var(--ec-chip-critical-text)]"
                  strokeWidth={2}
                />
                <span>{row.without}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="ec-card ec-card-interactive border-[color-mix(in_srgb,var(--ec-brand)_20%,transparent)] p-6 sm:p-8">
          <p className="mb-6 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ec-chip-success-text)]">
            With Examcore
          </p>
          <ul className="space-y-4">
            {ROWS.map((row) => (
              <li
                key={row.with}
                className="flex gap-3 text-base leading-relaxed text-[var(--ec-text-primary)]"
              >
                <Check
                  className="mt-0.5 h-5 w-5 shrink-0 text-[var(--ec-chip-success-text)]"
                  strokeWidth={2}
                />
                <span>{row.with}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </LandingSectionReveal>
  )
}
