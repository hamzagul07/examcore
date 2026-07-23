'use client'

import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import type { MarkGap, MarkGapItem } from '@/lib/marking/mark-gap'

/**
 * The Mark Gap panel: turns a score into the specific marks the student lost
 * and — when the premium rewrite is present — exactly what would have earned
 * each one. Pairs with the examiner ink overlay: the overlay shows what landed
 * on the page, this shows what was missing from it.
 */
export function MarkGapPanel({
  gap,
  onSelectMark,
  activeMarkId = null,
}: {
  gap: MarkGap
  /** Highlight the matching mark on the script when a card is focused. */
  onSelectMark?: (markId: string) => void
  activeMarkId?: string | null
}) {
  if (gap.items.length === 0) return null

  const lostCount = gap.total - gap.earned
  const allFixable = gap.items.every((i) => i.fix)

  return (
    <section className="ec-card flex flex-col gap-4 p-5" aria-label="The mark gap">
      <p className="ec-label-tech flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--ec-chip-warning-text)]" />
        THE MARK GAP
      </p>

      <div className="flex items-center gap-4">
        <ScoreRing earned={gap.earned} total={gap.total} />
        <div>
          <p className="text-lg font-semibold leading-tight text-[var(--ec-text-primary)]">
            {lostCount === 1 ? '1 mark' : `${lostCount} marks`}
            {allFixable ? (
              <>
                {' '}
                <span className="text-[var(--ec-chip-warning-text)]">
                  {lostCount === 1 ? 'one line away' : 'each one line away'}
                </span>
              </>
            ) : (
              ' left on the table'
            )}
          </p>
          <p className="mt-0.5 text-sm text-[var(--ec-text-secondary)]">
            {allFixable
              ? "You knew these — you just didn't write them down."
              : "Here's exactly where each mark went."}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {gap.items.map((item, i) => (
          <GapCard
            key={`${item.markId}-${i}`}
            item={item}
            active={
              !!activeMarkId &&
              item.type.toUpperCase() === activeMarkId.toUpperCase()
            }
            onSelect={onSelectMark ? () => onSelectMark(item.type) : undefined}
          />
        ))}
      </div>

      {allFixable && (
        <p className="rounded-xl border border-[var(--ec-brand-border)] bg-[var(--ec-brand-muted)] px-4 py-3 text-sm text-[var(--ec-text-primary)]">
          Fix {lostCount === 1 ? 'this' : 'all of these'} and this becomes{' '}
          <span className="font-semibold text-[var(--ec-brand)]">
            {gap.total} / {gap.total}
          </span>
          .
        </p>
      )}
    </section>
  )
}

function GapCard({
  item,
  active,
  onSelect,
}: {
  item: MarkGapItem
  active: boolean
  onSelect?: () => void
}) {
  const interactive = !!onSelect
  return (
    <motion.article
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col gap-2.5 rounded-xl border bg-[var(--ec-surface-raised)] p-4 transition-shadow ${
        active
          ? 'border-[var(--ec-chip-warning-text)] shadow-[var(--ec-shadow-elevation-2)]'
          : 'border-[var(--ec-border)]'
      } ${interactive ? 'cursor-pointer' : ''}`}
      style={{ borderLeftWidth: 3, borderLeftColor: 'var(--ec-chip-warning-text)' }}
      onClick={onSelect}
      onKeyDown={
        onSelect
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelect()
              }
            }
          : undefined
      }
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? `Highlight ${item.type} on your script` : undefined}
    >
      <div className="flex items-center gap-2">
        <span
          className="rounded-md border px-2 py-0.5 font-mono text-xs font-bold"
          style={{
            color: 'var(--ec-chip-critical-text)',
            borderColor: 'var(--ec-chip-critical-text)',
            background: 'var(--ec-chip-critical-bg)',
          }}
        >
          {item.type}
        </span>
        <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--ec-text-secondary)]">
          not awarded
        </span>
      </div>

      <p className="text-sm text-[var(--ec-text-primary)]">{item.reasoning}</p>

      {item.fix && (
        <div
          className="flex items-center gap-2.5 rounded-lg border border-dashed px-3 py-2"
          style={{
            borderColor: 'var(--ec-chip-warning-text)',
            background: 'var(--ec-chip-warning-bg)',
          }}
        >
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--ec-chip-warning-text)]">
            Add
          </span>
          <span className="flex-1 text-sm text-[var(--ec-text-primary)]">
            {item.fix}
          </span>
          <span className="whitespace-nowrap font-mono text-xs font-bold text-[var(--ec-chip-success-text)]">
            {item.earns ?? `+1 ${item.type}`}
          </span>
        </div>
      )}

      {interactive && (
        <span className="flex items-center gap-1 text-xs text-[var(--ec-text-secondary)]">
          <ArrowRight className="h-3 w-3" aria-hidden="true" />
          Show on my script
        </span>
      )}
    </motion.article>
  )
}

function ScoreRing({ earned, total }: { earned: number; total: number }) {
  const r = 26
  const circ = 2 * Math.PI * r
  const frac = total > 0 ? earned / total : 0
  return (
    <div className="relative h-16 w-16 flex-none">
      <svg width="64" height="64" viewBox="0 0 64 64" style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke="var(--ec-chip-warning-text)"
          strokeWidth="7"
          opacity="0.45"
        />
        <motion.circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke="var(--ec-brand)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ * (1 - frac) }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </svg>
      <span
        className="absolute inset-0 grid place-items-center font-mono text-base font-bold text-[var(--ec-text-primary)]"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {earned}/{total}
      </span>
    </div>
  )
}
