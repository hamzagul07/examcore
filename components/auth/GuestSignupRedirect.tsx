'use client'

import { Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { LoadingLink } from '@/components/ui/LoadingLink'
import { buildContentGateSignUpHref } from '@/lib/auth-redirect'
import { setGuestBrowseCookie } from '@/lib/guest-browse'
import { useContentReturnPath } from '@/lib/hooks/useContentReturnPath'

function GuestSignupRedirectInner() {
  const router = useRouter()
  const returnPath = useContentReturnPath()
  const signUpHref = buildContentGateSignUpHref(returnPath)

  function skipToContent() {
    setGuestBrowseCookie()
    router.replace(returnPath)
  }

  return (
    <motion.div
      className="ec-guest-signup-redirect"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      role="dialog"
      aria-modal="true"
      aria-label="Create a free account to unlock this topic"
    >
      <motion.div
        className="ec-guest-signup-redirect__panel"
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.05, ease: [0.4, 0, 0.2, 1] }}
      >
        <p className="ec-guest-signup-redirect__eyebrow">Free account</p>
        <p className="ec-guest-signup-redirect__title">Save your progress on this topic</p>
        <p className="ec-guest-signup-redirect__lead">
          Create a free account to unlock this topic and keep your progress — or keep browsing
          without one.
        </p>
        <LoadingLink
          href={signUpHref}
          className="ec-btn-primary ec-guest-signup-redirect__cta"
          loadingText="Opening sign up…"
        >
          Create free account
        </LoadingLink>
        <button type="button" className="ec-guest-signup-redirect__skip" onClick={skipToContent}>
          Just browsing? Skip to content
        </button>
      </motion.div>
    </motion.div>
  )
}

/** Content gate: offers signup (with return path preserved) or a guest skip. */
export function GuestSignupRedirect() {
  return (
    <Suspense fallback={null}>
      <GuestSignupRedirectInner />
    </Suspense>
  )
}
