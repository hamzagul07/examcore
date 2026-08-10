/**
 * Assembles Max Resource Vault sections from the student's profile subjects.
 * Every subject on their profile gets a shelf; the focus subject gets the full
 * sprint pack + projected grade.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  calculateParentMastery,
  flattenLeafMasteries,
  type AttemptLite,
  type LeafMastery,
} from '@/lib/mastery'
import { getCuratedMaxPack, type CuratedMaxPack } from '@/lib/max/curated-packs'
import type { MaxExamPack } from '@/lib/max/build-exam-pack'
import { getCachedMaxExamPack } from '@/lib/max/exam-pack-cache'
import { getTechniquePack, type TechniquePack } from '@/lib/max/technique-packs'
import { IB_GLOBAL_RESOURCES, getIbSubjectResources } from '@/lib/ib/resources'
import { isIbSubjectCode } from '@/lib/ib/marking-config'
import { predictGrade, type GradePrediction } from '@/lib/prediction'
import { gapToTargetGrade } from '@/lib/target-grade'
import { getSyllabusByCode, getSyllabusSubjectName, hasSyllabusTree } from '@/lib/syllabi'
import { getAttemptSubjectCode, type AttemptWithPaper } from '@/lib/syllabi/attempts'
import {
  fetchTopicRecommendations,
  topicTargetsFromMasteries,
} from '@/lib/insights/recommendations'
import type { Recommendation } from '@/lib/insights/types'
import {
  buildVaultCommunityHooks,
  buildVaultCourseLessons,
  buildVaultDiagramPads,
  type VaultCommunityHook,
  type VaultCourseLesson,
  type VaultDiagramPad,
} from '@/lib/max/vault-exclusives'
import { isCommunityEnabled } from '@/lib/community/enabled'
import { loadCompletedPackDays } from '@/lib/max/sprint-day-completion'
import {
  buildVaultCoachInbox,
  type VaultCoachWeek,
} from '@/lib/max/vault-coach-inbox'
import { drillHref } from '@/lib/insights/drill-link'

export type VaultToolLink = { label: string; href: string; note: string }

export type VaultOwnership = {
  marksUsed: number
  marksRemaining: number
  marksCap: number
  credits: number
  priorityMarking: boolean
  weeklyCoach: boolean
}

export type FullMarksModel = {
  attemptId: string
  label: string
  marksEarned: number
  totalMarks: number
  createdAt: string
  subjectCode: string | null
  /** Truncated full-marks rewrite for inline Vault preview. */
  rewriteSnippet: string | null
  annotationCount: number
  /** Rematch fields when attempt came from a past-paper mark_scheme. */
  paperCode: string | null
  paperSession: string | null
  questionNumber: string | null
  beatHref: string | null
}

export type MaxProjectedGrade = {
  prediction: GradePrediction
  targetGrade: string | null
  pointsToTarget: number | null
  onTrack: boolean
}

/** One subject on the student's profile — its own resource shelf. */
export type MaxSubjectShelf = {
  code: string
  name: string
  attemptCount: number
  avgPct: number | null
  isFocus: boolean
  curated: CuratedMaxPack | null
  technique: TechniquePack | null
  /** Top weak-topic drills for this subject (when they have mastery). */
  drills: Recommendation[]
  links: VaultToolLink[]
  ibLinks: VaultToolLink[]
}

export type MaxVaultData = {
  /** Focus subject (weakest with data, or profile primary, or ?subject=). */
  subjectCode: string | null
  subjectName: string | null
  shelves: MaxSubjectShelf[]
  examPack: MaxExamPack | null
  curated: CuratedMaxPack | null
  technique: TechniquePack | null
  projected: MaxProjectedGrade | null
  tools: VaultToolLink[]
  ibLinks: VaultToolLink[]
  fullMarksModels: FullMarksModel[]
  sprintUnlocked: boolean
  otherCuratedCodes: string[]
  /** Platform-owned course lessons for weak topics (not outbound blogs). */
  courseLessons: VaultCourseLesson[]
  /** Live MarkScheme diagrams for weak / showcase topics. */
  diagramPads: VaultDiagramPad[]
  /** Pre-filled Exam Room asks for weak topics (when community is on). */
  communityHooks: VaultCommunityHook[]
  /** Max ownership theatre — headroom, priority, coach. */
  ownership: VaultOwnership | null
  /** Completed day numbers for the current pack (checklist). */
  completedDays: number[]
  /** Recomputed weekly coach snapshots (Max ritual). */
  coachInbox: VaultCoachWeek[]
}

