/**
 * Layout for the grade risk matrix (components/teacher/GradeRiskMatrix.tsx;
 * docs/TEACHER_SYSTEM_SPEC.md §4: "SVG, untimed hollow + labelled, jitter,
 * dots are links").
 *
 * One point per student with marked work: accuracy up the page, pace across
 * it (faster to the right). Coordinates are percentages of the drawing area,
 * because the SVG is drawn without a viewBox — shapes are placed in % while
 * text and marker sizes stay in CSS pixels, so the chart is legible at 360px
 * and at desk width alike.
 *
 * Two honesty rules shape the layout:
 *
 *   - A student with no timed work has no pace. They are never placed at a
 *     made-up one: they sit in their own labelled "Untimed" lane, drawn
 *     hollow, at their real accuracy.
 *   - With fewer timed students than the class median needs (the divider is
 *     null — see paceDivider in lib/teacher-analytics.ts), "faster than the
 *     class" means nothing, so the chart drops the pace axis altogether and
 *     places everyone by accuracy only.
 *
 * Jitter is deterministic (a hash of the student id), so a dot does not
 * wander between renders and two students with the same figures do not sit
 * exactly on top of each other. It is horizontal only: the vertical position
 * is the student's real accuracy.
 *
 * Pure; no React and no syllabus registry, so it is cheap to test and safe
 * anywhere. The divider and the accuracy threshold are passed in by the
 * server component, which reads them from lib/teacher-analytics.ts — the one
 * place those rules live.
 */

import type { Quadrant, StudentQuadrantMetric } from '@/lib/teacher-analytics'

export type RiskMode = 'pace' | 'accuracy_only'

/** The drawing area, in % of the SVG: room at the edges for markers and labels. */
export const PLOT = { top: 7, bottom: 93, left: 2, right: 98 } as const
/** The untimed lane on the left, when anyone is untimed (pace mode only). */
export const UNTIMED_LANE = { left: 2, right: 16 } as const
/** Gap between the lane and the timed area. */
const LANE_GAP = 3
/** Inset inside the timed area so the fastest and slowest dots are not on its edge. */
const PACE_INSET = 5
/** Horizontal jitter, in %: small in pace mode (pace is the position), wider without it. */
const PACE_JITTER = 1.5
const ACCURACY_ONLY_SPREAD = 22

export const QUADRANT_META: Record<Quadrant, { label: string; stamp: string; meaning: string }> = {
  safe: { label: 'Safe zone', stamp: 'OK', meaning: 'accurate, and not slow' },
  pacing_risk: { label: 'Pacing risk', stamp: 'PAC', meaning: 'accurate, but slower than the class' },
  careless_risk: { label: 'Careless risk', stamp: 'CAR', meaning: 'quick, but dropping marks' },
  under_prepared: { label: 'Under-prepared', stamp: 'UP', meaning: 'dropping marks' },
}

/** Most at risk first — the order a teacher reads the table in. */
export const RISK_ORDER: readonly Quadrant[] = ['under_prepared', 'careless_risk', 'pacing_risk', 'safe']

export type RiskPoint = {
  id: string
  /** Full name, for the teacher's own screen (never a prompt). */
  name: string
  quadrant: Quadrant
  timed: boolean
  /** 0–100, clamped. */
  accuracy: number
  minutesPerMark: number | null
  x: number
  y: number
  predictedGrade: string
  attemptCount: number
  deficit: StudentQuadrantMetric['biggestDeficit']
}

export type RiskRegion = {
  quadrant: Quadrant
  x: number
  y: number
  width: number
  height: number
}

export type RiskLayout = {
  mode: RiskMode
  /** Paint order: the safe zone first, the most at-risk last (drawn on top). */
  points: RiskPoint[]
  /** Background regions of the timed area (or of the whole plot without a pace axis). */
  regions: RiskRegion[]
  threshold: number
  /** y (%) of the accuracy threshold line. */
  thresholdY: number
  /** The class-median pace line; null without a pace axis. */
  divider: { x: number; minutes: number } | null
  timedArea: { left: number; right: number }
  untimedLane: { left: number; right: number } | null
  paceRange: { fastest: number; slowest: number } | null
  counts: Record<Quadrant, number>
  timedCount: number
  untimedCount: number
}

// ---------------------------------------------------------------------------
// Small pieces
// ---------------------------------------------------------------------------

