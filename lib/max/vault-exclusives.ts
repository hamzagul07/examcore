/**
 * Max-only Vault exclusives: course lessons + live diagrams for weak topics.
 * Built from platform content users can't assemble themselves.
 */
import 'server-only'

import { makeTopicLessonResolver } from '@/lib/courses/topic-lesson'
import { hasLessonLiveDiagram } from '@/lib/courses/lesson-diagrams'
import { getCourseLesson } from '@/lib/courses'
import { isIbSubjectCode } from '@/lib/ib/marking-config'
import type { TopicTarget } from '@/lib/insights/recommendations'
import type { Recommendation } from '@/lib/insights/types'
import { drillHref } from '@/lib/insights/drill-link'

export type VaultCourseLesson = {
  topicCode: string
  title: string
  href: string
  reason: string
  hasDiagram: boolean
  slug: string
}

export type VaultDiagramPad = {
  topicCode: string
  title: string
  slug: string
  lessonHref: string
  reason: string
  /** Preloaded drill when we have a mark_schemes match for this topic. */
  markHref: string | null
  markLabel: string | null
}

export type VaultCommunityHook = {
  topicName: string
  topicCode: string
  askHref: string
  browseHref: string
  prompt: string
}

/** Fallback showcase lessons when mastery is thin — still MarkScheme-owned. */
const SHOWCASE_LESSON_SLUGS: Record<string, string[]> = {
  '9709': ['1-1-quadratics', '1-7-differentiation', '1-5-trigonometry', '1-8-integration'],
  '9702': [
    '2-1-equations-of-motion',
    '10-3-potential-dividers',
    '14-3-specific-heat-capacity-and-specific-latent-heat',
    '8-1-stationary-waves',
  ],
  '9701': [
    '1-1-particles-in-the-atom-and-atomic-radius',
    '1-3-electrons-energy-levels-and-atomic-orbitals',
    '1-4-ionisation-energy',
  ],
  '9700': [
    '1-2-cells-as-the-basic-units-of-living-organisms',
    '11-1-the-immune-system',
    '12-2-respiration',
  ],
  '9618': ['1-1-data-representation', '3-2-logic-gates-and-logic-circuits', '10-1-data-types-and-records'],
  '9708': [
    '1-1-scarcity-choice-and-opportunity-cost',
    '1-5-production-possibility-curves',
    '2-4-the-interaction-of-demand-and-supply',
    '2-2-price-elasticity-income-elasticity-and-cross-elasticity-of-demand',
    '4-3-aggregate-demand-and-aggregate-supply-analysis',
    '4-2-introduction-to-the-circular-flow-of-income',
  ],
  '9706': [
    '1-1-1-types-of-business-entity',
    '1-4-3-bank-reconciliation-statements',
    '1-6-2-calculation-and-evaluation-of-ratios',
    '2-2-4-cost-volume-profit-analysis',
  ],
}

function slugFromLessonHref(href: string): string {
  const path = href.split('#')[0] ?? href
  const parts = path.split('/').filter(Boolean)
  return parts[parts.length - 1] ?? ''
}

function courseHrefForSlug(subjectCode: string, slug: string): string {
  if (isIbSubjectCode(subjectCode)) {
    return `/ib/courses/${subjectCode.replace(/^ib-/, '')}/${slug}`
  }
  return `/courses/${subjectCode}/${slug}`
}

/**
 * Resolve weak-topic → published course lessons (existence-verified).
 * Falls back to subject showcase lessons so brand-new Max users still see value.
 */
export function buildVaultCourseLessons(
  subjectCode: string | null,
  weakTopics: TopicTarget[],
  limit = 4
): VaultCourseLesson[] {
  if (!subjectCode) return []
  const resolve = makeTopicLessonResolver(subjectCode)
  const out: VaultCourseLesson[] = []
  const seen = new Set<string>()

  for (const t of weakTopics) {
    const resolved = resolve(t.code)
    if (!resolved || seen.has(resolved.href)) continue
    seen.add(resolved.href)
    const slug = slugFromLessonHref(resolved.href)
    out.push({
      topicCode: t.code,
      title: resolved.name,
      href: resolved.href,
      reason: t.reason,
      hasDiagram: slug ? hasLessonLiveDiagram(slug) : false,
      slug,
    })
    if (out.length >= limit) return out
  }

  // Showcase fallback — only when weak-topic path is empty/short.
  if (out.length < 2) {
    const showcases = SHOWCASE_LESSON_SLUGS[subjectCode] ?? []
    for (const slug of showcases) {
      if (isIbSubjectCode(subjectCode)) continue
      const lesson = getCourseLesson(subjectCode, slug)
      if (!lesson) continue
      const href = courseHrefForSlug(subjectCode, slug)
      if (seen.has(href)) continue
      seen.add(href)
      out.push({
        topicCode: lesson.topicCode ?? slug,
        title: lesson.title,
        href,
        reason: 'Max desk pick — open the visual lesson, then mark a real question.',
        hasDiagram: hasLessonLiveDiagram(slug),
        slug,
      })
      if (out.length >= limit) break
    }
  }

  return out
}

