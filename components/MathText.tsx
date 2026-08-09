'use client'

import { Fragment } from 'react'
import { BlockMath, InlineMath } from 'react-katex'
import { normalizeQuestionText } from '@/lib/rich-text/normalize-question-text'
import { sanitizeLatexFragment } from '@/lib/rich-text/sanitize-latex'

const MATH_REGEX = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g

type Segment =
  | { kind: 'text'; content: string }
  | { kind: 'inline'; content: string; raw: string }
  | { kind: 'block'; content: string; raw: string }

function parse(text: string): Segment[] {
  const segments: Segment[] = []
  if (!text) return segments

  const prepared = normalizeQuestionText(text)

  let lastIndex = 0
  MATH_REGEX.lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = MATH_REGEX.exec(prepared)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ kind: 'text', content: prepared.slice(lastIndex, match.index) })
    }
    if (match[1] !== undefined) {
      segments.push({ kind: 'block', content: match[1].trim(), raw: match[0] })
    } else if (match[2] !== undefined) {
      segments.push({ kind: 'inline', content: match[2].trim(), raw: match[0] })
    }
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < prepared.length) {
    segments.push({ kind: 'text', content: prepared.slice(lastIndex) })
  }

  return segments
}

export function MathText({
  text,
  className = '',
}: {
  text: string
  className?: string
}) {
  if (!text) return null

  const segments = parse(text)

  return (
    <span className={`ec-break-anywhere ${className}`.trim()}>
      {segments.map((seg, i) => {
        if (seg.kind === 'text') {
          return <Fragment key={i}>{seg.content}</Fragment>
        }
        if (seg.kind === 'inline') {
          return (
            <InlineMath
              key={i}
              math={sanitizeLatexFragment(seg.content)}
              renderError={() => <span>{seg.raw}</span>}
            />
          )
        }
        return (
          <BlockMath
            key={i}
            math={sanitizeLatexFragment(seg.content)}
            renderError={() => <span>{seg.raw}</span>}
          />
        )
      })}
    </span>
  )
}
