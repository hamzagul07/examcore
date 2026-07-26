'use client'

import { useEffect } from 'react'

/**
 * Settles lesson sections in as they arrive in the viewport.
 *
 * Deliberately opt-in per element via a `data-reveal` attribute set by JS, not
 * by default CSS: if the script never runs, nothing is ever hidden. A reveal
 * animation that fails closed would leave a reader staring at a blank page,
 * which is a far worse outcome than no animation at all.
 *
 * Honours `prefers-reduced-motion` by not engaging at all — the CSS transition
 * is also gated, so this is belt and braces.
 */
export function useSectionReveal(selector = '.lsec', enabled = true) {
  useEffect(() => {
    if (!enabled) return
    if (typeof IntersectionObserver === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const nodes = Array.from(document.querySelectorAll<HTMLElement>(selector))
    if (!nodes.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const el = entry.target as HTMLElement
          el.dataset.reveal = 'shown'
          observer.unobserve(el)
        }
      },
      // Fire a little before the section reaches the fold, so it has finished
      // settling by the time the reader's eye gets there.
      { rootMargin: '0px 0px -12% 0px', threshold: 0.04 }
    )

    for (const node of nodes) {
      const rect = node.getBoundingClientRect()
      // Anything already on screen at mount stays put — animating the section
      // someone is currently reading would be motion for its own sake.
      if (rect.top < window.innerHeight * 0.9) {
        node.dataset.reveal = 'shown'
        continue
      }
      node.dataset.reveal = 'pending'
      observer.observe(node)
    }

    return () => observer.disconnect()
  }, [enabled, selector])
}