/**
 * Live diagram pads for topics that have native MarkScheme SVG diagrams.
 * Prefer weak topics; fall back to showcase with diagrams.
 */
export function buildVaultDiagramPads(
  subjectCode: string | null,
  courseLessons: VaultCourseLesson[],
  drills: Recommendation[],
  limit = 2
): VaultDiagramPad[] {
  if (!subjectCode) return []
  const pads: VaultDiagramPad[] = []

  for (const lesson of courseLessons) {
    if (!lesson.hasDiagram || !lesson.slug) continue
    const drill = drills.find(
      (d) =>
        d.topicCode === lesson.topicCode ||
        d.targetLabel?.toLowerCase().includes(lesson.title.toLowerCase().slice(0, 18))
    )
    pads.push({
      topicCode: lesson.topicCode,
      title: lesson.title,
      slug: lesson.slug,
      lessonHref: lesson.href,
      reason: lesson.reason,
      markHref: drill
        ? drillHref(drill, undefined, { returnTo: 'vault' })
        : null,
      markLabel: drill
        ? `${drill.paperCode} Q${drill.questionNumber}`
        : null,
    })
    if (pads.length >= limit) break
  }

  if (pads.length >= limit) return pads

  // Extra showcase diagrams not already included.
  const showcases = SHOWCASE_LESSON_SLUGS[subjectCode] ?? []
  const used = new Set(pads.map((p) => p.slug))
  for (const slug of showcases) {
    if (used.has(slug) || !hasLessonLiveDiagram(slug)) continue
    if (isIbSubjectCode(subjectCode)) continue
    const lesson = getCourseLesson(subjectCode, slug)
    if (!lesson) continue
    pads.push({
      topicCode: lesson.topicCode ?? slug,
      title: lesson.title,
      slug,
      lessonHref: courseHrefForSlug(subjectCode, slug),
      reason: 'Interactive diagram only Max desks surface next to your mark path.',
      markHref: null,
      markLabel: null,
    })
    if (pads.length >= limit) break
  }

  return pads
}

function communityAskTitle(subjectCode: string, topicName: string, topicCode: string): string {
  if (subjectCode === '9708') {
    return `Stuck on ${topicName} (${topicCode}) — how do examiners mark diagrams and evaluation?`
  }
  if (subjectCode === '9706') {
    return `Stuck on ${topicName} (${topicCode}) — what layout and evaluation do examiners want?`
  }
  if (subjectCode === '9709' || subjectCode === '9231') {
    return `Stuck on ${topicName} (${topicCode}) — how do examiners award the method marks?`
  }
  return `Stuck on ${topicName} (${topicCode}) — what does a full-mark answer look like?`
}

export function buildVaultCommunityHooks(
  subjectCode: string | null,
  weakTopics: TopicTarget[],
  communityOn: boolean
): VaultCommunityHook[] {
  if (!communityOn || !subjectCode || weakTopics.length === 0) return []

  return weakTopics.slice(0, 3).map((t) => {
    const ask = new URLSearchParams({
      board: isIbSubjectCode(subjectCode) ? 'ib' : 'cambridge',
      subject: subjectCode,
      kind: 'question',
      topic: t.code,
      title: communityAskTitle(subjectCode, t.name, t.code),
    })
    return {
      topicName: t.name,
      topicCode: t.code,
      askHref: `/community/submit?${ask.toString()}`,
      browseHref: `/community/s/${encodeURIComponent(subjectCode)}`,
      prompt: `Ask the Exam Room about ${t.name} — Max students get a pre-filled weak-topic question.`,
    }
  })
}
