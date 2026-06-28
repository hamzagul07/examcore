'use client'

import { useEffect, useState } from 'react'
import type { SVGProps } from 'react'
import { Link2, Check, Share2 } from 'lucide-react'

// Inline brand SVGs (lucide dropped its brand icons) — matches SiteFooter.
function XIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}
function LinkedinIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z" />
    </svg>
  )
}

const BTN =
  'inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-[var(--ec-border)] px-3.5 text-sm font-semibold text-[var(--ec-text-secondary)] transition-colors hover:border-[var(--ec-brand)] hover:text-[var(--ec-brand)]'

export function BlogShareButtons({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false)
  const [canShare, setCanShare] = useState(false)

  // Resolve native-share support after mount so SSR and first render agree.
  useEffect(() => {
    setCanShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function')
  }, [])

  const tweetHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    title
  )}&url=${encodeURIComponent(url)}`
  const linkedinHref = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard blocked (e.g. insecure context) — the X/LinkedIn links still work.
    }
  }

  async function nativeShare() {
    try {
      await navigator.share({ title, url })
    } catch {
      // User cancelled or the share sheet is unavailable — no action needed.
    }
  }

  return (
    <div
      className="mt-10 flex flex-wrap items-center gap-2 border-t border-[var(--ec-border)] pt-6"
      role="group"
      aria-label="Share this article"
    >
      <span className="ms-micro mr-1">SHARE</span>
      {canShare ? (
        <button type="button" className={BTN} onClick={nativeShare}>
          <Share2 className="h-4 w-4" aria-hidden />
          <span>Share</span>
        </button>
      ) : null}
      <a
        className={BTN}
        href={tweetHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on X (formerly Twitter)"
      >
        <XIcon width={15} height={15} />
        <span>Post</span>
      </a>
      <a
        className={BTN}
        href={linkedinHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on LinkedIn"
      >
        <LinkedinIcon width={15} height={15} />
        <span>LinkedIn</span>
      </a>
      <button
        type="button"
        className={BTN}
        onClick={copyLink}
        aria-label={copied ? 'Link copied to clipboard' : 'Copy link'}
      >
        {copied ? <Check className="h-4 w-4" aria-hidden /> : <Link2 className="h-4 w-4" aria-hidden />}
        <span>{copied ? 'Copied' : 'Copy link'}</span>
      </button>
    </div>
  )
}
