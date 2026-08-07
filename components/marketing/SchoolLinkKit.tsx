'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

/**
 * Copy-paste snippets for a department's own resources page.
 *
 * The links here carry no UTM parameters, deliberately. A tagged link is a
 * campaign; a clean canonical link is a citation, and passes its full weight to
 * the domain — which for a site still inside its new-domain trust window is the
 * entire point of asking. Attribution does not suffer: these arrive with a
 * school referrer, and `classify_channel()` routes school hosts to their own
 * channel without needing a tag.
 */

const SITE = 'https://markscheme.app'

type Snippet = {
  id: string
  label: string
  hint: string
  value: string
  /** Rendered in a code block rather than as prose. */
  code?: boolean
}

const SNIPPETS: Snippet[] = [
  {
    id: 'text',
    label: 'Plain text',
    hint: 'For a Word document, a printed revision list, or an email to parents.',
    value:
      'MarkScheme (markscheme.app) — mark your past-paper answers against the real mark scheme and see exactly where the marks were lost.',
  },
  {
    id: 'html',
    label: 'HTML link',
    hint: 'For a department page on the school website or VLE.',
    code: true,
    value: `<a href="${SITE}">MarkScheme</a> &mdash; mark past-paper answers against the real mark scheme and see exactly where the marks were lost.`,
  },
  {
    id: 'markdown',
    label: 'Markdown',
    hint: 'For a Google Site, Notion page, or GitHub-flavoured wiki.',
    code: true,
    value: `[MarkScheme](${SITE}) — mark past-paper answers against the real mark scheme and see exactly where the marks were lost.`,
  },
]

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard blocked (insecure context, permissions). The text is visible
      // and selectable either way, so this fails quietly rather than alarming
      // someone who can simply select it.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="ec-btn-secondary inline-flex min-h-[44px] shrink-0 items-center gap-2 text-sm"
      aria-label={`Copy the ${label} snippet`}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

export function SchoolLinkKit() {
  return (
    <section>
      <h2 className="landing-h3 mb-2 text-[var(--ec-text-primary)]">
        Add us to your department&apos;s resources page
      </h2>
      <p className="mb-5 text-sm leading-relaxed text-[var(--ec-text-secondary)]">
        If your students find this useful, the single most helpful thing you can do
        is list it wherever your department keeps its revision links. Copy whichever
        version fits.
      </p>

      <ul className="space-y-4">
        {SNIPPETS.map((s) => (
          <li key={s.id} className="ec-card px-5 py-4 sm:px-6">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-[var(--ec-text-primary)]">{s.label}</h3>
                <p className="text-xs text-[var(--ec-text-secondary)]">{s.hint}</p>
              </div>
              <CopyButton value={s.value} label={s.label} />
            </div>
            {s.code ? (
              <pre className="overflow-x-auto rounded-lg bg-[var(--ec-surface-raised)] p-3 text-xs leading-relaxed">
                <code className="whitespace-pre">{s.value}</code>
              </pre>
            ) : (
              <p className="rounded-lg bg-[var(--ec-surface-raised)] p-3 text-sm leading-relaxed text-[var(--ec-text-primary)]">
                {s.value}
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
