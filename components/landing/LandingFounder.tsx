'use client'

import { LandingSectionReveal } from './LandingSectionReveal'

export function LandingFounder() {
  return (
    <LandingSectionReveal>
      <div className="ec-card relative overflow-hidden p-8 sm:p-12">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-500/10 blur-[80px]" />
        <p className="ec-label-tech ec-label-tech-violet mb-4">WHY THIS EXISTS</p>
        <h2 className="landing-h2 mb-6">
          <span className="gradient-text">Built by a student,</span>
          <br />
          <span className="ec-text-gradient">for students.</span>
        </h2>
        <div className="landing-lead max-w-2xl space-y-4">
          <p>
            Examcore was built by Hassan, an A-Level student who got tired of
            waiting weeks for marked papers and guessing what examiners actually
            wanted.
          </p>
          <p>
            So I built the tool I wished existed — one that marks your work the
            way Cambridge does, with the same scheme, the same standards. Not a
            replacement for your teacher. Just faster, honest feedback when
            you&apos;re revising alone at midnight.
          </p>
        </div>
      </div>
    </LandingSectionReveal>
  )
}
