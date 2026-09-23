'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  CREATOR_CODE_PARAM,
  CREATOR_CODE_STORAGE_KEY,
  validateCreatorCode,
} from '@/lib/creators/codes'

type CreatorLite = {
  handle: string
  displayName: string
  code: string
  giftMarks: number
}

type ClaimResponse = {
  status: 'granted' | 'already' | 'exhausted' | 'self' | 'invalid' | 'signin_required'
  marksGranted?: number
}

/**
 * The creator code on the mark page. Picks a code up from `?code=` (a bio
 * link) or from the last visit, checks it is live, and hands it to the form
 * so the run is stamped with it. A signed-in student also claims the gift
 * here — the one place a spoken code reliably gets typed.
 *
 * Not a <form>: it lives inside the mark form, and nested forms are invalid.
 */
export function CreatorCodeChip({ onChange }: { onChange: (code: string | null) => void }) {
  const [creator, setCreator] = useState<CreatorLite | null>(null)
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [status, setStatus] = useState<'idle' | 'checking' | 'invalid'>('idle')
  const [gift, setGift] = useState<string | null>(null)
  const claimedFor = useRef<string | null>(null)

  const claim = useCallback(async (code: string) => {
    if (claimedFor.current === code) return
    claimedFor.current = code
    try {
      // A guest has nothing to claim yet; the gift lands after signup via the
      // cookie. Checking first keeps a 401 out of their console.
      const auth = await fetch('/api/auth/check')
      const who = (await auth.json()) as { user: unknown }
      if (!who.user) return
      const res = await fetch('/api/creators/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      if (res.status === 401) return
      const data = (await res.json()) as ClaimResponse
      if (data.status === 'granted' && data.marksGranted) {
        setGift(`+${data.marksGranted} free marks added to your account`)
      } else if (data.status === 'already') {
        setGift('Code applied — every mark counts for them')
      } else if (data.status === 'self') {
        setGift('Your own code — marks you make here are your own')
      } else if (data.status === 'exhausted') {
        setGift('This month’s gift pool is used up — your marks still count for them')
      }
    } catch {
      // Attribution on the run still happens server-side; the gift is a bonus.
    }
  }, [])

  const apply = useCallback(
    async (raw: string) => {
      const check = validateCreatorCode(raw)
      if (!check.ok) {
        setStatus('invalid')
        return
      }
      setStatus('checking')
      try {
        const res = await fetch(`/api/creators/code/${encodeURIComponent(check.code)}`)
        if (!res.ok) {
          setStatus('invalid')
          return
        }
        const data = (await res.json()) as { creator: CreatorLite | null }
        if (!data.creator) {
          setStatus('invalid')
          return
        }
        setCreator(data.creator)
        setStatus('idle')
        setOpen(false)
        try {
          localStorage.setItem(CREATOR_CODE_STORAGE_KEY, data.creator.code)
        } catch {
          // private mode: the code still applies for this page
        }
        onChange(data.creator.code)
        // The attribution cookie. A typed code never passes through a URL
        // the proxy sees, so signup would otherwise not credit this creator.
        void fetch('/api/creators/ref', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: data.creator.code }),
        }).catch(() => undefined)
        void claim(data.creator.code)
      } catch {
        setStatus('invalid')
      }
    },
    [claim, onChange]
  )

  useEffect(() => {
    let raw: string | null = null
    try {
      raw = new URL(window.location.href).searchParams.get(CREATOR_CODE_PARAM)
    } catch {
      raw = null
    }
    if (!raw) {
      try {
        raw = localStorage.getItem(CREATOR_CODE_STORAGE_KEY)
      } catch {
        raw = null
      }
    }
    if (raw) void apply(raw)
  }, [apply])

  function clear() {
    setCreator(null)
    setGift(null)
    setInput('')
    onChange(null)
    try {
      localStorage.removeItem(CREATOR_CODE_STORAGE_KEY)
    } catch {
      // nothing to clear
    }
    void fetch('/api/creators/ref', { method: 'DELETE' }).catch(() => undefined)
  }

  if (creator) {
    return (
      <div className="ms-cr-chip" role="status">
        <span className="ms-cr-chip__label">Code {creator.code}</span>
        <span>
          Marking with <strong>@{creator.handle}</strong>
        </span>
        {gift ? (
          <span className="ms-cr-chip__note ms-cr-chip__note--gift">{gift}</span>
        ) : creator.giftMarks > 0 ? (
          <span className="ms-cr-chip__note">
            +{creator.giftMarks} free marks when you sign up
          </span>
        ) : null}
        <button type="button" className="ms-cr-chip__clear" onClick={clear}>
          remove
        </button>
      </div>
    )
  }

  if (!open) {
    return (
      <button type="button" className="ms-cr-chip-toggle" onClick={() => setOpen(true)}>
        Have a creator code?
      </button>
    )
  }

  return (
    <div className="ms-cr-chip-form">
      <input
        className="ec-input"
        aria-label="Creator code"
        placeholder="CODE"
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        maxLength={12}
        value={input}
        onChange={(e) => {
          setInput(e.target.value)
          if (status === 'invalid') setStatus('idle')
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            void apply(input)
          }
        }}
      />
      <button
        type="button"
        className="ec-btn-secondary"
        disabled={status === 'checking' || !input.trim()}
        onClick={() => void apply(input)}
      >
        {status === 'checking' ? 'Checking…' : 'Apply'}
      </button>
      <button type="button" className="ms-cr-chip__clear" onClick={() => setOpen(false)}>
        cancel
      </button>
      {status === 'invalid' ? (
        <span className="ms-cr-chip__note">That code isn&apos;t live. Check the spelling.</span>
      ) : null}
    </div>
  )
}
