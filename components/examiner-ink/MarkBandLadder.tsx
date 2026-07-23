'use client'

import { motion } from 'framer-motion'
import { ArrowUp } from 'lucide-react'
import type { BandGap, BandRung } from '@/lib/marking/mark-gap'

/**
 * The Mark Gap, for level-of-response marking. There are no ticks to place on
 * an essay — so the gap is the band directly above the one achieved. Renders the
 * rubric as a ladder with the achieved rung lit and the next rung up drawn as
 * the dashed target, plus the single move that reaches it.
 */
export function MarkBandLadder({ gap, label }: { gap: BandGap; label?: string }) {
  const rungs = gap.ladder.length > 0 ? gap.ladder : fallbackRungs(gap)
  const atTop = gap.next === null && gap.ladder.length > 0

  return (
    <section className="ec-card flex flex-col gap-4 p-5" aria-label="The next band">
      <div className="flex items-baseline justify-between gap-3">
        <p className="ec-label-tech flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--ec-chip-warning-text)]" />
          {label ?? 'THE NEXT BAND'}
        </p>
        <span className="font-mono text-xs text-[var(--ec-text-secondary)]">
          Level {gap.level} · {gap.marksAwarded}/{gap.marksAvailable}
        </span>
      </div>

      <p className="text-lg font-semibold leading-tight text-[var(--ec-text-primary)]">
        {atTop ? (
          <>Top band reached.</>
        ) : (
          <>
            You&rsquo;re in Level {gap.level}.{' '}
            <span className="text-[var(--ec-chip-warning-text)]">
              Level {gap.level + 1} is one move up.
            </span>
          </>
        )}
      </p>

      {/* rungs are highest-level first, so a plain column puts the top band up
          top — "one move up" points to the rung physically above. */}
      <div className="flex flex-col gap-2">
        {rungs.map((rung) => (
          <Rung key={rung.level} rung={rung} />
        ))}
      </div>

      {!atTop && gap.liftHint && (
        <div
          className="flex items-start gap-2.5 rounded-xl border border-dashed px-3.5 py-3"
          style={{
            borderColor: 'var(--ec-chip-warning-text)',
            background: 'var(--ec-chip-warning-bg)',
          }}
        >
          <ArrowUp
            className="mt-0.5 h-4 w-4 flex-none"
            style={{ color: 'var(--ec-chip-warning-text)' }}
            aria-hidden="true"
          />
          <p className="text-sm text-[var(--ec-text-primary)]">
            <span className="font-semibold text-[var(--ec-chip-warning-text)]">
              To lift the band:{' '}
            </span>
            {gap.liftHint}
          </p>
        </div>
      )}
    </section>
  )
}

function Rung({ rung }: { rung: BandRung }) {
  const tone =
    rung.state === 'current'
      ? {
          border: 'color-mix(in srgb, var(--ec-chip-success-text) 42%, transparent)',
          bg: 'var(--ec-chip-success-bg)',
          chipBg: 'var(--ec-chip-success-text)',
          text: 'var(--ec-text-primary)',
          dashed: false,
        }
      : rung.state === 'next'
        ? {
            border: 'var(--ec-chip-warning-text)',
            bg: 'var(--ec-chip-warning-bg)',
            chipBg: 'var(--ec-chip-warning-text)',
            text: 'var(--ec-text-primary)',
            dashed: true,
          }
        : {
            border: 'var(--ec-border)',
            bg: 'transparent',
            chipBg: 'var(--ec-surface)',
            text: 'var(--ec-text-secondary)',
            dashed: false,
          }
  const faint = rung.state === 'above'

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: faint ? 0.55 : 1, x: 0 }}
      className="flex items-center gap-3 rounded-lg px-3 py-2.5"
      style={{
        border: `${tone.dashed ? '1.5px dashed' : '1px solid'} ${tone.border}`,
        background: tone.bg,
      }}
    >
      <span
        className="flex-none rounded-md px-2 py-0.5 font-mono text-[11px] font-bold"
        style={{
          background: tone.chipBg,
          color:
            rung.state === 'current' || rung.state === 'next'
              ? 'var(--ec-surface)'
              : 'var(--ec-text-secondary)',
        }}
      >
        L{rung.level}
      </span>
      <span className="text-sm leading-snug" style={{ color: tone.text }}>
        {rung.descriptor}
        {rung.state === 'current' && (
          <span className="ml-1.5 font-mono text-[11px] text-[var(--ec-chip-success-text)]">
            ← you are here
          </span>
        )}
      </span>
    </motion.div>
  )
}

/** No rubric on the attempt: a minimal two-rung ladder, next band on top. */
function fallbackRungs(gap: BandGap): BandRung[] {
  return [
    {
      level: gap.level + 1,
      descriptor: gap.liftHint ?? 'The next band up',
      marksMax: gap.marksAvailable,
      state: 'next',
    },
    {
      level: gap.level,
      descriptor: `Level ${gap.level} · ${gap.marksAwarded}/${gap.marksAvailable} marks`,
      marksMax: gap.marksAvailable,
      state: 'current',
    },
  ]
}
