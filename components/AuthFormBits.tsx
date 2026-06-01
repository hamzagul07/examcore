'use client'

import type React from 'react'
import { Loader2 } from 'lucide-react'
import { triggerPrimaryHaptic } from '@/lib/hooks/useTapFeedback'

export type AuthMethod = 'magic' | 'password'

export function MethodTabs({
  method,
  setMethod,
  setError,
}: {
  method: AuthMethod
  setMethod: (m: AuthMethod) => void
  setError: (s: string) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-2xl border border-white/10 bg-dark-900/70 p-1 backdrop-blur">
      <TabButton
        active={method === 'magic'}
        onClick={() => {
          setMethod('magic')
          setError('')
        }}
      >
        Magic link
      </TabButton>
      <TabButton
        active={method === 'password'}
        onClick={() => {
          setMethod('password')
          setError('')
        }}
      >
        Password
      </TabButton>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-3 py-2 text-sm font-semibold tracking-tight transition-all duration-200 active:scale-[0.98] ${
        active
          ? 'bg-gradient-to-br from-emerald-500/20 to-emerald-500/10 text-white shadow-[0_0_0_1px_rgba(16,185,129,0.4),0_0_20px_rgba(16,185,129,0.2)]'
          : 'text-slate-400 hover:text-white'
      }`}
    >
      {children}
    </button>
  )
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3.5 text-sm leading-relaxed text-red-300 backdrop-blur">
      {message}
    </div>
  )
}

export function SuccessBox({ message }: { message: string }) {
  return (
    <div className="ec-highlight-success leading-relaxed">
      {message}
    </div>
  )
}

/**
 * Form submit button — primary glow variant, full-width, with loading state.
 * Implemented directly so it doesn't depend on the legacy <Button>.
 */
export function SubmitButton({
  loading,
  idleLabel,
  loadingLabel,
  disabled,
}: {
  loading: boolean
  idleLabel: string
  loadingLabel: string
  disabled?: boolean
}) {
  const isDisabled = disabled || loading
  return (
    <button
      type="submit"
      disabled={isDisabled}
      aria-busy={loading || undefined}
      data-loading={loading ? 'true' : undefined}
      onClick={() => {
        if (!isDisabled) triggerPrimaryHaptic()
      }}
      className="ec-btn-primary w-full justify-center"
      style={{ padding: '14px 24px' }}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          {loadingLabel}
        </>
      ) : (
        idleLabel
      )}
    </button>
  )
}
