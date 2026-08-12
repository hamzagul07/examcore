'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Sticky jump bar for /demo.
 *
 * An earlier version of this made the scenes into tabs, which fixed the length
 * by hiding seven eighths of the page — the wrong trade. The page is the full
 * argument and every scene earns its place; what it lacked was a way to move
 * around it. So: everything stays rendered and in sequence, and this rides
 * along the top so a reader can see the whole shape at a glance and jump to the
 * part they came for.
 *
 * It also carries the `?scene=` contract the gates depend on. A locked
 * flashcard section links to `/demo?scene=cards` and the reader is taken
 * straight to that scene — still inside the full page, so the rest is there if
 * they keep going, rather than being the only thing they are shown.
 */
/** Height the sticky bar occupies, so a jump does not land under it. */
const STICKY_OFFSET = 96

export function DemoSectionNav({
  sections,
}: {
  sections: Array<{ id: string; label: string; tag?: string }>
}) {
  const [active, setActive] = useState(sections[0]?.id ?? '')
  const listRef = useRef<HTMLUListElement>(null)

  /**
   * Deep-link on arrival — the contract every locked gate depends on.
   *
   * Two things broke the obvious version of this, both found on a real build:
   *
   * 1. **One frame is not enough.** The page is ~14,000px of dashboard, and on
   *    mount the layout above the target is still resolving (fonts, the marking
   *    result, the mastery matrix). Measuring in a `requestAnimationFrame`
   *    scrolls to a position that is stale a moment later, so the landing is
   *    wrong or does not happen at all.
   * 2. **Smooth loses the race.** `scroll-behavior: smooth` is set globally, and
   *    the App Router resets scroll to top after hydration — which silently
   *    cancels an in-flight smooth animation and leaves the reader at the top.
   *
   * So: scroll instantly (nothing to cancel) to an explicitly computed offset
   * that clears the sticky bar, and re-assert it as layout settles until the
   * target stops moving.
   */
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get('scene')
    if (!wanted || !sections.some((s) => s.id === wanted)) return
    setActive(wanted)

    let cancelled = false
    const settle = () => {
      if (cancelled) return
      const el = document.getElementById(`demo-${wanted}`)
      if (!el) return
      const top = el.getBoundingClientRect().top + window.scrollY - STICKY_OFFSET
      // Only correct a real drift, so this never fights the reader once they
      // start scrolling themselves.
      if (Math.abs(window.scrollY - top) > 8) {
        window.scrollTo({ top: Math.max(0, top), behavior: 'instant' })
      }
    }

    const timers = [0, 120, 400, 900].map((d) => window.setTimeout(settle, d))
    window.addEventListener('load', settle)
    return () => {
      cancelled = true
      timers.forEach(clearTimeout)
      window.removeEventListener('load', settle)
    }
  }, [sections])

  // Highlight whichever scene is currently in view.
  useEffect(() => {
    const els = sections
      .map((s) => document.getElementById(`demo-${s.id}`))
      .filter((el): el is HTMLElement => !!el)
    if (!els.length) return

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (visible?.target.id) setActive(visible.target.id.replace(/^demo-/, ''))
      },
      // Top-weighted band: a scene counts as "current" once its heading is
      // under the sticky bar, not when its last pixel leaves the viewport.
      { rootMargin: '-88px 0px -55% 0px', threshold: 0 }
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [sections])

  /**
   * On a phone the bar is a single row that scrolls sideways, so the link
   * scroll-spy just highlighted is frequently off-screen. Centre it.
   *
   * Deliberately sets `scrollLeft` on the list rather than calling
   * `scrollIntoView` on the link: the bar is sticky and the page is mid-scroll,
   * and scrollIntoView would be free to move the *page* vertically to satisfy
   * the request. This can only ever move the strip. On desktop the row wraps
   * instead of scrolling, so there is no overflow and this is a no-op.
   */
  useEffect(() => {
    const list = listRef.current
    if (!list || list.scrollWidth <= list.clientWidth) return
    const link = list.querySelector<HTMLElement>(`[data-scene="${active}"]`)
    if (!link) return
    const target = link.offsetLeft - (list.clientWidth - link.offsetWidth) / 2
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    list.scrollTo({
      left: Math.max(0, target),
      behavior: reduce ? 'auto' : 'smooth',
    })
  }, [active])

  const jump = (id: string) => {
    const el = document.getElementById(`demo-${id}`)
    if (!el) return
    setActive(id)
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    const url = new URL(window.location.href)
    url.searchParams.set('scene', id)
    window.history.replaceState(null, '', url)
  }

  return (
    <nav className="demo-nav" aria-label="Jump to a section">
      <div className="demo-nav__inner">
        <p className="demo-nav__title mono" aria-hidden>
          On this page
        </p>
        <ul className="demo-nav__list" ref={listRef}>
          {sections.map((s, i) => {
            const on = s.id === active
            return (
              <li key={s.id}>
                <button
                  type="button"
                  data-scene={s.id}
                  className={on ? 'demo-navlink demo-navlink--on' : 'demo-navlink'}
                  onClick={() => jump(s.id)}
                  aria-current={on ? 'true' : undefined}
                >
                  <span className="demo-navlink__n mono" aria-hidden>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  {s.label}
                  {s.tag && (
                    <span
                      className={
                        s.tag === 'Free'
                          ? 'demo-navlink__tag demo-navlink__tag--free'
                          : 'demo-navlink__tag'
                      }
                    >
                      {s.tag}
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}
