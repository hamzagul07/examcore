'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { MarkdownWithMath } from '@/components/MarkdownWithMath'
import { Skeleton } from '@/components/ui/Skeleton'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type Props = {
  attemptId: string
  /** If the solution is already stored in the DB, pass it in to skip the API call. */
  initialSolution?: string | null
  /**
   * On the attempt-detail page we keep the solution collapsed behind a "View
   * solution" button even when it's already cached. On the /mark page right
   * after marking, the "See full solution" button generates and then auto-
   * expands. Defaults to false (auto-expand on first reveal).
   */
  startCollapsed?: boolean
}

function mapClientError(raw: string): string {
  if (/did not match the expected pattern/i.test(raw)) {
    return 'Could not generate the solution just now. Please try again.'
  }
  return raw
}

export function SolutionSection({
  attemptId,
  initialSolution = null,
  startCollapsed = false,
}: Props) {
  const [solution, setSolution] = useState<string | null>(initialSolution)
  const [visible, setVisible] = useState<boolean>(
    !!initialSolution && !startCollapsed
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function generate() {
    setLoading(true)
    setError('')
    if (!attemptId || !UUID_RE.test(attemptId)) {
      setError('This mark has no saved attempt id yet. Try marking again.')
      setLoading(false)
      return
    }
    try {
      const res = await fetch('/api/mark/solution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attempt_id: attemptId }),
      })
      const data = (await res.json().catch(() => null)) as {
        solution?: string
        error?: string
      } | null
      if (!res.ok || !data?.solution) {
        setError(
          mapClientError(data?.error || 'Could not generate a solution.')
        )
        return
      }
      setSolution(data.solution)
      setVisible(true)
    } catch (e) {
      setError(
        mapClientError(
          e instanceof Error ? e.message : 'Network error — try again.'
        )
      )
    } finally {
      setLoading(false)
    }
  }

  // Already have cached solution but collapsed — show "View solution" button.
  if (solution && !visible) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="ms-solution-section ec-card p-5 sm:p-6"
      >
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <div className="ec-tint-brand-icon flex h-10 w-10 shrink-0 items-center justify-center rounded border">
            <span className="font-mono text-[11px] font-bold tracking-wide ec-text-brand" aria-hidden>
              A*
            </span>
          </div>
          <div className="flex-1">
            <p className="font-semibold tracking-tight text-[var(--ec-text-primary)]">
              Full-marks exam answer ready
            </p>
            <p className="text-sm text-[var(--ec-text-secondary)]">
              Written like a strong student script — clear working, correct final
              answer.
            </p>
          </div>
          <motion.button
            type="button"
            onClick={() => setVisible(true)}
            whileHover={{ y: -2, scale: 1.02 }}
            whileTap={{ y: 0, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 18 }}
            className="ec-btn-secondary text-sm"
            style={{ padding: '10px 16px' }}
          >
            View answer
          </motion.button>
        </div>
      </motion.div>
    )
  }

  // No solution yet — show the big "See full solution" CTA.
  if (!solution) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="ms-solution-section ec-card-brand relative overflow-hidden p-6 text-center sm:p-12"
      >
        <div className="relative">
          <p className="ec-label-tech mb-6 justify-center" style={{ display: 'inline-flex' }}>
            MODEL EXAM ANSWER
          </p>
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="ec-upload-icon-wrap mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded border border-[var(--ec-brand-border)]"
          >
            <span className="font-mono text-lg font-bold tracking-wide ec-text-brand" aria-hidden>
              A*
            </span>
          </motion.div>
          <h3 className="landing-h3">
            Want the <em>full-marks script?</em>
          </h3>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-[var(--ec-text-secondary)]">
            A clear exam-style answer — the working a strong student would write
            in the booklet. Generated once, saved for revision.
          </p>
          <motion.button
            type="button"
            onClick={generate}
            disabled={loading}
            whileHover={loading ? undefined : { y: -2, scale: 1.03 }}
            whileTap={loading ? undefined : { y: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 18 }}
            className={`ec-btn-primary mt-6 text-base ${
              !loading ? 'brand-pulse' : ''
            }`}
            style={{ padding: '16px 28px' }}
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Writing exam answer…
              </>
            ) : (
              <>
                <span className="font-mono text-[11px] font-bold tracking-wide" aria-hidden>
                  A*
                </span>
                See full solution
              </>
            )}
          </motion.button>
          {error && <p className="mt-4 text-sm ec-score-low">{error}</p>}

          <AnimatePresence>
            {loading && (
              <motion.div
                key="solution-skeleton"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.2, duration: 0.3 }}
                className="mt-6 space-y-3 text-left"
              >
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-11/12" />
                <Skeleton className="h-4 w-9/12" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    )
  }

  // Solution loaded + visible — render like an answer booklet page.
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="ms-solution-section ec-card p-5 sm:p-7"
    >
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded border ec-tint-brand-icon">
          <span className="font-mono text-[11px] font-bold tracking-wide" aria-hidden>
            A*
          </span>
        </div>
        <div>
          <p className="ec-label-tech mb-1">MODEL EXAM ANSWER</p>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--ec-text-primary)]">
            Full-marks script
          </h2>
        </div>
      </div>
      <div className="ms-solution-script rounded border border-[var(--ec-border)] bg-[var(--ec-paper,var(--ec-surface))] px-4 py-5 sm:px-6 sm:py-6">
        <p className="mb-4 font-mono text-[11px] uppercase tracking-wide text-[var(--ec-text-secondary)]">
          Answer booklet · clear working · final answer at the end
        </p>
        <div className="ms-solution-script__body text-[15px] leading-relaxed text-[var(--ec-text-primary)]">
          <MarkdownWithMath content={solution} />
        </div>
      </div>
    </motion.div>
  )
}
