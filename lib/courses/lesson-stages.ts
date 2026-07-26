import type { MarginNotesLesson } from '@/lib/courses/margin-notes/types'

/**
 * A lesson as a path of stages rather than a document of sections.
 *
 * The live page stacks thirteen sections vertically. Every one is styled well,
 * but the shape is a document: the student is handed everything at once and left
 * to decide what to do. A path hands them one thing and a clear next step.
 *
 * Five stages, in the order the learning actually happens — orient, see, read,
 * check, prove. That ordering is not arbitrary: it is the sequence the lesson
 * content is already authored in, and it puts *producing* (check) before
 * *proving* (a marked question), which is the step most students skip.
 *
 * Pure, so the mapping and the skip rules are testable without a DOM.
 */

export type StageId = 'orient' | 'see' | 'read' | 'check' | 'prove'

export type Stage = {
  id: StageId
  /** Short label for the rail. */
  label: string
  /** What the student is being asked to do here. */
  intent: string
}

const ALL: Stage[] = [
  { id: 'orient', label: 'Orient', intent: 'What this is, and why it matters' },
  { id: 'see', label: 'See', intent: 'Watch the idea happen' },
  { id: 'read', label: 'Read', intent: 'The full explanation, at exam rigour' },
  { id: 'check', label: 'Check', intent: 'Write it in your own words' },
  { id: 'prove', label: 'Prove', intent: 'Do a real question and get it marked' },
]

/**
 * Which stages this lesson actually has.
 *
 * A stage with no content is dropped rather than shown empty — an empty stage in
 * a path is worse than an empty section in a document, because the path implies
 * every step is necessary.
 */
export function stagesFor(lesson: MarginNotesLesson): Stage[] {
  const has: Record<StageId, boolean> = {
    orient: !!(lesson.simple || lesson.objectives?.length),
    see: !!lesson.hasDiagram,
    read: !!lesson.notes?.length,
    check: !!lesson.quiz?.length,
    prove: !!(lesson.worked?.length || lesson.practice || lesson.practiceQuestions?.length),
  }
  return ALL.filter((s) => has[s.id])
}

/** Clamp an index to the available stages; -1 and overflow both land in range. */
export function clampStage(index: number, total: number): number {
  if (total <= 0) return 0
  return Math.min(Math.max(0, index), total - 1)
}

/**
 * Percentage complete for a set of finished stage ids.
 * Rounds down except at a true 100, matching the lesson progress rule.
 */
export function stagePercent(stages: Stage[], done: ReadonlySet<string>): number {
  if (!stages.length) return 0
  const n = stages.filter((s) => done.has(s.id)).length
  if (n === stages.length) return 100
  return Math.floor((n / stages.length) * 100)
}