export type VaultSubjectInput = {
  code: string
  name: string
}

const BASE_TOOLS: VaultToolLink[] = [
  {
    label: 'Will my grade hold?',
    href: '/tools/will-my-grade-hold',
    note: 'Stress-test a raw mark against published thresholds.',
  },
  {
    label: 'Exam countdown',
    href: '/tools/exam-countdown',
    note: 'See days left and pace your Max sprint.',
  },
  {
    label: 'Command words',
    href: '/tools/command-words',
    note: 'What each exam verb actually demands.',
  },
  {
    label: 'Detailed progress',
    href: '/dashboard/progress',
    note: 'Mastery matrix, journey, and insights.',
  },
]

function subjectLinks(code: string): VaultToolLink[] {
  const links: VaultToolLink[] = [
    {
      label: `${code} courses`,
      href: `/courses/${encodeURIComponent(code)}`,
      note: 'Visual lessons mapped to the syllabus.',
    },
    {
      label: `${code} past papers`,
      href: `/past-papers/${encodeURIComponent(code)}`,
      note: 'Practice hubs on MarkScheme.',
    },
  ]
  if (!isIbSubjectCode(code)) {
    links.push({
      label: 'Grade boundary check',
      href: `/tools/will-my-grade-hold?code=${encodeURIComponent(code)}`,
      note: 'Subject-prefilled threshold stress test.',
    })
  }
  return links
}

function ibLinksForCode(code: string): VaultToolLink[] {
  if (!isIbSubjectCode(code)) return []
  // Profile codes are `ib-{slug}` e.g. ib-biology-hl.
  const slug = code.replace(/^ib-/, '')
  const subjectSpecific = getIbSubjectResources({ slug }).map((r) => ({
    label: r.label,
    href: r.href,
    note: r.note,
  }))
  return [
    ...subjectSpecific,
    ...IB_GLOBAL_RESOURCES.map((r) => ({
      label: r.label,
      href: r.href,
      note: r.note,
    })),
  ]
}

function avgPct(attempts: AttemptLite[]): number | null {
  const valid = attempts.filter((a) => a.total_marks > 0)
  if (!valid.length) return null
  return (
    valid.reduce((s, a) => s + (a.marks_earned / a.total_marks) * 100, 0) /
    valid.length
  )
}

/**
 * Pick focus subject: explicit override (even if not on profile) → weakest with
 * attempts → first with syllabus tree → first on the list.
 */
export function pickFocusSubjectCode(
  subjects: VaultSubjectInput[],
  attempts: AttemptWithPaper[],
  overrideCode?: string | null
): string | null {
  const override = overrideCode?.trim() || null
  if (override) return override

  const withTree = subjects.filter((s) => hasSyllabusTree(s.code))
  if (withTree.length === 0) return subjects[0]?.code ?? null

  let worst: { code: string; pct: number } | null = null
  for (const s of withTree) {
    const subjectAttempts = attempts.filter(
      (a) => getAttemptSubjectCode(a) === s.code
    )
    if (subjectAttempts.length < 2) continue
    const pct = avgPct(subjectAttempts)
    if (pct === null) continue
    if (!worst || pct < worst.pct) worst = { code: s.code, pct }
  }
  if (worst) return worst.code
  return withTree[0]?.code ?? subjects[0]?.code ?? null
}

