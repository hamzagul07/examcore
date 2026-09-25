/**
 * What the printed set shows (docs/TEACHER_SYSTEM_SPEC.md §4
 * `.../assignments/[aid]/print`: AssignmentPrintSheet on `.ec-exam-sheet` +
 * `.ec-scheme-cite`, "question text and marks only, footer join code").
 *
 * A handout for a class: the set's title, due date and instructions, then
 * each item numbered with its paper reference, its marks and its question —
 * the banked question text, the teacher's prompt, or an instruction to sit
 * the whole paper. The mark scheme never appears. The footer carries the
 * class join code so a student without the class can join from the sheet.
 *
 * Pure: the loader (loadAssignmentPrint) reads question texts with the
 * service client and hands them in; formatting dates is the sheet's job.
 */

import { formatInviteCode, parseInviteCode } from '@/lib/teacher/invite-code'
import type { Assignment, AssignmentItem } from '@/lib/teacher/types'

export type PrintItem = {
  /** 1-based, as printed. */
  number: number
  item_id: string
  kind: AssignmentItem['item_type']
  /** '9709/12 · May/June 2024 · Q3' for the scheme citation; null for a prompt. */
  reference: string | null
  marks: number | null
  /** The question as the student reads it; null when the bank has no text. */
  text: string | null
  topic_code: string | null
}

export type AssignmentPrintModel = {
  title: string
  class_name: string
  subject_code: string
  due_at: string | null
  instructions: string | null
  is_mock: boolean
  timed_minutes: number | null
  items: PrintItem[]
  /** Sum of the items' marks, or null when any item's total is unknown. */
  total_marks: number | null
  /** 'ABC-123', or null when the class has no code. */
  join_code: string | null
  /** '/join/ABC123', relative so the sheet can prefix its own origin. */
  join_path: string | null
}

/** '9709/12 · May/June 2024 · Q3', '9709/12 · May/June 2024', or null. */
export function itemReference(
  item: Pick<AssignmentItem, 'item_type' | 'paper_code' | 'paper_session' | 'question_number'>
): string | null {
  if (item.item_type === 'prompt') return null
  const parts = [item.paper_code, item.paper_session]
  if (item.item_type === 'past_paper_question' && item.question_number) parts.push(`Q${item.question_number}`)
  const shown = parts.filter((p): p is string => !!p && p.trim() !== '')
  return shown.length ? shown.join(' · ') : null
}

function itemText(item: AssignmentItem, questionTexts: ReadonlyMap<string, string | null>): string | null {
  switch (item.item_type) {
    case 'prompt':
      return item.prompt_text?.trim() || null
    case 'whole_paper':
      return item.paper_code && item.paper_session
        ? `Answer every question on ${item.paper_code} (${item.paper_session}).`
        : null
    case 'past_paper_question': {
      const text = item.mark_scheme_id ? questionTexts.get(item.mark_scheme_id) : null
      return text?.trim() || null
    }
  }
}

export function buildAssignmentPrintModel(input: {
  assignment: Pick<Assignment, 'title' | 'subject_code' | 'due_at' | 'instructions' | 'is_mock' | 'settings'>
  classroom: { name: string; invite_code: string | null }
  items: readonly AssignmentItem[]
  /** mark_schemes.id → question_text, for past-paper items. */
  questionTexts: ReadonlyMap<string, string | null>
}): AssignmentPrintModel {
  const items = [...input.items].sort((a, b) => a.position - b.position)
  const printed: PrintItem[] = items.map((item, i) => ({
    number: i + 1,
    item_id: item.id,
    kind: item.item_type,
    reference: itemReference(item),
    marks: typeof item.total_marks === 'number' && Number.isFinite(item.total_marks) ? item.total_marks : null,
    text: itemText(item, input.questionTexts),
    topic_code: item.topic_code,
  }))
  const marks = printed.map((p) => p.marks)
  const total =
    printed.length > 0 && marks.every((m): m is number => m !== null) ? marks.reduce((a, b) => a + b, 0) : null
  // Legacy 8-hex codes are still valid; anything unparseable is left off the sheet.
  const code = parseInviteCode(input.classroom.invite_code)
  const timed = input.assignment.settings?.timed_minutes

  return {
    title: input.assignment.title,
    class_name: input.classroom.name,
    subject_code: input.assignment.subject_code,
    due_at: input.assignment.due_at,
    instructions: input.assignment.instructions?.trim() || null,
    is_mock: input.assignment.is_mock,
    timed_minutes: typeof timed === 'number' && timed > 0 ? timed : null,
    items: printed,
    total_marks: total,
    join_code: code ? formatInviteCode(code) : null,
    join_path: code ? `/join/${code}` : null,
  }
}
