'use client'

import { useEffect, useRef, useState } from 'react'
import { validateUsername } from '@/lib/community/username'

export type UsernameState = { value: string; valid: boolean }

/**
 * Username input with live format validation + availability check against
 * /api/community/username. Used at sign-up and in account settings.
 */
export function UsernameField({
  value,
  onChange,
  id = 'username',
  autoFocus,
}: {
  value: string
  onChange: (state: UsernameState) => void
  id?: string
  autoFocus?: boolean
}) {
  const [status, setStatus] = useState<'idle' | 'checking' | 'ok' | 'taken' | 'invalid'>('idle')
  const [message, setMessage] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!value) {
      setStatus('idle')
      setMessage('')
      onChange({ value: '', valid: false })
      return
    }
    const check = validateUsername(value)
    if (!check.ok) {
      setStatus('invalid')
      setMessage(check.error)
      onChange({ value, valid: false })
      return
    }
    setStatus('checking')
    setMessage('Checking availability…')
    onChange({ value: check.username, valid: false })
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/community/username?u=${encodeURIComponent(check.username)}`)
        const data = await res.json()
        if (data.available) {
          setStatus('ok')
          setMessage('Available')
          onChange({ value: check.username, valid: true })
        } else {
          setStatus('taken')
          setMessage('That username is taken — try another.')
          onChange({ value: check.username, valid: false })
        }
      } catch {
        // Network hiccup — treat format-valid as acceptable; server re-checks.
        setStatus('ok')
        setMessage('')
        onChange({ value: check.username, valid: true })
      }
    }, 400)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [value, onChange])

  return (
    <div>
      <div className="ec-username-input-wrap" style={{ position: 'relative' }}>
        <span
          aria-hidden
          style={{
            position: 'absolute',
            left: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--ec-text-secondary)',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          u/
        </span>
        <input
          id={id}
          type="text"
          value={value}
          autoFocus={autoFocus}
          onChange={(e) => onChange({ value: e.target.value.toLowerCase().replace(/\s/g, ''), valid: false })}
          autoComplete="username"
          placeholder="studymaster_21"
          maxLength={20}
          className="ec-input"
          style={{ paddingLeft: 34 }}
        />
      </div>
      {message ? (
        <p
          className={`mt-1.5 text-xs ${
            status === 'ok'
              ? 'ec-score-high'
              : status === 'checking'
                ? 'text-[var(--ec-text-secondary)]'
                : 'ec-score-low'
          }`}
        >
          {message}
        </p>
      ) : (
        <p className="mt-1.5 text-xs text-[var(--ec-text-secondary)]">
          3–20 chars: lowercase letters, numbers, underscores. Your public community name.
        </p>
      )}
    </div>
  )
}
