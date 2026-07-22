'use client'

import { useEffect, useRef, useState } from 'react'
import { ExaminerInkOverlay } from '@/components/examiner-ink/ExaminerInkOverlay'
import { DEMO_INK, DEMO_SCRIPT_IMAGE } from '@/lib/marking/demo-ink'

/**
 * Red pen on real handwriting — the thing students don't believe until they see.
 *
 * Every other visual here reports a number. This one shows the product doing
 * the thing that sounds impossible: reading a handwritten page and stamping the
 * exact line that earned or lost each mark, the way a marked script actually
 * comes back. It was previously reachable only *after* a real 100-second mark,
 * so nobody deciding whether to try it ever saw it.
 *
 * The ink draws itself in sequence, and it starts when the section scrolls into
 * view rather than on mount — arriving mid-page to find the animation already
 * finished is the one way to waste it.
 */
export function MarkedScriptShowcase({
  heading = 'It marks your actual handwriting',
  lead = 'Not a transcription. Photograph the page and the marks land on the lines that earned them — stamps in the margin, and a note where one got away.',
}: {
  heading?: string
  lead?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // No IntersectionObserver (or reduced motion): show the finished state.
    if (
      typeof IntersectionObserver === 'undefined' ||
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) {
      setInView(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true)
          io.disconnect()
        }
      },
      { rootMargin: '-15% 0px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <section
      ref={ref}
      className="ms-script-showcase"
      aria-labelledby="marked-script-h"
    >
      <div className="ms-script-showcase__copy">
        <p className="ms-overline">Examiner&apos;s ink</p>
        <h2 id="marked-script-h" className="ms-script-showcase__title">
          {heading}
        </h2>
        <p className="ms-script-showcase__lead">{lead}</p>
        <ul className="ms-script-showcase__points">
          <li>
            <strong>Stamps on the line</strong> — M1, A1, and the code examiners
            actually write when a mark is lost.
          </li>
            <li>
            <strong>A note where it went wrong</strong> — in the margin, pointing
            at the working it refers to.
          </li>
          <li>
            <strong>Photos, scans or PDFs</strong> — multi-page scripts included.
          </li>
        </ul>
      </div>

      <div className="ms-script-showcase__script">
        {/* Fixed aspect box: the overlay positions marks as percentages of the
            image, so the frame must not reflow after the ink has been placed. */}
        <div className="ms-script-showcase__frame">
          <ExaminerInkOverlay
            imageUrl={DEMO_SCRIPT_IMAGE}
            lineReferences={DEMO_INK}
            animate={inView}
          />
        </div>
      </div>
    </section>
  )
}
