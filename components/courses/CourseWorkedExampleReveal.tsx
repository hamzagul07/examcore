'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ChevronRight, Eye } from 'lucide-react'
import { CourseRichText } from '@/components/courses/CourseRichText'
import { CourseCallout } from '@/components/courses/CourseCallout'
import type { WorkedExampleDiagram } from '@/lib/courses/types'
import { parseMcqOptions, stripImgTags } from '@/lib/courses/worked-example-text'

function splitSolutionSteps(solution: string): string[] {
  const markdownChunks = solution
    .split(/\n(?=\*\*(?:Step|\([a-z]\)|\*\*[A-Z]))/i)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
  if (markdownChunks.length > 1) return markdownChunks

  const lines = solution.split('\n').map((l) => l.trim()).filter(Boolean)
  const steps: string[] = []
  let buf = ''

  for (const line of lines) {
    if (/^\d+\.\s/.test(line) && buf) {
      steps.push(buf.trim())
      buf = line
    } else {
      buf = buf ? `${buf}\n${line}` : line
    }
  }
  if (buf.trim()) steps.push(buf.trim())
  return steps.length ? steps : [solution]
}

export function CourseWorkedExampleReveal({
  question,
  solution,
  index,
  diagrams,
  isMcqPaper,
}: {
  question: string
  solution: string
  index?: number
  diagrams?: WorkedExampleDiagram[]
  isMcqPaper?: boolean
}) {
  const steps = splitSolutionSteps(solution)
  const [revealed, setRevealed] = useState(0)
  const [revealing, setRevealing] = useState(false)
  const [justRevealed, setJustRevealed] = useState<number | null>(null)

  const revealNext = () => {
    if (revealing || revealed >= steps.length) return
    setRevealing(true)
    const next = revealed + 1
    setRevealed(next)
    setJustRevealed(next)
    window.setTimeout(() => setJustRevealed(null), 450)
    window.setTimeout(() => setRevealing(false), 360)
  }

  const cleaned = stripImgTags(question)
  const { stem, options } = isMcqPaper ? parseMcqOptions(cleaned) : { stem: cleaned, options: [] }

  return (
    <CourseCallout variant="worked" title={index ? `Worked example ${index}` : 'Worked example'}>
      <div className="course-worked-reveal-question">
        <CourseRichText content={stem} variant="prose" />
        {options.length ? (
          <ul className="course-worked-mcq-options mt-4 space-y-2 pl-0 list-none">
            {options.map((opt) => (
              <li
                key={opt.letter}
                className="course-worked-mcq-option rounded-lg border border-[var(--ec-border-subtle)] bg-[var(--ec-surface-muted)] px-3 py-2 text-sm"
              >
                <span className="mr-2 font-semibold text-[var(--ec-text-primary)]">
                  {opt.letter}.
                </span>
                <CourseRichText content={opt.text} variant="inline" />
              </li>
            ))}
          </ul>
        ) : null}
        {diagrams?.length ? (
          <div className="course-worked-diagrams mt-4 space-y-3">
            {diagrams.map((d) => (
              <figure key={d.id} className="overflow-hidden rounded-xl border border-[var(--ec-border-subtle)]">
                <Image
                  src={d.src}
                  alt={d.alt}
                  width={640}
                  height={400}
                  className="h-auto w-full max-w-lg"
                  unoptimized
                />
                {d.alt ? (
                  <figcaption className="px-3 py-2 text-xs text-[var(--ec-text-tertiary)]">
                    {d.alt}
                  </figcaption>
                ) : null}
              </figure>
            ))}
          </div>
        ) : null}
      </div>
      <ol className="course-worked-reveal-steps">
        {steps.map((step, i) => {
          const visible = i < revealed
          return (
            <li
              key={i}
              className={`course-worked-reveal-step${visible ? ' is-visible' : ' is-hidden'}${justRevealed === i + 1 ? ' course-worked-reveal-step--enter' : ''}`}
            >
              <CourseRichText content={step} variant="prose" />
            </li>
          )
        })}
      </ol>
      {revealed < steps.length ? (
        <button
          type="button"
          className="course-worked-reveal-btn"
          aria-busy={revealing || undefined}
          disabled={revealing}
          onClick={revealNext}
        >
          <Eye className="h-4 w-4" aria-hidden />
          Reveal step {revealed + 1} of {steps.length}
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      ) : (
        <p className="course-worked-reveal-done">
          All steps revealed — try a similar question on Past papers.
        </p>
      )}
    </CourseCallout>
  )
}