/** A stable number in [0, 1) from a string (FNV-1a). */
export function hashUnit(value: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0) / 0x1_0000_0000
}

/** A stable offset in [-spread, spread] for `id`. */
export function jitter(id: string, spread: number): number {
  if (!(spread > 0)) return 0
  return (hashUnit(id) * 2 - 1) * spread
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n))
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function isTimed(minutes: number | null | undefined): minutes is number {
  return typeof minutes === 'number' && Number.isFinite(minutes) && minutes > 0
}

/** Accuracy (0–100) → y (%): 100% at the top of the plot, 0% at the bottom. */
export function accuracyToY(accuracy: number): number {
  const a = clamp(Number.isFinite(accuracy) ? accuracy : 0, 0, 100)
  return round2(PLOT.top + (1 - a / 100) * (PLOT.bottom - PLOT.top))
}

/**
 * Minutes per mark → x (%) inside [left, right], faster to the right. Log
 * scale: pace is a ratio ("twice as slow"), and one very slow student would
 * otherwise squash the rest of the class against the right edge.
 */
export function paceToX(
  minutes: number,
  range: { fastest: number; slowest: number },
  area: { left: number; right: number }
): number {
  const left = area.left + PACE_INSET
  const right = area.right - PACE_INSET
  if (!(range.slowest > range.fastest)) return round2((left + right) / 2)
  const lo = Math.log(range.fastest)
  const hi = Math.log(range.slowest)
  const t = clamp((Math.log(clamp(minutes, range.fastest, range.slowest)) - lo) / (hi - lo), 0, 1)
  // t = 0 is the fastest (right edge), t = 1 the slowest (left edge).
  return round2(right - t * (right - left))
}

/** "1.4 min per mark", or "untimed". */
export function formatPace(minutes: number | null | undefined): string {
  if (!isTimed(minutes)) return 'untimed'
  return `${minutes < 10 ? minutes.toFixed(1) : Math.round(minutes)} min per mark`
}

/** What a screen reader hears for one dot — every fact the tooltip shows. */
export function pointLabel(p: Pick<RiskPoint, 'name' | 'accuracy' | 'minutesPerMark' | 'predictedGrade' | 'quadrant' | 'deficit' | 'attemptCount'>): string {
  const parts = [
    `${p.name}: ${Math.round(p.accuracy)}% accuracy`,
    formatPace(p.minutesPerMark),
    `${p.attemptCount} marked ${p.attemptCount === 1 ? 'script' : 'scripts'}`,
  ]
  if (p.predictedGrade && p.predictedGrade !== '—') parts.push(`predicted ${p.predictedGrade}`)
  parts.push(QUADRANT_META[p.quadrant].label.toLowerCase())
  if (p.deficit) parts.push(`weakest on ${p.deficit.name} at ${Math.round(p.deficit.percentage)}%`)
  return parts.join(', ')
}

// ---------------------------------------------------------------------------
// The layout
// ---------------------------------------------------------------------------

function emptyCounts(): Record<Quadrant, number> {
  return { safe: 0, pacing_risk: 0, careless_risk: 0, under_prepared: 0 }
}

/**
 * Places every student. `divider` is the class-median minutes per mark
 * (paceDivider) or null; `threshold` the accuracy that counts as accurate
 * (QUADRANT_ACCURACY_THRESHOLD). The quadrant each student is coloured by is
 * the one lib/teacher-analytics computed — the layout never re-decides it.
 */
