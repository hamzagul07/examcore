'use client'

import { ROADMAP_STATUS_LABEL, type RoadmapStatus } from '@/lib/plan/roadmap-types'

/**
 * The calm chip at the top of the roadmap. Three tones, none of them red:
 * on track is emerald-muted, adjusted is the warning tint (something
 * changed, nothing is wrong), reset is neutral. On 'reset' the chip is a
 * button — the one moment a full rebuild is offered — and the sheet it opens
 * belongs to the screen.
 */
export function StatusChip({ status, onReset }: { status: RoadmapStatus; onReset?: () => void }) {
  const label = ROADMAP_STATUS_LABEL[status]
  if (status === 'reset' && onReset) {
    return (
      <button type="button" className={`ms-rm-status ms-rm-status--${status} ms-rm-status--button`} onClick={onReset} aria-haspopup="dialog">
        {label}
        <span aria-hidden> ›</span>
      </button>
    )
  }
  return (
    <span className={`ms-rm-status ms-rm-status--${status}`} role="status">
      {label}
    </span>
  )
}
