'use client'

import { useState } from 'react'
import type { ShareKit } from '@/lib/creators/codes'

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      className="ms-cr-copy"
      data-copied={copied ? 'true' : 'false'}
      aria-label={`Copy ${label}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setCopied(true)
          window.setTimeout(() => setCopied(false), 1600)
        } catch {
          // Clipboard blocked: the text is on screen and selectable.
        }
      }}
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

function Field({ label, text, code = false }: { label: string; text: string; code?: boolean }) {
  return (
    <div className="ms-cr-kit__field">
      <div className="ms-cr-kit__label">
        <span>{label}</span>
        <CopyButton text={text} label={label} />
      </div>
      <p className={`ms-cr-kit__text${code ? ' ms-cr-kit__text--code' : ''}`}>{text}</p>
    </div>
  )
}

/** Paste-ready copy. Every post text already carries the #ad disclosure. */
export function CreatorShareKit({ kit }: { kit: ShareKit }) {
  return (
    <div className="ms-cr-kit">
      <Field label="Your space" text={kit.link} code />
      <Field label="Straight to marking, code applied" text={kit.markLink} code />
      <Field label="Bio line" text={kit.bioLine} />
      <Field label="Pinned comment" text={kit.pinnedComment} />
      <Field label="Caption for a “got marked” video" text={kit.caption} />
    </div>
  )
}
