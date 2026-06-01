'use client'

import Link from 'next/link'
import { getSubjectByCode } from '@/lib/profile-options'
import type { ConstellationNode } from '@/lib/dashboard/constellation'

type Props = {
  node: ConstellationNode
  onClose: () => void
}

export function ConstellationNodePopover({ node, onClose }: Props) {
  const subjectLabel = node.subjectCode
    ? getSubjectByCode(node.subjectCode)?.label ?? node.subjectCode
    : 'Unknown subject'

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40"
        aria-label="Close popover"
        onClick={onClose}
      />
      <div
        className="ec-card absolute z-50 w-56 p-4 shadow-lg"
        style={{
          left: node.x,
          top: node.y + 16,
          transform: 'translateX(-50%)',
        }}
      >
        <p className="truncate text-sm font-semibold text-[var(--ec-text-primary)]">
          {node.label || 'Question attempt'}
        </p>
        <p className="text-caption mt-1">{subjectLabel}</p>
        <p className="mt-2 font-mono text-sm font-bold text-[var(--ec-brand)]">
          {node.percentage}%
        </p>
        {node.attemptId && (
          <Link
            href={`/dashboard/attempt/${node.attemptId}`}
            className="mt-3 inline-block text-sm font-semibold text-[var(--ec-brand)]"
          >
            View attempt →
          </Link>
        )}
      </div>
    </>
  )
}
