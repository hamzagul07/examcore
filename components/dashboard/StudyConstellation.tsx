'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import {
  buildConstellation,
  previewConstellationNodes,
  type ConstellationAttemptInput,
} from '@/lib/dashboard/constellation'
import { ConstellationNodePopover } from './ConstellationNodePopover'

type Props = {
  attempts: ConstellationAttemptInput[]
}

export function StudyConstellation({ attempts }: Props) {
  const reduce = useReducedMotion()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const isEmpty = attempts.length === 0

  const layout = useMemo(
    () => (isEmpty ? null : buildConstellation(attempts)),
    [attempts, isEmpty]
  )

  const previewNodes = previewConstellationNodes()
  const nodes = isEmpty ? previewNodes : layout!.nodes
  const edges = isEmpty ? [] : layout!.edges
  const hasTodayAttempt = layout?.hasTodayAttempt ?? false
  const width = isEmpty ? 200 : layout!.width
  const height = layout?.height ?? 120
  const todayX = isEmpty ? 176 : width - 24

  const selected = nodes.find((n) => n.id === selectedId) ?? null

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-title">Study constellation</h2>
          <p className="text-caption mt-1">
            {isEmpty
              ? 'Your study constellation grows as you mark questions.'
              : 'Last 30 days of marking — tap a node for details'}
          </p>
        </div>
      </div>

      <div className="ec-card overflow-x-auto p-4 sm:p-5">
        <div
          className="relative mx-auto min-w-full"
          style={{ width: Math.max(width, 280), height: height + 32 }}
        >
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="xMidYMid meet"
            aria-hidden={isEmpty}
          >
            {edges.map((e, i) => (
              <line
                key={i}
                x1={e.x1}
                y1={e.y1}
                x2={e.x2}
                y2={e.y2}
                stroke="var(--ec-text-secondary)"
                strokeOpacity={0.15}
                strokeWidth={1}
              />
            ))}
          </svg>

          <motion.div
            className="relative h-full"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {nodes.map((node, i) => (
              <motion.button
                key={node.id}
                type="button"
                disabled={isEmpty || !node.attemptId}
                initial={reduce ? false : { opacity: 0, scale: 0 }}
                animate={{ opacity: node.opacity, scale: 1 }}
                transition={{
                  delay: reduce ? 0 : i * 0.05,
                  duration: 0.25,
                }}
                onClick={() => {
                  if (!isEmpty && node.attemptId) setSelectedId(node.id)
                }}
                className={`absolute rounded-full border-0 p-0 ${
                  node.isToday && !reduce ? 'animate-[ec-breathe_3s_ease-in-out_infinite]' : ''
                } ${isEmpty ? 'pointer-events-none' : 'cursor-pointer'}`}
                style={{
                  left: node.x,
                  top: node.y,
                  width: node.size,
                  height: node.size,
                  transform: 'translate(-50%, -50%)',
                  backgroundColor: node.color,
                  boxShadow: `0 0 ${node.isToday ? 12 : 6}px color-mix(in srgb, ${node.color} 50%, transparent)`,
                }}
                aria-label={
                  isEmpty
                    ? undefined
                    : `${node.label}, ${node.percentage} percent`
                }
              />
            ))}

            {!isEmpty && !hasTodayAttempt && (
              <div
                className="absolute flex flex-col items-center"
                style={{
                  left: todayX,
                  top: height / 2,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <span
                  className="block h-3 w-3 rounded-full border-2 border-dashed border-[var(--ec-text-secondary)] opacity-40"
                  aria-hidden
                />
                <p className="text-caption mt-2 max-w-[140px] text-center text-xs opacity-70">
                  Mark a question to add today
                </p>
              </div>
            )}

            {selected && (
              <ConstellationNodePopover
                node={selected}
                onClose={() => setSelectedId(null)}
              />
            )}
          </motion.div>
        </div>

        {isEmpty && (
          <div className="mt-4 text-center">
            <p className="text-caption mb-3 opacity-70">Start now to build yours.</p>
            <Link href="/mark" className="ec-btn-primary inline-flex text-sm">
              Mark your first question
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}
