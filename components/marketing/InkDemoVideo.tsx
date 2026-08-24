'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * The 38-second "ink lands" demo film (16:9 master, rendered from
 * promo-video/ in the repo's sibling directory — see its SCRIPT.md).
 *
 * It complements InteractiveMarkDemo rather than replacing it: the interactive
 * demo is the artefact you can poke, the film is the journey — snap, upload,
 * the wait, the stamps, the withheld mark and its reason.
 *
 * Mount pattern copied from InteractiveMarkDemoLazy: nothing but a poster
 * until the section nears the viewport. The landing page's animation budget is
 * already the tightest thing about it, and a muted `<video autoplay>` in the
 * DOM starts downloading immediately — so the element only exists once the
 * viewer is close. The file is 2.3 MB from the CDN; the poster is 55 KB.
 */
export function InkDemoVideo({ className = '' }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [near, setNear] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setNear(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true)
          io.disconnect()
        }
      },
      { rootMargin: '400px 0px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div ref={ref} className={className}>
      {near ? (
        <video
          muted
          autoPlay
          loop
          playsInline
          preload="metadata"
          poster="/promo/ink-demo-poster.jpeg"
          aria-label="Demo: a handwritten answer is photographed, uploaded, and marked — examiner stamps land line by line, and the one lost mark is explained"
          className="w-full rounded border-[1.5px] border-[var(--ec-border)] shadow-[var(--ec-shadow-hard,6px_6px_0_rgba(37,34,27,0.1))]"
        >
          <source src="/promo/ink-demo-16x9.mp4" type="video/mp4" />
        </video>
      ) : (
        // Same box, poster only — no layout shift when the video mounts.
        // eslint-disable-next-line @next/next/no-img-element -- poster stand-in for a <video>, same asset the video tag uses
        <img
          src="/promo/ink-demo-poster.jpeg"
          alt=""
          width={1920}
          height={1080}
          className="w-full rounded border-[1.5px] border-[var(--ec-border)] shadow-[var(--ec-shadow-hard,6px_6px_0_rgba(37,34,27,0.1))]"
        />
      )}
    </div>
  )
}
