/**
 * The glyph beside a notification in the bell and the inbox — one typographic
 * character per `notifications.type` (never an emoji: both lists are set in
 * the Examiner's Ink mono). Teacher-system types (lib/teacher/notify.ts and the
 * classroom routes) sit beside the Exam Room and study ones; anything unknown
 * gets the neutral '#'.
 *
 * Pure and client-safe.
 */
const NOTIFICATION_GLYPHS: Readonly<Record<string, string>> = {
  // Exam Room and study
  reply: '↩',
  digest: '★',
  upvote: '↑',
  comment_upvote: '↑',
  mention: '@',
  milestone: '★',
  thread: '#',
  moderation: '!',
  'review-due': '→',
  // Teacher system v2
  assignment_set: '✎',
  assignment_due: '◷',
  submission_received: '↓',
  mark_reviewed: '✓',
  teacher_feedback: '¶',
  class_removed: '×',
  seat_decision: '§',
}

export function notificationIcon(type: string): string {
  return Object.prototype.hasOwnProperty.call(NOTIFICATION_GLYPHS, type) ? NOTIFICATION_GLYPHS[type] : '#'
}

/** Shown when the list is empty — for students, teachers and community alike. */
export const NOTIFICATIONS_EMPTY_TEXT = 'No notifications yet — replies, marks and class updates land here.'
