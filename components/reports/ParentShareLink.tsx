'use client'

import { useEffect, useState } from 'react'
import { trackFunnelEvent } from '@/lib/analytics/funnel'
import { PREVIEW_PARAM } from '@/lib/reports/preview-param'

/**
 * "Show someone what you've done" — the student's end of the parent funnel.
 *
 * CONVERSION_PSYCHOLOGY.md §8: the buyer is usually not the user. A 16-year-old
 * rarely completes a card payment alone, and until now the funnel had no parent
 * in it at all. This is the handle: one link, generated for the student's own
 * account, that shows effort rather than a score.
 *
 * The link is minted server-side and passed in already formed, so nothing is
 * requested and nothing can fail when the button is pressed.
 */
export function ParentShareLink({
  url,
  marksCompleted,
}: {
  url: string
  /** Shown so the student knows what the recipient will see before sending. */
  marksCompleted: number
}) {
  const [copied, setCopied] = useState(false)
  const previewUrl = `${url}${url.includes('?') ? '&' : '?'}${PREVIEW_PARAM}=1`
  // Read after mount: `navigator` differs between the server render and the
  // browser, and deciding this during render is a hydration mismatch.
  const [canShare, setCanShare] = useState(false)
  useEffect(() => {
    setCanShare(typeof navigator.share === 'function')
  }, [])

  function track(via: string) {
    trackFunnelEvent('parent_report_shared', { source: via })
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // Clipboard blocked (insecure context, permissions): the input below is
      // still there to select by hand, so this is not worth an error state —
      // but nothing was copied, so nothing is counted either.
      return
    }
    track('copy')
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2500)
  }

  async function share() {
    track('native')
    try {
      await navigator.share({
        title: 'My exam practice so far',
        text: `${marksCompleted} exam questions marked against the official mark schemes.`,
        url,
      })
    } catch {
      // Cancelled, or unsupported — nothing to recover from.
    }
  }

  return (
    <section className="ec-card mb-8 p-5 sm:p-6">
      <p className="ec-label-tech mb-2">SHOW SOMEONE THE WORK</p>
      <h2 className="text-lg font-semibold text-[var(--ec-text-primary)]">
        A one-page report of what you&apos;ve actually done
      </h2>
      <p className="mt-2 max-w-prose text-sm leading-relaxed text-[var(--ec-text-secondary)]">
        {marksCompleted} marked {marksCompleted === 1 ? 'question' : 'questions'},
        the subjects, and the topics worth your next hour. No answers, no
        comments, no individual scores — just the effort and where it&apos;s
        going. Send it to a parent or a tutor.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={copy} className="ec-btn-primary px-4 py-2 text-sm">
          {copied ? 'Link copied' : 'Copy the link'}
        </button>
        {canShare ? (
          <button type="button" onClick={share} className="ec-btn-underline text-sm">
            Share…
          </button>
        ) : null}
        {/* Flagged so the view tracker can tell the student checking their own
            report from a parent actually opening it, and not counted as a
            share — looking at it is not sending it. */}
        <a
          href={previewUrl}
          target="_blank"
          rel="noreferrer"
          className="ec-btn-underline text-sm"
        >
          See what they&apos;ll see →
        </a>
      </div>

      <input
        readOnly
        value={url}
        aria-label="Your shareable report link"
        onFocus={(e) => e.currentTarget.select()}
        className="ec-input mt-4 w-full font-mono text-xs"
      />
    </section>
  )
}
