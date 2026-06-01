import { getSubjectColor } from '@/lib/design-system/subject-colors'

export type ConstellationAttemptInput = {
  id: string
  created_at: string
  marks_earned: number
  total_marks: number
  subjectCode: string | null
  label: string
}

export type ConstellationNode = {
  id: string
  attemptId: string
  x: number
  y: number
  size: number
  color: string
  opacity: number
  percentage: number
  label: string
  subjectCode: string | null
  isToday: boolean
  weekKey: string
  dayIndex: number
}

export type ConstellationEdge = {
  x1: number
  y1: number
  x2: number
  y2: number
}

export type ConstellationLayout = {
  nodes: ConstellationNode[]
  edges: ConstellationEdge[]
  hasTodayAttempt: boolean
  width: number
  height: number
}

const DAY_WIDTH = 28
const HEIGHT = 120
const MAX_NODES = 80

function utcDayStart(iso: string): number {
  const d = new Date(iso)
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

function isoWeekKey(iso: string): string {
  const d = new Date(iso)
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1)
  const week = Math.ceil(((d.getTime() - yearStart) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${week}`
}

function hashJitter(id: string, salt: number): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return ((h + salt) % 100) / 100
}

export function buildConstellation(
  attempts: ConstellationAttemptInput[]
): ConstellationLayout {
  const todayStart = utcDayStart(new Date().toISOString())
  const windowStart = todayStart - 29 * 86400000

  const inWindow = attempts
    .filter((a) => utcDayStart(a.created_at) >= windowStart)
    .sort((a, b) => utcDayStart(a.created_at) - utcDayStart(b.created_at))

  const capped =
    inWindow.length > MAX_NODES
      ? [...inWindow.slice(0, MAX_NODES / 2), ...inWindow.slice(-MAX_NODES / 2)]
      : inWindow

  const byDay = new Map<number, ConstellationAttemptInput[]>()
  for (const a of capped) {
    const day = utcDayStart(a.created_at)
    const list = byDay.get(day) ?? []
    list.push(a)
    byDay.set(day, list)
  }

  const nodes: ConstellationNode[] = []
  let hasTodayAttempt = false

  for (const [dayTs, dayAttempts] of byDay) {
    const dayIndex = Math.round((dayTs - windowStart) / 86400000)
    const isToday = dayTs === todayStart
    if (isToday) hasTodayAttempt = true

    dayAttempts.forEach((a, i) => {
      const pct =
        a.total_marks > 0
          ? Math.round((a.marks_earned / a.total_marks) * 100)
          : 0
      const recent = dayIndex >= 23
      const baseSize = recent ? 10 : 8
      const size =
        isToday && i === dayAttempts.length - 1
          ? 12
          : baseSize * (recent ? 1.2 : 1)
      const jitterY = (hashJitter(a.id, i) - 0.5) * 36
      const stackY = (i - (dayAttempts.length - 1) / 2) * 14

      nodes.push({
        id: a.id,
        attemptId: a.id,
        x: 24 + dayIndex * DAY_WIDTH,
        y: HEIGHT / 2 + jitterY + stackY,
        size,
        color: getSubjectColor(a.subjectCode),
        opacity: 0.35 + (pct / 100) * 0.65,
        percentage: pct,
        label: a.label,
        subjectCode: a.subjectCode,
        isToday: isToday && i === dayAttempts.length - 1,
        weekKey: isoWeekKey(a.created_at),
        dayIndex,
      })
    })
  }

  const edges: ConstellationEdge[] = []
  const byWeek = new Map<string, ConstellationNode[]>()
  for (const n of nodes) {
    const list = byWeek.get(n.weekKey) ?? []
    list.push(n)
    byWeek.set(n.weekKey, list)
  }

  for (const weekNodes of byWeek.values()) {
    const sorted = [...weekNodes].sort((a, b) => a.x - b.x)
    for (let i = 0; i < sorted.length - 1; i++) {
      edges.push({
        x1: sorted[i].x,
        y1: sorted[i].y,
        x2: sorted[i + 1].x,
        y2: sorted[i + 1].y,
      })
    }
  }

  return {
    nodes,
    edges,
    hasTodayAttempt,
    width: 24 + 29 * DAY_WIDTH + 24,
    height: HEIGHT,
  }
}

/** Static preview nodes for empty state. */
export function previewConstellationNodes(): ConstellationNode[] {
  const colors = ['#60a5fa', '#34d399', '#fbbf24', '#a78bfa', '#f472b6']
  return [
    { id: 'p0', attemptId: '', x: 40, y: 58, size: 8, color: colors[0], opacity: 0.25, percentage: 0, label: '', subjectCode: null, isToday: false, weekKey: 'p', dayIndex: 0 },
    { id: 'p1', attemptId: '', x: 68, y: 44, size: 7, color: colors[1], opacity: 0.2, percentage: 0, label: '', subjectCode: null, isToday: false, weekKey: 'p', dayIndex: 1 },
    { id: 'p2', attemptId: '', x: 96, y: 62, size: 9, color: colors[2], opacity: 0.22, percentage: 0, label: '', subjectCode: null, isToday: false, weekKey: 'p', dayIndex: 2 },
    { id: 'p3', attemptId: '', x: 124, y: 50, size: 7, color: colors[3], opacity: 0.18, percentage: 0, label: '', subjectCode: null, isToday: false, weekKey: 'p', dayIndex: 3 },
    { id: 'p4', attemptId: '', x: 152, y: 56, size: 8, color: colors[4], opacity: 0.2, percentage: 0, label: '', subjectCode: null, isToday: false, weekKey: 'p', dayIndex: 4 },
  ]
}
