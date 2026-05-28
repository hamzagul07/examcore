'use client'

import 'katex/dist/katex.min.css'
import { Fragment } from 'react'
import { BlockMath, InlineMath } from 'react-katex'

// $$...$$ for block math, $...$ for inline. Block matches first (longer), then inline.
const MATH_REGEX = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g

// Sentinel used to stash already-wrapped math while autoWrap runs on the rest.
// NUL byte is never legitimately present in marking text.
const STASH = '\x00MP'

/**
 * Best-effort: wrap obvious math patterns in $...$ when the model forgot to.
 * Examples handled:
 *   x^2          → $x^2$
 *   (1-4x)^6     → $(1-4x)^6$
 *   x^{n+1}      → $x^{n+1}$
 *   x_1          → $x_1$
 *   \frac{a}{b}  → $\frac{a}{b}$
 * Existing $...$ regions are protected and never re-wrapped.
 */
function autoWrapMath(text: string): string {
  const stashed: string[] = []
  const stash = (s: string) => {
    stashed.push(s)
    return `${STASH}${stashed.length - 1}\x00`
  }

  // 1) Protect existing math zones.
  let working = text.replace(
    /\$\$[\s\S]+?\$\$|\$[^$\n]+?\$/g,
    (m) => stash(m)
  )

  // 2) \frac{...}{...} (one level deep, no nested braces).
  working = working.replace(
    /\\frac\{[^{}]+\}\{[^{}]+\}/g,
    (m) => stash(`$${m}$`)
  )

  // Helper: if exponent / subscript is plain digits or letters >1 char, brace it.
  const braceIfMulti = (exp: string) => {
    if (exp.startsWith('{')) return exp
    return exp.length > 1 ? `{${exp}}` : exp
  }

  // 3) (...)^N pattern — parenthesised base, simple exponent.
  working = working.replace(
    /\(([^()\n]+)\)\^(\{[^}]+\}|[A-Za-z0-9]+)/g,
    (_full, base, exp) => stash(`$(${base})^${braceIfMulti(exp)}$`)
  )

  // 4) letter^N — single base char not in the middle of a word or after backslash.
  //    Negative lookbehind keeps us out of identifiers (e.g. "tan^2") and LaTeX
  //    commands (e.g. "\sum^").
  working = working.replace(
    /(?<![A-Za-z\\])([A-Za-z])\^(\{[^}]+\}|[A-Za-z0-9]+)/g,
    (_full, base, exp) => stash(`$${base}^${braceIfMulti(exp)}$`)
  )

  // 5) letter_N — subscript on a single base char.
  working = working.replace(
    /(?<![A-Za-z\\])([A-Za-z])_(\{[^}]+\}|[A-Za-z0-9]+)/g,
    (_full, base, sub) => stash(`$${base}_${braceIfMulti(sub)}$`)
  )

  // 6) Restore stashed regions.
  working = working.replace(
    new RegExp(`${STASH}(\\d+)\\x00`, 'g'),
    (_full, i) => stashed[parseInt(i, 10)]
  )

  return working
}

type Segment =
  | { kind: 'text'; content: string }
  | { kind: 'inline'; content: string; raw: string }
  | { kind: 'block'; content: string; raw: string }

function parse(text: string): Segment[] {
  const segments: Segment[] = []
  if (!text) return segments

  const wrapped = autoWrapMath(text)

  let lastIndex = 0
  MATH_REGEX.lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = MATH_REGEX.exec(wrapped)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ kind: 'text', content: wrapped.slice(lastIndex, match.index) })
    }
    if (match[1] !== undefined) {
      segments.push({ kind: 'block', content: match[1].trim(), raw: match[0] })
    } else if (match[2] !== undefined) {
      segments.push({ kind: 'inline', content: match[2].trim(), raw: match[0] })
    }
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < wrapped.length) {
    segments.push({ kind: 'text', content: wrapped.slice(lastIndex) })
  }

  return segments
}

export function MathText({ text }: { text: string }) {
  if (!text) return null

  const segments = parse(text)

  return (
    <>
      {segments.map((seg, i) => {
        if (seg.kind === 'text') {
          return <Fragment key={i}>{seg.content}</Fragment>
        }
        if (seg.kind === 'inline') {
          return (
            <InlineMath
              key={i}
              math={seg.content}
              renderError={() => <span>{seg.raw}</span>}
            />
          )
        }
        return (
          <BlockMath
            key={i}
            math={seg.content}
            renderError={() => <span>{seg.raw}</span>}
          />
        )
      })}
    </>
  )
}
