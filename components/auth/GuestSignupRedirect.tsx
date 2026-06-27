'use client'

import { Suspense, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { buildContentGateSignUpHref } from '@/lib/auth-redirect'
import { setGuestBrowseCookie } from '@/lib/guest-browse'
import { useContentReturnPath } from '@/lib/hooks/useContentReturnPath'

function GuestSignupRedirectInner() {
  const router = useRouter()
  const returnPath = useContentReturnPath()

  useEffect(() => {
    const href = buildContentGateSignUpHref(returnPath)
    const timer = window.setTimeout(() => {
      router.replace(href)
    }, 450)
    return () => window.clearTimeout(timer)
  }, [returnPath, router])

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
      role="status"
      aria-live="polite"
      aria-label="Redirecting to sign up"
    >
      <motion.div
        className="ec-guest-signup-redirect__panel"
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.05, ease: [0.4, 0, 0.2, 1] }}
      >
        <p className="ec-guest-signup-redirect__eyebrow">Free account</p>
        <p className="ec-guest-signup-redirect__title">Taking you to sign up…</p>
        <p className="ec-guest-signup-redirect__lead">
          Unlock this topic and save progress — or continue without an account.
        </p>
        <button type="button" className="ec-guest-signup-redirect__skip" onClick={skipToContent}>
          Just browsing? Skip to content
        </button>
      </motion.div>
    </motion.div>
  )
}

/** Brief fade overlay, then redirect to signup with return path preserved. */
export function GuestSignupRedirect() {
  return (
    <Suspense fallback={null}>
      <GuestSignupRedirectInner />
    </Suspense>
  )
}
