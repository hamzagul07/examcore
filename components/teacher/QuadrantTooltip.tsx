'use client'

import { useMemo, useState, type MouseEvent, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'

/** Everything the detail card shows for one dot, already formatted on the server. */
export type QuadrantTooltipPoint = {
  id: string
  href: string
  name: string
  stamp: string
  zone: string
  accuracy: string
  pace: string
  scripts: string
  grade: string | null
  deficit: string | null
}

function pointIdFrom(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) return null
  return target.closest('[data-risk-id]')?.getAttribute('data-risk-id') ?? null
}

/**
 * The grade risk matrix's detail card, and the only client code the matrix
 * needs (GradeRiskMatrix is a server component: the layout, the SVG and the
 * links are all rendered there).
 *
 * It wraps the plot and listens, by delegation, for a dot being hovered or
 * focused (`data-risk-id` on each dot's link), then shows that student's
 * card in the corner. The card repeats what the focused link's accessible
 * name already says, so it is hidden from assistive tech and never takes
 * pointer events (it must not cover the dots beneath it).
 *
 * Dots are real links, so they work without JavaScript; with it, a plain
 * click is routed client-side (modifier clicks keep the browser's
 * behaviour: new tab, new window).
 */
export function QuadrantTooltip({ points, children }: { points: readonly QuadrantTooltipPoint[]; children: ReactNode }) {
  const router = useRouter()
  const byId = useMemo(() => new Map(points.map((p) => [p.id, p])), [points])
  const [activeId, setActiveId] = useState<string | null>(null)
  const active = activeId ? byId.get(activeId) : undefined

  function onClick(event: MouseEvent<HTMLDivElement>) {
    if (event.defaultPrevented || event.button !== 0) return
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    const id = pointIdFrom(event.target)
    const point = id ? byId.get(id) : undefined
    if (!point) return
    event.preventDefault()
    router.push(point.href)
  }

  return (
    <div
      className="relative"
      onPointerOver={(e) => setActiveId(pointIdFrom(e.target))}
      onPointerLeave={() => setActiveId(null)}
      onFocus={(e) => setActiveId(pointIdFrom(e.target))}
      onBlur={() => setActiveId(null)}
      onClick={onClick}
    >
      {children}
      {active ? (
        <div
          className="pointer-events-none absolute right-2 top-2 z-10 w-[min(15rem,calc(100%-1rem))] rounded-[4px] border-[1.5px] border-[var(--ec-border)] bg-[var(--ec-paper)] p-3 shadow-[var(--ec-shadow-hard)]"
          aria-hidden
        >
          <div className="mb-1 flex items-start justify-between gap-2">
            <p className="m-0 min-w-0 font-semibold text-[var(--ec-text-primary)] [overflow-wrap:anywhere]">
              {active.name}
            </p>
            <span className="shrink-0 font-mono text-[10px] font-bold tracking-[0.06em] text-[var(--ec-text-secondary)]">
              {active.stamp}
            </span>
          </div>
          <p className="m-0 text-xs text-[var(--ec-text-secondary)]">{active.zone}</p>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
            <dt className="text-[var(--ec-text-secondary)]">Accuracy</dt>
            <dd className="m-0 text-right font-semibold tabular-nums text-[var(--ec-text-primary)]">{active.accuracy}</dd>
            <dt className="text-[var(--ec-text-secondary)]">Pace</dt>
            <dd className="m-0 text-right tabular-nums text-[var(--ec-text-primary)]">{active.pace}</dd>
            <dt className="text-[var(--ec-text-secondary)]">Evidence</dt>
            <dd className="m-0 text-right tabular-nums text-[var(--ec-text-primary)]">{active.scripts}</dd>
            {active.grade ? (
              <>
                <dt className="text-[var(--ec-text-secondary)]">Predicted</dt>
                <dd className="m-0 text-right font-semibold text-[var(--ec-text-primary)]">{active.grade}</dd>
              </>
            ) : null}
          </dl>
          {active.deficit ? (
            <p className="m-0 mt-2 border-t border-[var(--ec-border)] pt-2 text-xs text-[var(--ec-text-primary)]">
              <span className="text-[var(--ec-text-secondary)]">Weakest: </span>
              {active.deficit}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
