/**
 * Marking a student's teacher notes as read once they have been shown
 * (docs/TEACHER_SYSTEM_SPEC.md §4 "marks read via /api/feedback/read").
 *
 * Client-side and fire-and-forget: a note that fails to be marked read is
 * still on the page, and is marked the next time it is shown. `keepalive`
 * lets the request finish if the student navigates straight away.
 */

import { MAX_FEEDBACK_READ_IDS } from '@/lib/student/assignment-state'

export async function postFeedbackRead(ids: readonly string[]): Promise<boolean> {
  const unique = [...new Set(ids)].slice(0, MAX_FEEDBACK_READ_IDS)
  if (unique.length === 0) return true
  try {
    const res = await fetch('/api/feedback/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: unique }),
      keepalive: true,
    })
    return res.ok
  } catch {
    return false
  }
}
