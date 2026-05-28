'use client'

import { Copy, Link2, Check } from 'lucide-react'
import { useState } from 'react'

interface InviteCardProps {
  classroom: {
    invite_code: string
  }
}

export function InviteCard({ classroom }: InviteCardProps) {
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/join/${classroom.invite_code}`
      : ''

  function copyCode() {
    navigator.clipboard.writeText(classroom.invite_code)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  function copyLink() {
    navigator.clipboard.writeText(shareUrl)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  return (
    <div className="ec-card mb-8 p-6">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="ec-label-tech mb-3">INVITE STUDENTS</div>
          <div className="flex items-center gap-3">
            <code className="font-mono text-4xl font-bold tracking-widest text-emerald-400">
              {classroom.invite_code}
            </code>
            <button
              type="button"
              onClick={copyCode}
              className="rounded-xl bg-white/5 p-2.5 transition-colors hover:bg-white/10"
              title="Copy code"
            >
              {copiedCode ? (
                <Check className="h-5 w-5 text-emerald-400" />
              ) : (
                <Copy className="h-5 w-5 text-slate-400" />
              )}
            </button>
          </div>
          <p className="mt-3 text-sm text-slate-400">
            Students enter this code at{' '}
            <span className="text-emerald-400">/join</span> or use the share
            link.
          </p>
        </div>

        <button
          type="button"
          onClick={copyLink}
          className="ec-btn-primary inline-flex items-center gap-2 self-stretch md:self-auto"
        >
          {copiedLink ? (
            <Check className="h-5 w-5" />
          ) : (
            <Link2 className="h-5 w-5" />
          )}
          {copiedLink ? 'Link copied!' : 'Copy share link'}
        </button>
      </div>
    </div>
  )
}