export function layoutRiskMatrix(
  students: readonly StudentQuadrantMetric[],
  opts: { divider: number | null; threshold: number }
): RiskLayout {
  const threshold = clamp(Number.isFinite(opts.threshold) ? opts.threshold : 75, 0, 100)
  const thresholdY = accuracyToY(threshold)
  const timed = students.filter((s) => isTimed(s.timePerMark))
  const untimedCount = students.length - timed.length
  const divider = isTimed(opts.divider) && timed.length > 0 ? opts.divider : null
  const mode: RiskMode = divider === null ? 'accuracy_only' : 'pace'

  const counts = emptyCounts()
  for (const s of students) counts[s.quadrant] += 1

  const untimedLane = mode === 'pace' && untimedCount > 0 ? { ...UNTIMED_LANE } : null
  const timedArea = {
    left: untimedLane ? untimedLane.right + LANE_GAP : PLOT.left,
    right: PLOT.right,
  }

  let paceRange: RiskLayout['paceRange'] = null
  if (mode === 'pace') {
    let fastest = Infinity
    let slowest = -Infinity
    for (const s of timed) {
      fastest = Math.min(fastest, s.timePerMark as number)
      slowest = Math.max(slowest, s.timePerMark as number)
    }
    // The divider is a class median, so it lies inside the range; widen for safety.
    paceRange = { fastest: Math.min(fastest, divider as number), slowest: Math.max(slowest, divider as number) }
  }

  const points: RiskPoint[] = students.map((s) => {
    const accuracy = clamp(Number.isFinite(s.accuracy) ? s.accuracy : 0, 0, 100)
    const timedStudent = isTimed(s.timePerMark)
    let x: number
    if (mode === 'pace' && timedStudent && paceRange) {
      x = paceToX(s.timePerMark as number, paceRange, timedArea) + jitter(s.studentId, PACE_JITTER)
    } else if (mode === 'pace' && untimedLane) {
      const mid = (untimedLane.left + untimedLane.right) / 2
      x = mid + jitter(s.studentId, (untimedLane.right - untimedLane.left) / 2 - 2)
    } else {
      x = (PLOT.left + PLOT.right) / 2 + jitter(s.studentId, ACCURACY_ONLY_SPREAD)
    }
    return {
      id: s.studentId,
      name: s.name,
      quadrant: s.quadrant,
      timed: timedStudent,
      accuracy,
      minutesPerMark: timedStudent ? (s.timePerMark as number) : null,
      x: round2(clamp(x, PLOT.left, PLOT.right)),
      y: accuracyToY(accuracy),
      predictedGrade: s.predictedGrade,
      attemptCount: s.attemptCount,
      deficit: s.biggestDeficit,
    }
  })

  const rank = (q: Quadrant) => RISK_ORDER.length - 1 - RISK_ORDER.indexOf(q)
  points.sort(
    (a, b) =>
      rank(a.quadrant) - rank(b.quadrant) ||
      b.accuracy - a.accuracy ||
      a.name.localeCompare(b.name) ||
      a.id.localeCompare(b.id)
  )

  const top = PLOT.top
  const bottom = PLOT.bottom
  const regions: RiskRegion[] = []
  const dividerX = divider !== null && paceRange ? paceToX(divider, paceRange, timedArea) : null
  if (dividerX === null) {
    regions.push({ quadrant: 'safe', x: timedArea.left, y: top, width: timedArea.right - timedArea.left, height: thresholdY - top })
    regions.push({
      quadrant: 'under_prepared',
      x: timedArea.left,
      y: thresholdY,
      width: timedArea.right - timedArea.left,
      height: bottom - thresholdY,
    })
  } else {
    const slowW = dividerX - timedArea.left
    const fastW = timedArea.right - dividerX
    regions.push({ quadrant: 'pacing_risk', x: timedArea.left, y: top, width: slowW, height: thresholdY - top })
    regions.push({ quadrant: 'safe', x: dividerX, y: top, width: fastW, height: thresholdY - top })
    regions.push({ quadrant: 'under_prepared', x: timedArea.left, y: thresholdY, width: slowW, height: bottom - thresholdY })
    regions.push({ quadrant: 'careless_risk', x: dividerX, y: thresholdY, width: fastW, height: bottom - thresholdY })
  }

  return {
    mode,
    points,
    regions: regions.map((r) => ({
      ...r,
      x: round2(r.x),
      y: round2(r.y),
      width: round2(Math.max(0, r.width)),
      height: round2(Math.max(0, r.height)),
    })),
    threshold,
    thresholdY,
    divider: dividerX === null ? null : { x: dividerX, minutes: divider as number },
    timedArea,
    untimedLane,
    paceRange,
    counts,
    timedCount: timed.length,
    untimedCount,
  }
}

/** Students for the table view: most at risk first, then lowest accuracy. */
export function riskTableOrder<T extends Pick<RiskPoint, 'quadrant' | 'accuracy' | 'name' | 'id'>>(points: readonly T[]): T[] {
  return [...points].sort(
    (a, b) =>
      RISK_ORDER.indexOf(a.quadrant) - RISK_ORDER.indexOf(b.quadrant) ||
      a.accuracy - b.accuracy ||
      a.name.localeCompare(b.name) ||
      a.id.localeCompare(b.id)
  )
}
