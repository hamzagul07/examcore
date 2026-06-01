import type { AttemptWithPaper } from '@/lib/syllabi/attempts'
import { getSubjectByCode } from '@/lib/profile-options'
import { getAttemptSubjectCode } from '@/lib/syllabi/attempts'

export type JournalAttemptInput = AttemptWithPaper & {
  id: string
  created_at: string
  marks_earned: number
  total_marks: number
  syllabus_tags?: string[] | null
}

export type JournalSubjectPage = {
  subjectCode: string
  subjectLabel: string
  attempts: JournalAttemptInput[]
  attemptCount: number
  latestAttemptId: string
}

const MAX_ATTEMPTS_PER_SUBJECT = 200

/** Group all attempts by subject; cap at 200 most recent per subject. */
export function buildJournalPages(rows: JournalAttemptInput[]): JournalSubjectPage[] {
  const bySubject = new Map<string, JournalAttemptInput[]>()

  for (const row of rows) {
    const code = getAttemptSubjectCode(row)
    if (!code) continue
    const list = bySubject.get(code) ?? []
    list.push(row)
    bySubject.set(code, list)
  }

  const pages: JournalSubjectPage[] = []

  for (const [subjectCode, attempts] of bySubject) {
    const sorted = [...attempts].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    const capped = sorted.slice(0, MAX_ATTEMPTS_PER_SUBJECT)
    const meta = getSubjectByCode(subjectCode)
    pages.push({
      subjectCode,
      subjectLabel: meta?.label ?? subjectCode,
      attempts: capped,
      attemptCount: capped.length,
      latestAttemptId: capped[0]?.id ?? '',
    })
  }

  return pages.sort((a, b) => a.subjectLabel.localeCompare(b.subjectLabel))
}

export function journalCacheKey(
  userId: string,
  subjectCode: string,
  attemptCount: number,
  latestAttemptId: string
): string {
  return `ec-journal-art:${userId}:${subjectCode}:${attemptCount}:${latestAttemptId}`
}
