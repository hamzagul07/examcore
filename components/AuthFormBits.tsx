'use client'

import type React from 'react'
import { ButtonLoadingState } from '@/components/ui/ButtonLoadingState'
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
    <div className="grid grid-cols-2 gap-1 rounded-2xl border border-[var(--ec-border)] bg-[var(--ec-surface-raised)] p-1 backdrop-blur">
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
      className={`flex min-h-[44px] items-center justify-center rounded-xl px-3 py-2.5 text-sm font-semibold tracking-tight transition-all duration-200 active:scale-[0.98] ${
        active
          ? 'ec-tab-active'
          : 'text-[var(--ec-text-secondary)] hover:text-[var(--ec-text-primary)]'
      }`}
    >
      {children}
    </button>
  )
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border ec-tint-critical-chip p-3.5 text-sm leading-relaxed backdrop-blur">
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
      className="ec-btn-primary w-full justify-center px-6 py-3.5"
    >
      {loading ? (
        <ButtonLoadingState mode="morph" loadingText={loadingLabel}>
          {idleLabel}
        </ButtonLoadingState>
      ) : (
        idleLabel
      )}
    </button>
  )
}
