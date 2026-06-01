import type { JournalAttemptInput } from '@/lib/dashboard/journal-data'
import { hashSeed } from './simplex-noise'

export type Attractor = { x: number; y: number; strength: number }

export type MappedParticle = {
  startX: number
  startY: number
  scorePct: number
  recencyWeight: number
  ageIndex: number
  hourBias: number
}

export type FlowFieldParams = {
  seed: number
  particles: MappedParticle[]
  attractors: Attractor[]
  scoreTrend: number
  presentEdgeSatMult: number
  pastEdgeSatMult: number
  previewOnly: boolean
}

export function recencyWeight(iso: string, now = Date.now()): number {
  const days = (now - new Date(iso).getTime()) / 86400000
  if (days <= 7) return 1.0
  if (days <= 30) return 0.7
  if (days <= 90) return 0.4
  if (days <= 180) return 0.2
  return 0.1
}

function tagHash(tag: string): number {
  let h = 0
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) | 0
  return Math.abs(h)
}

function computeScoreTrend(
  attempts: { scorePct: number; w: number }[]
): number {
  if (attempts.length < 2) return 0
  const n = attempts.length
  let sumW = 0
  let sumWX = 0
  let sumWY = 0
  let sumWXX = 0
  let sumWXY = 0
  for (let i = 0; i < n; i++) {
    const x = i / (n - 1)
    const y = attempts[i].scorePct / 100
    const w = attempts[i].w
    sumW += w
    sumWX += w * x
    sumWY += w * y
    sumWXX += w * x * x
    sumWXY += w * x * y
  }
  const denom = sumW * sumWXX - sumWX * sumWX
  if (Math.abs(denom) < 1e-6) return 0
  const slope = (sumW * sumWXY - sumWX * sumWY) / denom
  return Math.max(-1, Math.min(1, slope * 4))
}

export function mapAttemptsToFlowParams(
  userId: string,
  subjectCode: string,
  attempts: JournalAttemptInput[],
  previewOnly = false
): FlowFieldParams {
  const seed = hashSeed(userId, subjectCode)
  if (previewOnly || attempts.length === 0) {
    return {
      seed,
      particles: [],
      attractors: [],
      scoreTrend: 0,
      presentEdgeSatMult: 1,
      pastEdgeSatMult: 1,
      previewOnly: true,
    }
  }

  const chronological = [...attempts].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  const trendInputs = chronological.map((a) => ({
    scorePct:
      a.total_marks > 0 ? Math.round((a.marks_earned / a.total_marks) * 100) : 0,
    w: recencyWeight(a.created_at),
  }))
  const scoreTrend = computeScoreTrend(trendInputs)
  const presentEdgeSatMult = 1 + 0.35 * scoreTrend
  const pastEdgeSatMult = 1 - 0.15 * Math.max(0, scoreTrend)

  const tagSet = new Map<string, number>()
  for (const a of chronological) {
    for (const t of a.syllabus_tags ?? []) {
      tagSet.set(t, (tagSet.get(t) ?? 0) + 1)
    }
  }
  const attractors: Attractor[] = [...tagSet.keys()].slice(0, 12).map((tag) => {
    const h = tagHash(tag)
    return {
      x: (h % 1000) / 1000,
      y: ((h / 1000) % 1000) / 1000,
      strength: 0.3 + Math.min(0.5, (tagSet.get(tag) ?? 1) * 0.08),
    }
  })

  const particles: MappedParticle[] = chronological.map((a, ageIndex) => {
    const w = recencyWeight(a.created_at)
    const t = ageIndex / Math.max(1, chronological.length - 1)
    const startX = 0.08 + t * 0.84
    const startY = 0.15 + ((ageIndex * 37 + seed) % 100) / 100 * 0.7
    const hour = new Date(a.created_at).getUTCHours()
    const hourBias = hour < 12 ? 0.26 : hour >= 18 ? -0.26 : 0
    return {
      startX,
      startY,
      scorePct:
        a.total_marks > 0 ? Math.round((a.marks_earned / a.total_marks) * 100) : 50,
      recencyWeight: w,
      ageIndex,
      hourBias,
    }
  })

  return {
    seed,
    particles,
    attractors,
    scoreTrend,
    presentEdgeSatMult,
    pastEdgeSatMult,
    previewOnly: false,
  }
}