export async function loadMaxVaultData(opts: {
  supabase: SupabaseClient
  userId: string
  /** All subjects on the student's profile (code + display name). */
  subjects: VaultSubjectInput[]
  /** Optional ?subject= override. */
  focusCode?: string | null
  examDate?: string | null
  targetGrade?: string | null
  /** Recent attempts across subjects (newest first). */
  attempts: AttemptWithPaper[]
  ownership?: VaultOwnership | null
  /** When true, build coach inbox even if ownership summary failed. */
  includeCoachInbox?: boolean
}): Promise<MaxVaultData> {
  const {
    supabase,
    userId,
    subjects,
    focusCode: overrideCode = null,
    examDate,
    targetGrade = null,
    attempts,
    ownership = null,
    includeCoachInbox = false,
  } = opts

  const focusCode = pickFocusSubjectCode(subjects, attempts, overrideCode)
  const focusName =
    subjects.find((s) => s.code === focusCode)?.name ??
    (focusCode ? getSyllabusSubjectName(focusCode) ?? focusCode : null)

  // If ?subject= points at a code not on the profile, still build a shelf for it.
  const shelfSubjects: VaultSubjectInput[] = [...subjects]
  if (focusCode && !shelfSubjects.some((s) => s.code === focusCode)) {
    shelfSubjects.unshift({
      code: focusCode,
      name: getSyllabusSubjectName(focusCode) ?? focusCode,
    })
  }

  const focusAttempts = focusCode
    ? attempts.filter((a) => getAttemptSubjectCode(a) === focusCode)
    : []
  let focusMasteries: LeafMastery[] = []
  if (focusCode && getSyllabusByCode(focusCode)?.length) {
    focusMasteries = flattenLeafMasteries(
      calculateParentMastery(focusAttempts, focusCode)
    )
  }

  const examPack =
    focusCode
      ? await getCachedMaxExamPack({
          supabase,
          userId,
          subjectCode: focusCode,
          masteries: focusMasteries,
          examDate,
        })
      : null

  const curated = getCuratedMaxPack(focusCode)
  const technique = getTechniquePack(focusCode)

  let projected: MaxProjectedGrade | null = null
  if (
    focusCode &&
    !isIbSubjectCode(focusCode) &&
    getSyllabusByCode(focusCode)?.length &&
    focusAttempts.length > 0
  ) {
    const prediction = predictGrade(focusAttempts, focusMasteries)
    const gap =
      prediction.averagePercentage !== null
        ? gapToTargetGrade(prediction.averagePercentage, targetGrade)
        : null
    projected = {
      prediction,
      targetGrade,
      pointsToTarget: gap && !gap.onTrack ? gap.pointsToGo : gap?.onTrack ? 0 : null,
      onTrack: gap?.onTrack ?? false,
    }
  }

  // Build a shelf for every profile subject — not just the focus.
  const shelves: MaxSubjectShelf[] = []
  for (const s of shelfSubjects) {
    const subjectAttempts = attempts.filter(
      (a) => getAttemptSubjectCode(a) === s.code
    )
    let masteries: LeafMastery[] = []
    if (getSyllabusByCode(s.code)?.length) {
      masteries = flattenLeafMasteries(
        calculateParentMastery(subjectAttempts, s.code)
      )
    }
    const weak = topicTargetsFromMasteries(masteries, 3)
    const drills =
      weak.length > 0
        ? await fetchTopicRecommendations(supabase, weak, 3)
        : []

    shelves.push({
      code: s.code,
      name: s.name,
      attemptCount: subjectAttempts.length,
      avgPct: avgPct(subjectAttempts),
      isFocus: s.code === focusCode,
      curated: getCuratedMaxPack(s.code),
      technique: getTechniquePack(s.code),
      drills,
      links: subjectLinks(s.code),
      ibLinks: ibLinksForCode(s.code),
    })
  }

  // Sort: focus first, then by lowest avg (needs most help), then name.
  shelves.sort((a, b) => {
    if (a.isFocus !== b.isFocus) return a.isFocus ? -1 : 1
    const ap = a.avgPct ?? 101
    const bp = b.avgPct ?? 101
    if (ap !== bp) return ap - bp
    return a.name.localeCompare(b.name)
  })

  const tools: VaultToolLink[] = [...BASE_TOOLS]
  if (focusCode) {
    tools.unshift(...subjectLinks(focusCode))
  }

  const ibLinks = focusCode ? ibLinksForCode(focusCode) : []

  const { data: recentAttempts } = await supabase
    .from('attempts')
    .select(
      'id, marks_earned, total_marks, created_at, question_text, source_type, ai_marking, syllabus_tags, mark_schemes ( question_number, paper_code, paper_session )'
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(40)

  const fullMarksModels: FullMarksModel[] = []
  for (const a of recentAttempts ?? []) {
    const ai = a.ai_marking as {
      full_marks_rewrite?: {
        rewritten_answer?: string
        annotations?: Array<{ text: string; earns: string }>
      }
    } | null
    const rewrite = ai?.full_marks_rewrite
    if (!rewrite?.rewritten_answer) continue
    const msRaw = a.mark_schemes as
      | {
          question_number?: string | null
          paper_code?: string | null
          paper_session?: string | null
        }
      | Array<{
          question_number?: string | null
          paper_code?: string | null
          paper_session?: string | null
        }>
      | null
    const ms = Array.isArray(msRaw) ? msRaw[0] ?? null : msRaw
    const paperCode = ms?.paper_code ?? null
    const paperSession = ms?.paper_session ?? null
    const questionNumber = ms?.question_number ?? null
    const label =
      a.source_type === 'past_paper' && paperCode
        ? `Q${questionNumber ?? '?'} — ${paperCode}`
        : `Attempt · ${a.total_marks} marks`
    const snippet = rewrite.rewritten_answer.replace(/\s+/g, ' ').trim().slice(0, 160)
    const beatHref =
      paperCode && paperSession && questionNumber
        ? drillHref(
            {
              paperCode,
              paperSession,
              questionNumber,
              totalMarks: a.total_marks as number,
              reason: 'Beat your full-marks model — remake this question.',
              targetLabel: label,
            },
            'Beat your model',
            { returnTo: 'vault' }
          )
        : null
    fullMarksModels.push({
      attemptId: a.id as string,
      label,
      marksEarned: a.marks_earned as number,
      totalMarks: a.total_marks as number,
      createdAt: a.created_at as string,
      subjectCode: getAttemptSubjectCode(a as AttemptWithPaper),
      rewriteSnippet: snippet || null,
      annotationCount: rewrite.annotations?.length ?? 0,
      paperCode,
      paperSession,
      questionNumber,
      beatHref,
    })
    if (fullMarksModels.length >= 12) break
  }

  const shelfCodes = new Set(subjects.map((s) => s.code))
  const otherCuratedCodes = ['9709', '9702', '9700', '9708', '9618'].filter(
    (c) => !shelfCodes.has(c)
  )

  const weakForFocus = examPack?.weakTopics ?? topicTargetsFromMasteries(focusMasteries, 6)
  const focusDrills = shelves.find((s) => s.isFocus)?.drills ?? []
  const courseLessons = buildVaultCourseLessons(focusCode, weakForFocus, 4)
  const diagramPads = buildVaultDiagramPads(focusCode, courseLessons, focusDrills, 2)
  const communityHooks = buildVaultCommunityHooks(
    focusCode,
    weakForFocus,
    isCommunityEnabled()
  )

  let completedDays: number[] = []
  if (examPack && focusCode) {
    const validDays = new Set(examPack.days.map((d) => d.day))
    const loaded = await loadCompletedPackDays({
      supabase,
      userId,
      subjectCode: focusCode,
      weekLabel: examPack.completionKey || examPack.weekLabel,
    })
    completedDays = loaded.filter((n) => validDays.has(n))
  }

  const coachInbox =
    includeCoachInbox || ownership?.weeklyCoach
      ? buildVaultCoachInbox({
          attempts,
          targetGrade,
          examDate: examDate ?? null,
          weeks: 4,
        })
      : []

  return {
    subjectCode: focusCode,
    subjectName: focusName,
    shelves,
    examPack,
    curated,
    technique,
    projected,
    tools,
    ibLinks,
    fullMarksModels,
    sprintUnlocked: examPack?.isSprint ?? false,
    otherCuratedCodes,
    courseLessons,
    diagramPads,
    communityHooks,
    ownership,
    completedDays,
    coachInbox,
  }
}
