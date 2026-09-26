import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { AUTO_CLOSE_AFTER_DUE_DAYS, assignmentStatus, summariseProgress } from '@/lib/teacher/assignment-status'
import { reconcileAssignment } from '@/lib/teacher/assignments'
import type { TeacherClassroomRow } from '@/lib/teacher/list-classrooms'
import type { AssignmentKind, AssignmentSummary, ClassWeek } from '@/lib/teacher/types'
import {
  currentIsoWeek,
  loadClassWeek,
  parseIsoWeek,
  pickLastCompletedSet,
  setStudentStates,
  shiftIsoWeek,
  weekReference,
} from '@/lib/teacher/week'
import {
  getClassroomMembers,
  getRosterProfiles,
  hydrateSets,
  loadPublishedSets,
  type ClassSet,
} from '@/lib/teacher-classroom-data'
import type { ClassroomMember } from '@/lib/teacher-analytics'
import { formatWeekRange } from '@/components/teacher/assignments/format'
import { PREFILL_MAX_CODES } from '@/components/teacher/assignments/links'
import {
  barFromStates,
  barFromSummary,
  lateNames,
  setTopicCodes,
  type SetBar,
} from '@/components/teacher/assignments/set-display'

/**
 * Everything the class week page shows, from one call (docs/TEACHER_SYSTEM_SPEC.md
 * §4 "Class week"; P1's loadClassWeek does the analysis).
 *
 * ClassWeek carries each live set as counts (AssignmentSummary). The week
 * strip also names who was late ("3 late: Amira K., Ben O., +1") and splits
 * its bar exactly, and the reteach card needs the set its gap came from — so
 * this loader reads the same rows loadClassWeek reads (published sets,
 * memberships, roster names) and runs the same pure rules over them
 * (pickLastCompletedSet, setStudentStates). The counts on a slip therefore
 * always agree with its names and its bar.
 *
 * That detail is best-effort: if its reads fail, the slips fall back to the
 * summary's counts and the reteach card to nothing, and the failure is
 * logged. A failure of loadClassWeek itself is thrown to the teacher error
 * boundary.
 */

export type WeekSetView = {
  summary: AssignmentSummary
  bar: SetBar
  /** displayName()s of students with a late hand-in, A–Z; empty when unknown. */
  late_names: string[]
}

export type ReteachView = {
  set: { id: string; title: string; kind: AssignmentKind; due_at: string | null }
  /** ClassWeek.headline_gap: "Analysis — 17% of marks earned". */
  gap: string
  /** Topics the set covered, for the prefilled drill. */
  codes: string[]
  handed_in: number
  total_students: number
  class_mean_pct: number | null
}

export type ClassWeekView = {
  week: ClassWeek
  /** ISO instants bounding the week [start, end), and "21–27 Sep". */
  range: { start: string; end: string; label: string | null }
  isCurrent: boolean
  prev: string | null
  /** The following week, or null when this is the current week or later. */
  next: string | null
  sets: WeekSetView[]
  reteach: ReteachView | null
  /** The instant the view was computed at (for relative due dates). */
  now: string
}

type Detail = {
  published: Awaited<ReturnType<typeof loadPublishedSets>>
  members: ClassroomMember[]
  names: Map<string, string | null>
}

function logDetailFailure(classroomId: string, err: unknown) {
  console.error('[teacher/class-week] slip detail failed (showing counts only)', {
    classroomId,
    error: err instanceof Error ? err.message : String(err),
  })
}

/** Open sets reconciled per class-week view; the rest wait for their own page or the digest. */
const MAX_RECONCILED_SETS = 8

/**
 * Pick up hand-ins marked from plain /mark on the class's open sets before the
 * week is read, so the strip's tallies agree with each set's matrix (whose
 * page reconciles the same way). Only open sets: a closed set's hand-ins were
 * settled while it was open, and the digest reconciles everything on Sunday.
 * reconcileAssignment skips a set done in the last minute, so a refresh costs
 * one claim query per set. Best-effort: a failure is logged and the week
 * shows what is stored.
 */
