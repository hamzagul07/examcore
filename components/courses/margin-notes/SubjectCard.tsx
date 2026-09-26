'use client'

import Link from 'next/link'
import type { MarginNotesSubject } from '@/lib/courses/margin-notes/types'
import type { SubjectCardLevel } from '@/lib/courses/ib-catalog-display'
import { accentCssVar } from '@/lib/courses/margin-notes/subject-meta'
import { Ring } from '@/components/courses/margin-notes/Ring'

/**
 * Premium subject card — accent-gradient header with an oversized faded glyph
 * watermark, stat row and CTA. Shared by the /courses catalog and the /subjects
 * directory so both read as one polished, ZNotes-beating grid.
 *
 * With two or more `levels` (IB HL · SL) the card is one subject with a level
 * chooser in the foot. Anchors cannot nest, so that variant is an <article>
 * whose name link is stretched over the card while the segments sit above it.
 */
export function SubjectCard({
  s,
  href = `/courses/${s.code}`,
  codeLabel = s.code,
  boardLabel = 'CAIE',
  accentHex,
  statSuffix = 'past-paper questions',
  isNew,
  levels,
}: {
  s: MarginNotesSubject
  href?: string
  /** What the tab prints — never a slug (IB `code` is one). */
  codeLabel?: string
  boardLabel?: string
  /** Override card accent (IB catalog hex from subject guide). */
  accentHex?: string
  statSuffix?: string
  isNew?: boolean
  /** Level segments for a merged HL · SL card; a single entry renders no chooser. */
  levels?: SubjectCardLevel[]
}) {
  const started = s.prog > 0
  const levelList = levels ?? []
  const multi = levelList.length > 1
  const style = { '--acc': accentHex ?? accentCssVar(s.acc) } as React.CSSProperties
  const screenLabel = `Subject — ${s.name} card`

  const inner = (
    <>
      <div className="scard-top">
        <span className="scard-watermark" aria-hidden>
          {s.glyph}
        </span>
        <span className="scard-glyph">{s.glyph}</span>
        <span className="scard-tab" title={codeLabel}>
          {codeLabel}
        </span>
        <span className="scard-side">
          {isNew ? <span className="scard-new">New</span> : null}
          {started ? (
            <Ring pct={s.prog} size={40} stroke={3.5} color="#ffffff" />
          ) : (
            <span className="scard-count">
              <b>{s.lessons}</b>
              lessons
            </span>
          )}
        </span>
      </div>
      <div className="scard-body">
        <h3 className="scard-name">
          {multi ? (
            <Link className="scard-name-link" href={href}>
              {s.name}
            </Link>
          ) : (
            s.name
          )}
        </h3>
        <p className="scard-meta">
          {s.level} · {boardLabel} · {s.units} units
        </p>
        <p className="scard-stat">
          {s.lessons} lessons · {s.q} {statSuffix}
        </p>
        {/* Phone rows collapse meta + stat into one line: level · lessons. The CSS
            shows exactly one of the two at any width, so neither is aria-hidden. */}
        <p className="scard-row-meta">
          {s.level} · {s.lessons} lessons
        </p>
      </div>
      <div className="scard-foot">
        {multi ? (
          <span className="scard-levels" role="group" aria-label={`${s.name} levels`}>
            {levelList.map((l) => (
              <Link
                key={l.href}
                className={`scard-lvl${l.href === href ? ' on' : ''}`}
                href={l.href}
                aria-label={`${s.name} ${l.label}${l.lessons != null ? `, ${l.lessons} lessons` : ''}`}
              >
                {l.label}
                {l.lessons != null ? <small>{l.lessons}</small> : null}
              </Link>
            ))}
          </span>
        ) : null}
        <span className="scard-rule" />
        <span className="scard-go">{started ? `${s.prog}% covered` : 'Start free'} →</span>
      </div>
    </>
  )

  if (multi) {
    return (
      <article className="scard scard-multi" style={style} data-screen-label={screenLabel}>
        {inner}
      </article>
    )
  }
  return (
    <Link className="scard" style={style} href={href} data-screen-label={screenLabel}>
      {inner}
    </Link>
  )
}
