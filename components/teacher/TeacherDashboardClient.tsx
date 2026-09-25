'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSetAIContext } from '@/lib/omni-ai/context'
import { FormErrorAlert } from '@/components/ui/FormErrorAlert'

/**
 * The desk's client islands. The desk itself is a server component
 * (app/teacher/dashboard/page.tsx) that loads TeacherOverview once; only the
 * two things that need the browser live here.
 */

/**
 * Tells the Omni assistant the teacher is on their desk. Renders nothing.
 * Context data is deliberately empty: the server builds any class context
 * itself and ignores what a client sends (spec §3, /api/omni-ai).
 */
export function TeacherDashboardClient() {
  useSetAIContext({ type: 'teacher_dashboard', data: {} }, [])
  return null
}

/**
 * "Show me an example class" — builds a demo class with simulated students
 * and one set, then opens it. The page renders this only outside production
 * (demoSeedingEnabled); the route refuses there too.
 */
export function DemoClassButton() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function build() {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/teacher/seed-demo', { method: 'POST' })
      const data = (await res.json().catch(() => ({}))) as { classroom_id?: string; error?: string }
      if (res.ok && data.classroom_id) {
        router.push(`/teacher/classroom/${data.classroom_id}`)
        router.refresh()
        return
      }
      setError(data.error || 'Could not build the example class.')
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void build()}
        disabled={busy}
        aria-busy={busy || undefined}
        className="ec-btn-secondary inline-flex min-h-[44px] items-center justify-center gap-2 disabled:opacity-60"
      >
        <span className="font-mono text-[11px] font-bold tracking-wide" aria-hidden>
          DEMO
        </span>
        {busy ? 'Building the example…' : 'Show me an example class'}
      </button>
      <p className="sr-only" role="status" aria-live="polite">
        {busy ? 'Building the example class. This takes a few seconds.' : ''}
      </p>
      {error ? <FormErrorAlert message={error} className="w-full" /> : null}
    </>
  )
}
