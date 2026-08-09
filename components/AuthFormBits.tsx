'use client'

import { ButtonLoadingState } from '@/components/ui/ButtonLoadingState'
import { FormErrorAlert } from '@/components/ui/FormErrorAlert'
import { FormSuccessStatus } from '@/components/ui/FormSuccessStatus'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
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
    <SegmentedControl
      aria-label="Sign-in method"
      value={method}
      onChange={(next) => {
        setMethod(next)
        setError('')
      }}
      className="ms-auth-tabs"
      optionClassName="ms-auth-tabs__btn"
      options={[
        { value: 'magic', label: 'Email link' },
        { value: 'password', label: 'Password' },
      ]}
    />
  )
}

export function ErrorBox({ message }: { message: string }) {
  return <FormErrorAlert message={message} />
}

export function SuccessBox({ message }: { message: string }) {
  return <FormSuccessStatus message={message} />
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
