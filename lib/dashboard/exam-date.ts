/** Suggested default exam dates for onboarding (Cambridge session clusters). */
export function suggestedExamDates(): { label: string; value: string }[] {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  const mayYear = month >= 10 ? year + 1 : year
  const novYear = month >= 5 && month < 10 ? year : month >= 10 ? year + 1 : year

  return [
    { label: `May/June ${mayYear}`, value: `${mayYear}-06-15` },
    { label: `Oct/Nov ${novYear}`, value: `${novYear}-11-15` },
  ]
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
