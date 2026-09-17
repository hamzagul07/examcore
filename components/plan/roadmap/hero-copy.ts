/**
 * What the hero card says, in one place.
 *
 * The roadmap screen (client, with sheets) and the dashboard card (server,
 * static) show the same hero; the decision of WHICH task is heroFor() in
 * roadmap-view, and the WORDS are here, so the two surfaces cannot drift.
 * Pure: it takes the hero and the day and returns strings.
 *
 * Copy rules it enforces: minutes are what the clock allows, never what the
 * plan wished; a task with no evidence beyond the syllabus says "Next in the
 * syllabus" rather than dressing that up as a chip; a finished day states a
 * fact about the last week and nothing about a streak.
 */

import { formatPlanDate } from '@/lib/plan/plan-view'
import { NEXT_IN_SYLLABUS } from '@/lib/plan/modes'
import { TASK_TYPE_LABEL } from '@/lib/plan/roadmap-types'
import {
  evidenceChip,
  formatClock,
  workTasks,
  type Hero,
  type RoadmapDay,
  type RoadmapPlan,
  type RoadmapTask,
} from '@/lib/plan/roadmap-view'

export type HeroCopy = {
  eyebrow: string
  title: string
  subtitle?: string
  chips: string[]
  /** One quiet line under the card: tomorrow, or what comes next. */
  note?: string
}

/** Up to two chips; a task that is only "on the syllabus" gets the plain line instead. */
export function heroChips(task: Pick<RoadmapTask, 'why'>): string[] {
  const why = task.why ?? []
  if (why.length === 0) return []
  const specific = why.filter((w) => w.type !== 'on_syllabus')
  if (specific.length === 0) return [NEXT_IN_SYLLABUS]
  return specific.slice(0, 2).map(evidenceChip)
}

/** "Mathematics · Differentiation" — whichever parts the task has. */
export function taskSubtitle(task: Pick<RoadmapTask, 'subjectLabel' | 'topic'>): string | undefined {
  const parts = [task.subjectLabel, task.topic?.name].filter((p): p is string => Boolean(p))
  return parts.length ? parts.join(' · ') : undefined
}

/** The first work task on a date, for "Tomorrow starts with …". */
export function firstTaskOn(plan: Pick<RoadmapPlan, 'days'>, date: string | null): RoadmapTask | null {
  if (!date) return null
  const day = plan.days.find((d) => d.date === date)
  return day ? (workTasks(day)[0] ?? null) : null
}

/** An objective is a sentence; inside another sentence it loses its full stop. */
function inline(objective: string): string {
  return objective.trim().replace(/[.]+$/, '')
}

function nextDayLabel(date: string, todayIso: string): string {
  const next = new Date(`${todayIso}T00:00:00Z`)
  next.setUTCDate(next.getUTCDate() + 1)
  return next.toISOString().slice(0, 10) === date ? 'Tomorrow' : formatPlanDate(date)
}

export function heroCopy(
  hero: Hero,
  ctx: { plan: Pick<RoadmapPlan, 'days'>; day: RoadmapDay; todayIso: string; studiedLine: string }
): HeroCopy {
  const { plan, day, todayIso, studiedLine } = ctx
  switch (hero.kind) {
    case 'task': {
      // N is what today can still hold, not the first task's length; when the first task is shorter, say so.
      const dayMinutes = hero.dayMinutes ?? hero.minutes
      const opener = hero.minutes < dayMinutes ? ` — starting with this ${hero.minutes}-minute ${TASK_TYPE_LABEL[hero.task.taskType].toLowerCase()}` : ''
      return {
        eyebrow: `Today's best use of ${dayMinutes} minutes${hero.shortened ? ' — shortened to fit' : opener}`,
        title: hero.task.objective,
        subtitle: taskSubtitle(hero.task),
        chips: heroChips(hero.task),
      }
    }
    case 'done': {
      const tomorrow = plan.days.find((d) => d.date > day.date && workTasks(d).length > 0) ?? null
      const first = firstTaskOn(plan, tomorrow?.date ?? null)
      return {
        eyebrow: 'Today',
        // On day one the studied line says everything starts today, which is
        // no longer true once it is done.
        title: `Today is done. ${studiedLine.startsWith('Day one.') ? 'A good first day.' : studiedLine}`,
        chips: [],
        note: tomorrow && first ? `${nextDayLabel(tomorrow.date, todayIso)} starts with ${inline(first.objective)}.` : undefined,
      }
    }
    case 'no_time': {
      const first = firstTaskOn(plan, hero.nextDate)
      const when = first?.startsAt ? ` at ${formatClock(first.startsAt)}` : ''
      return {
        eyebrow: 'Today',
        title:
          hero.nextDate && first
            ? `Nothing more today. ${nextDayLabel(hero.nextDate, todayIso)} starts with ${inline(first.objective)}${when}.`
            : 'Nothing more today.',
        chips: [],
      }
    }
    case 'rest':
    default:
      return {
        eyebrow: day.kind === 'exam' ? 'Exam day' : 'Rest day',
        title: day.focus,
        chips: [],
      }
  }
}

/** "19 days to Mathematics Paper 1", or the one line for the day itself. */
export function countdownLine(nearest: { label: string; daysLeft: number; component?: string } | null): string {
  if (!nearest) return 'Exam roadmap'
  const what = `${nearest.label}${nearest.component ? ` ${nearest.component}` : ''}`
  if (nearest.daysLeft === 0) return `${what} is today`
  if (nearest.daysLeft === 1) return `1 day to ${what}`
  return `${nearest.daysLeft} days to ${what}`
}