async function reconcileOpenSets(admin: SupabaseClient, classroomId: string, now: Date): Promise<void> {
  try {
    // Narrow to sets that can still be open BEFORE the limit (the same
    // pre-filter the student's list uses): ordering every published set by
    // due date and filtering afterwards let a class's long-closed sets fill
    // the page, so its current open sets were never reconciled here.
    // assignmentStatus below is still the rule.
    const nowIso = now.toISOString()
    const dueCutoff = new Date(now.getTime() - AUTO_CLOSE_AFTER_DUE_DAYS * 86_400_000).toISOString()
    const { data, error } = await admin
      .from('assignments')
      .select('id, published_at, closed_at, archived_at, due_at')
      .eq('classroom_id', classroomId)
      .not('published_at', 'is', null)
      .is('archived_at', null)
      .or(`closed_at.is.null,closed_at.gt."${nowIso}"`)
      .or(`due_at.is.null,due_at.gt."${dueCutoff}"`)
      .order('due_at', { ascending: true, nullsFirst: false })
      .limit(50)
    if (error) throw new Error(error.message)
    type Row = { id: string; published_at: string | null; closed_at: string | null; archived_at: string | null; due_at: string | null }
    const open = ((data ?? []) as Row[]).filter((a) => assignmentStatus(a, now) === 'open').slice(0, MAX_RECONCILED_SETS)
    const results = await Promise.allSettled(open.map((a) => reconcileAssignment(admin, a.id, { now })))
    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        console.error('[teacher/class-week] reconcile failed (showing stored hand-ins)', {
          classroomId,
          assignmentId: open[i]?.id,
          error: r.reason instanceof Error ? r.reason.message : String(r.reason),
        })
      }
    })
  } catch (err) {
    console.error('[teacher/class-week] open sets read failed (showing stored hand-ins)', {
      classroomId,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}

export async function loadClassWeekView(
  ctx: { supabase: SupabaseClient; admin: SupabaseClient; classroom: Pick<TeacherClassroomRow, 'id' | 'archived_at'> },
  opts: { week?: string | null; now?: Date } = {}
): Promise<ClassWeekView | null> {
  const { supabase, admin, classroom } = ctx
  const now = opts.now ?? new Date()
  const requested = opts.week ? parseIsoWeek(opts.week) : null
  const archived = classroom.archived_at !== null
  // An archived class's retained hand-ins are readable only as the service
  // role (ownership was proven before `admin` was created).
  const setsDb = archived ? admin : supabase

  // An archived class shows retained hand-ins only, never live attempts.
  if (!archived) await reconcileOpenSets(admin, classroom.id, now)

  const detailPromise: Promise<Detail | null> = Promise.all([
    loadPublishedSets(setsDb, [classroom.id]),
    getClassroomMembers(supabase, classroom.id),
    getRosterProfiles(supabase, classroom.id),
  ]).then(
    ([published, members, roster]) => ({
      published,
      members,
      names: new Map(roster.map((r) => [r.id, r.full_name])),
    }),
    (err: unknown) => {
      logDetailFailure(classroom.id, err)
      return null
    }
  )

  const [week, detail] = await Promise.all([
    loadClassWeek(supabase, classroom.id, {
      week: requested?.key,
      now,
      admin: archived ? admin : undefined,
    }),
    detailPromise,
  ])
  if (!week) return null

  const iso = parseIsoWeek(week.week) ?? currentIsoWeek(now)
  const current = currentIsoWeek(now)
  const isCurrent = iso.key === current.key
  const later = iso.start.getTime() >= current.start.getTime()

  let hydrated: ClassSet[] = []
  let lastId: string | null = null
  if (detail) {
    const ref = weekReference(iso, now)
    const last = week.headline_gap ? pickLastCompletedSet(detail.published, ref) : null
    lastId = last?.id ?? null
    const wanted = new Set(week.assignments.map((a) => a.id))
    if (lastId) wanted.add(lastId)
    const rows = detail.published.filter((s) => wanted.has(s.id))
    if (rows.length > 0) {
      try {
        hydrated = await hydrateSets(setsDb, rows)
      } catch (err) {
        logDetailFailure(classroom.id, err)
      }
    }
  }
  const byId = new Map(hydrated.map((s) => [s.id, s]))
  const statesOf = (set: ClassSet) => setStudentStates(set, detail?.members ?? [], detail?.names ?? new Map())

  const sets: WeekSetView[] = week.assignments.map((summary) => {
    const set = byId.get(summary.id)
    if (!set || !detail) return { summary, bar: barFromSummary(summary), late_names: [] }
    const states = statesOf(set)
    return { summary, bar: barFromStates(states), late_names: lateNames(states) }
  })

  let reteach: ReteachView | null = null
  const lastSet = lastId ? byId.get(lastId) : undefined
  if (lastSet && week.headline_gap) {
    const states = statesOf(lastSet)
    const progress = summariseProgress(states, lastSet.items)
    reteach = {
      set: { id: lastSet.id, title: lastSet.title, kind: lastSet.kind, due_at: lastSet.due_at },
      gap: week.headline_gap,
      codes: setTopicCodes(lastSet.items, PREFILL_MAX_CODES),
      handed_in: progress.handed_in,
      total_students: progress.total_students,
      class_mean_pct: progress.class_mean_pct,
    }
  }

  return {
    week,
    range: {
      start: iso.start.toISOString(),
      end: iso.end.toISOString(),
      label: formatWeekRange(iso.start.toISOString(), iso.end.toISOString()),
    },
    isCurrent,
    prev: shiftIsoWeek(iso.key, -1),
    next: later ? null : shiftIsoWeek(iso.key, 1),
    sets,
    reteach,
    now: now.toISOString(),
  }
}
