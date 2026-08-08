'use client'

import { useState } from 'react'
import {
  copyToolSlipText,
  shareToolSlipNative,
  shareToolSlipWhatsApp,
} from '@/lib/tools/tool-slip'

type Props = {
  text: string
  title: string
  url?: string
  className?: string
  /** Default "Copy slip" — mark/parent flows use ScoreReveal separately. */
  copyLabel?: string
}

/** Copy / system Share / WhatsApp — ink stamps matching the score reveal. */
export function ToolShareActions({
  text,
  title,
  url,
  className,
  copyLabel = 'Copy slip',
}: Props) {
  const [copied, setCopied] = useState(false)

  async function onCopy() {
    await copyToolSlipText(text)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  async function onShare() {
    const ok = await shareToolSlipNative(text, title, url)
    if (!ok) shareToolSlipWhatsApp(text)
  }

  return (
    <div className={`mt-3 flex flex-wrap gap-2 ${className ?? ''}`}>
      <button
        type="button"
        className={`ms-score-reveal__share${copied ? ' is-copied' : ''}`}
        onClick={() => void onCopy()}
      >
        <span aria-hidden>{copied ? 'OK' : 'CP'}</span>
        {copied ? 'Copied' : copyLabel}
      </button>
      <button type="button" className="ms-score-reveal__share" onClick={() => void onShare()}>
        <span aria-hidden>SH</span>
        Share
      </button>
      <button
        type="button"
        className="ms-score-reveal__share"
        onClick={() => shareToolSlipWhatsApp(text)}
      >
        <span aria-hidden>WA</span>
        WhatsApp
      </button>
    </div>
  )
}
