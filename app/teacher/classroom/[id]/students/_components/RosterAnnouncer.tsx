'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { rosterRowId } from '@/lib/teacher/insights/format'

type RosterAnnouncerValue = {
  /**
   * A student was just removed: announce `message`, refresh the roster from
   * the server, and put focus on that student's (now Removed) row when the
   * new render lands.
   */
  removed: (studentId: string, message: string) => void
}

const RosterAnnouncerContext = createContext<RosterAnnouncerValue | null>(null)

/** The roster's announcer, or null outside one (RemoveStudentButton then refreshes on its own). */
export function useRosterAnnouncer(): RosterAnnouncerValue | null {
  return useContext(RosterAnnouncerContext)
}

/**
 * One polite live region for the whole roster, outside its rows.
 *
 * Removing a student re-renders their row as Removed, which unmounts the
 * Remove button that held focus — and with it any live region inside the
 * row. So the outcome is announced here, where it survives the refresh, and
 * once the refreshed roster is on screen focus moves to that student's row
 * (or, if the row is gone, to the roster heading) instead of falling to the
 * top of the document.
 */
export function RosterAnnouncer({ headingId, children }: { headingId: string; children: ReactNode }) {
  const router = useRouter()
  const [message, setMessage] = useState('')
  const [pending, startTransition] = useTransition()
  const focusTarget = useRef<string | null>(null)

  const removed = useCallback(
    (studentId: string, text: string) => {
      setMessage(text)
      focusTarget.current = rosterRowId(studentId)
      startTransition(() => router.refresh())
    },
    [router]
  )

  useEffect(() => {
    if (pending || !focusTarget.current) return
    const target = document.getElementById(focusTarget.current) ?? document.getElementById(headingId)
    focusTarget.current = null
    target?.focus()
  }, [pending, headingId])

  const value = useMemo(() => ({ removed }), [removed])

  return (
    <RosterAnnouncerContext.Provider value={value}>
      <p className="sr-only" role="status" aria-live="polite">
        {message}
      </p>
      {children}
    </RosterAnnouncerContext.Provider>
  )
}
