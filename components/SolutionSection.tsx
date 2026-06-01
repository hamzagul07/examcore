'use client'

import { useState } from 'react'
import { BookOpen, Sparkles, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { MarkdownWithMath } from '@/components/MarkdownWithMath'
import { Skeleton } from '@/components/ui/Skeleton'

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
    try {
      const res = await fetch('/api/mark/solution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attempt_id: attemptId }),
      })
      const data = await res.json()
      if (!res.ok || !data.solution) {
        setError(data.error || 'Could not generate a solution.')
        return
      }
      setSolution(data.solution)
      setVisible(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error')
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
        className="ec-card p-5 sm:p-6"
      >
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <div className="ec-tint-success-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border">
            <BookOpen className="h-5 w-5 ec-text-brand" />
          </div>
          <div className="flex-1">
            <p className="font-semibold tracking-tight text-[var(--ec-text-primary)]">
              Worked solution available
            </p>
            <p className="text-sm text-[var(--ec-text-secondary)]">
              We&apos;ve already written out a step-by-step solution for this
              question.
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
            View solution
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
        className="ec-card-brand relative overflow-hidden p-8 text-center sm:p-12"
      >
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full ec-glow-orb-lg blur-[100px]"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-20 -left-16 h-56 w-56 rounded-full ec-glow-orb-accent blur-[100px]"
          aria-hidden="true"
        />
        <div className="relative">
          <p className="ec-label-tech mb-6 justify-center" style={{ display: 'inline-flex' }}>
            WORKED SOLUTION
          </p>
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="ec-upload-icon-wrap mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl"
          >
            <Sparkles className="h-8 w-8 ec-text-brand" />
          </motion.div>
          <h3 className="text-3xl font-extrabold tracking-tight">
            <span className="gradient-text">Want to see</span>{' '}
            <span className="ec-text-gradient">how it&apos;s done?</span>
          </h3>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-[var(--ec-text-secondary)]">
            Get a step-by-step worked solution to learn from. Generated once,
            saved forever for revision.
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
                Generating solution...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
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

  // Solution loaded + visible — render it.
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="ec-card p-5 sm:p-7"
    >
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border ec-tint-success-icon">
          <BookOpen className="h-5 w-5" />
        </div>
        <div>
          <p className="ec-label-tech mb-1">WORKED SOLUTION</p>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--ec-text-primary)]">
            Step-by-step
          </h2>
        </div>
      </div>
      <MarkdownWithMath content={solution} />
    </motion.div>
  )
}
