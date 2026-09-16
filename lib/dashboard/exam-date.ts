/**
 * The next two Cambridge session clusters, in order, never one that has
 * passed. (In September 2026 this offered "May/June 2026" — a session three
 * months gone — on onboarding, settings and the plan builder alike.)
 */
export function suggestedExamDates(now = new Date()): { label: string; value: string }[] {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const today = `${y}-${m}-${d}`

  const candidates: { label: string; value: string }[] = []
  for (const yr of [y, y + 1]) {
    candidates.push({ label: `May/June ${yr}`, value: `${yr}-06-15` })
    candidates.push({ label: `Oct/Nov ${yr}`, value: `${yr}-11-15` })
  }
  return candidates.filter((c) => c.value > today).slice(0, 2)
}

export type ExamCountdown =
  | { kind: 'none' }
  | { kind: 'past'; daysAgo: number }
  | { kind: 'future'; daysLeft: number }

export function examCountdown(examDate: string | null | undefined): ExamCountdown {
  if (!examDate) return { kind: 'none' }

  const target = new Date(`${examDate}T00:00:00Z`)
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  const diffMs = target.getTime() - today.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return { kind: 'past', daysAgo: Math.abs(diffDays) }
  return { kind: 'future', daysLeft: diffDays }
}

export function timeGreeting(firstName: string): string {
  const name = firstName || 'student'
  const hour = new Date().getHours()
  if (hour < 12) return `Good morning, ${name}`
  if (hour < 17) return `Good afternoon, ${name}`
  return `Good evening, ${name}`
}

/** Contextual encouragement copy keyed to days remaining. */
export function examEncouragement(daysLeft: number): string {
  if (daysLeft <= 0) return "Today is the day. You've got this."
  if (daysLeft <= 3) return 'Almost there. Stay calm.'
  if (daysLeft <= 7) return 'Final week. Make it count.'
  if (daysLeft <= 14) return 'Two weeks out. Trust your prep.'
  if (daysLeft <= 30) return 'The home stretch. Stay consistent.'
  return 'Plenty of time. Steady wins.'
}

/** Derive session label from exam date (e.g. "May/June session"). */
export function examSessionLabel(examDate: string): string {
  const month = new Date(`${examDate}T00:00:00Z`).getUTCMonth()
  if (month >= 4 && month <= 6) return 'May/June session'
  if (month >= 9 && month <= 11) return 'Oct/Nov session'
  if (month === 2 || month === 3) return 'March session'
  return 'exam session'
}
