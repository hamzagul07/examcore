/**
 * The setup wizard's state, as one pure reducer.
 *
 * Five steps — finish line, current position, real-life availability, goal,
 * feasibility — collect a RoadmapBuildRequest. Everything the wizard knows
 * lives in one object so a step can be left and returned to without losing
 * anything, the feasibility step can say "add more study time" and land the
 * student back on step three with the numbers already changed, and the
 * whole thing can be tested without a browser.
 *
 * Pure and client-safe: it imports only its planner siblings, so it ships in
 * the client bundle and runs under `tsx` with no server condition. It never
 * reads the clock; today's date is passed in from the browser. The one
 * thing it asks the runtime is Intl: the device's zone and the zones it
 * knows, so the zone picker and its "from your device" note are honest.
 *
 * Availability is collected the way the student thinks about it (minutes on
 * a weekday, minutes at the weekend, when they would rather study, what is
 * fixed) and sent as RoadmapAvailability — the engine's ONLY capacity input.
 * The planner's seven-minute array is never sent beside it; a day set to
 * "none" or "half" is expressed as a commitment instead, because that is
 * what it is: time the student has said is not free.
 */

import { isValidTimeZone, todayInZone } from '@/lib/plan/plan-view'
import { clockOf, minuteOfDay, type RoadmapPlan } from '@/lib/plan/roadmap-view'
import {
  DEFAULT_AVAILABILITY,
  MAX_PAPERS_PER_SUBJECT,
  type BreakRhythm,
  type ClockTime,
  type Commitment,
  type CommitmentKind,
  type RoadmapAvailability,
  type RoadmapBuildRequest,
  type RoadmapMode,
  type SelfRating,
  type SessionLength,
  type TimeWindow,
  type Weekday,
} from '@/lib/plan/roadmap-types'

// --- what the wizard is given ----------------------------------------------------

export type SetupSubjectOption = {
  code: string
  label: string
  board?: string
  qualification?: string
  /** Papers / components the catalogue knows for this subject, e.g. ['Paper 1', 'Paper 2']. */
  components?: string[]
  paperMinutes?: number
}

export type SetupProfile = {
  board: string
  level: string
  examDate: string | null
  subjectCodes: string[]
  remindMe: boolean
  timeZone?: string
  firstName?: string
  /** Per subject, the student's marked work so far. Only trusted at three or more attempts. */
  measured?: Record<string, { pct: number; attempts: number }>
}

// --- time zone -----------------------------------------------------------------------

/** The device's IANA zone, or UTC when the runtime cannot say. */
export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

/**
 * A short list for the zone picker when the runtime has no
 * Intl.supportedValuesOf (older Safari and WebViews). The student can still
 * type any IANA name; the list only saves typing.
 */
export const TIME_ZONE_FALLBACK: readonly string[] = [
  'Africa/Cairo',
  'Africa/Johannesburg',
  'Africa/Lagos',
  'Africa/Nairobi',
  'America/Chicago',
  'America/Los_Angeles',
  'America/New_York',
  'America/Sao_Paulo',
  'America/Toronto',
  'Asia/Dhaka',
  'Asia/Dubai',
  'Asia/Hong_Kong',
  'Asia/Jakarta',
  'Asia/Karachi',
  'Asia/Kolkata',
  'Asia/Kuala_Lumpur',
  'Asia/Riyadh',
  'Asia/Shanghai',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
  'Europe/Berlin',
  'Europe/Istanbul',
  'Europe/London',
  'Europe/Paris',
  'Pacific/Auckland',
  'UTC',
]

/** Every zone the runtime knows, or the fallback list. Always includes `extra` so the current value is never missing from its own list. */
export function supportedTimeZones(extra: string[] = []): string[] {
  let zones: string[]
  try {
    zones = Intl.supportedValuesOf('timeZone')
    if (zones.length === 0) zones = [...TIME_ZONE_FALLBACK]
  } catch {
    zones = [...TIME_ZONE_FALLBACK]
  }
  const set = new Set(zones)
  for (const z of extra) if (z && !set.has(z)) set.add(z)
  return [...set].sort()
}

export type TimeZoneSource = 'device' | 'account' | 'typed'

/**
 * Where the zone in the field came from, so the note beside it is true:
 * the device's own zone, the one saved in account settings, or something
 * the student typed. The device wins a tie because "from your device" is
 * the more useful thing to know.
 */
export function timeZoneSource(value: string, deviceZone: string, accountZone: string | undefined): TimeZoneSource {
  if (value && value === deviceZone) return 'device'
  if (value && accountZone && value === accountZone) return 'account'
  return 'typed'
}

export const TIME_ZONE_ISSUE = 'That time zone is not one we recognise. Pick one from the list, in the form Europe/London.'

/** The zone field's message, or null when the zone is one Intl knows. Shown on blur and again on Next. */
export function timeZoneIssue(timeZone: string): WizardIssue | null {
  return isValidTimeZone(timeZone) ? null : { field: 'timeZone', message: TIME_ZONE_ISSUE }
}

// --- steps -------------------------------------------------------------------------

export type SetupStep = 1 | 2 | 3 | 4 | 5

export const SETUP_STEPS: ReadonlyArray<{ step: SetupStep; name: string }> = [
  { step: 1, name: 'Finish line' },
  { step: 2, name: 'Current position' },
  { step: 3, name: 'Availability' },
  { step: 4, name: 'Goal' },
  { step: 5, name: 'Feasibility' },
]

export const MAX_SUBJECTS = 4
export const MAX_BLOCKED_DATES = 60
/**
 * Minutes a day the wizard offers. The first plans stopped at three hours;
 * a student in the last fortnight before her papers asked for more, and
 * the engine (which never had a ceiling) fills long days rather than
 * leaving them in hand, so the list runs to eight hours. Anything above
 * LONG_DAY_MINUTES gets the note about windows: capacity is the smaller of
 * the stated minutes and the free time inside the chosen windows.
 */
export const MINUTE_CHOICES: readonly number[] = [30, 45, 60, 90, 120, 150, 180, 240, 300, 360, 480]
export const LONG_DAY_MINUTES = 240
/** What "Add more study time" adds to both weekday and weekend minutes. */
export const ADD_TIME_STEP = 30
/** The API's ceiling (app/api/plan/route.ts MAX_MINUTES); the reducer clamps to the same number. */
export const MAX_DAY_MINUTES = 600
export const TARGET_GRADE_MAX = 12

/** How much of the stated minutes a weekday gets. Cycled by tapping the day. */
export type DayLoad = 'full' | 'half' | 'none'

export const DAY_LOAD_ORDER: readonly DayLoad[] = ['full', 'half', 'none']

export const DAY_LOAD_LABEL: Record<DayLoad, string> = { full: 'Full', half: 'Half', none: 'None' }

export const WEEKDAY_SHORT: readonly string[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export type WindowPreset = 'morning' | 'afternoon' | 'evening'

export const WINDOW_PRESETS: readonly WindowPreset[] = ['morning', 'afternoon', 'evening']

export const WINDOW_PRESET: Record<WindowPreset, TimeWindow & { label: string }> = {
  morning: { label: 'Morning', start: '07:00', end: '12:00' },
  afternoon: { label: 'Afternoon', start: '12:00', end: '17:00' },
  evening: { label: 'Evening', start: '17:00', end: '22:00' },
}

export type WindowChoice = { presets: WindowPreset[]; custom: TimeWindow | null }

export type DayType = 'weekday' | 'weekend'

// --- state --------------------------------------------------------------------------

/**
 * One paper on the finish-line step. A subject has at least one row; a
 * student sitting Business Paper 1 on the 5th and Paper 2 on the 8th has
 * two. The component is the catalogue's name ("Paper 1") or empty for
 * "any paper"; date and time are the inputs' own strings.
 */
export type WizardPaper = { id: string; component: string; date: string; time: string }

export type WizardState = {
  step: SetupStep
  // 1 Finish line
  subjects: string[]
  /** Per subject, the papers the student sits, earliest first as entered. */
  papers: Record<string, WizardPaper[]>
  timeZone: string
  // 2 Current position
  selfRatings: Record<string, SelfRating>
  // 3 Availability
  weekdayMinutes: number
  weekendMinutes: number
  /** Monday first. */
  dayLoads: DayLoad[]
  windows: Record<DayType, WindowChoice>
  sessionLength: SessionLength
  breakRhythm: BreakRhythm
  commitments: Commitment[]
  noStudy: TimeWindow
  quietHours: TimeWindow
  reminderTime: ClockTime
  blockedDates: string[]
  // 4 Goal
  mode: RoadmapMode
  targetGrade: string
  remindMe: boolean
  // 5 Feasibility
  prioritySubject: string | null
}

const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export function isClockTime(value: unknown): value is ClockTime {
  return typeof value === 'string' && CLOCK.test(value)
}

/** A rating from marked work: only with enough attempts, and never "not started" — they have started. */
export function ratingFromMeasured(measured: { pct: number; attempts: number } | undefined): SelfRating | null {
  if (!measured || measured.attempts < 3) return null
  if (measured.pct < 40) return 'rusty'
  if (measured.pct < 65) return 'getting_there'
  return 'confident'
}

function sameWindow(a: TimeWindow, b: TimeWindow): boolean {
  return a.start === b.start && a.end === b.end
}

/** The presets a stored window list matches, and the first window that matches none. */
function choiceFromWindows(windows: TimeWindow[]): WindowChoice {
  const presets: WindowPreset[] = []
  let custom: TimeWindow | null = null
  for (const w of windows) {
    const preset = WINDOW_PRESETS.find((p) => sameWindow(WINDOW_PRESET[p], w))
    if (preset) presets.push(preset)
    else if (!custom) custom = { start: w.start, end: w.end }
  }
  return { presets, custom }
}

/**
 * The Full / Half / None loads a saved plan expressed as synthetic
 * commitments (dayOverrideCommitments), read back. Never inferred from the
 * stored per-weekday capacity: a weekday whose windows or tuition leave
 * less than the stated minutes is still a "full" day the student never
 * chose to halve, and reading it as "half" would halve it again on rebuild.
 */
function loadsFromCommitments(commitments: Commitment[]): DayLoad[] {
  const loads: DayLoad[] = ['full', 'full', 'full', 'full', 'full', 'full', 'full']
  for (const c of commitments) {
    if (c.id === 'dayoff') for (const d of c.days) loads[d] = 'none'
  }
  for (const c of commitments) {
    if (c.id.startsWith('half-')) for (const d of c.days) if (loads[d] === 'full') loads[d] = 'half'
  }
  return loads
}

function paperId(n: number): string {
  return `p${n}`
}

function nextPaperId(rows: WizardPaper[]): string {
  let max = 0
  for (const r of rows) {
    const m = /^p(\d+)$/.exec(r.id)
    if (m) max = Math.max(max, Number(m[1]))
  }
  return paperId(max + 1)
}

export function initialWizardState(
  profile: SetupProfile,
  prior: RoadmapPlan | null,
  options: { timeZone?: string } = {}
): WizardState {
  const subjects = (prior?.subjects.map((s) => s.code) ?? profile.subjectCodes).slice(0, MAX_SUBJECTS)

  // A prior plan's sittings come back as rows, earliest first; otherwise one row on the profile's date.
  const papers: Record<string, WizardPaper[]> = {}
  for (const code of subjects) {
    const sat = (prior?.exams ?? [])
      .filter((e) => e.subjectCode === code)
      .sort((a, b) => (a.examDate < b.examDate ? -1 : a.examDate > b.examDate ? 1 : 0))
      .slice(0, MAX_PAPERS_PER_SUBJECT)
    if (sat.length > 0) {
      papers[code] = sat.map((e, i) => ({ id: paperId(i + 1), component: e.component ?? '', date: e.examDate, time: e.examTime ?? '' }))
    } else {
      const date = prior?.subjects.find((s) => s.code === code)?.examDate ?? profile.examDate ?? ''
      papers[code] = [{ id: paperId(1), component: '', date, time: '' }]
    }
  }

  const selfRatings: Record<string, SelfRating> = {}
  for (const code of subjects) {
    const stored = prior?.selfRatings[code]
    const measured = ratingFromMeasured(profile.measured?.[code])
    // Marked work outranks what was said last time; a prior rating outranks nothing.
    const rating = measured ?? stored
    if (rating) selfRatings[code] = rating
  }

  const detail = prior?.availabilityDetail ?? null
  const weekdayMinutes = detail?.weekdayMinutes ?? prior?.minutesPerDay ?? DEFAULT_AVAILABILITY.weekdayMinutes
  const weekendMinutes = detail?.weekendMinutes ?? prior?.minutesPerDay ?? DEFAULT_AVAILABILITY.weekendMinutes
  const dayLoads: DayLoad[] = loadsFromCommitments(detail?.commitments ?? [])

  const windows: Record<DayType, WindowChoice> = detail
    ? { weekday: choiceFromWindows(detail.windows.weekday), weekend: choiceFromWindows(detail.windows.weekend) }
    : { weekday: { presets: ['evening'], custom: null }, weekend: { presets: ['morning', 'afternoon'], custom: null } }

  return {
    step: 1,
    subjects,
    papers,
    timeZone: options.timeZone ?? profile.timeZone ?? prior?.timeZone ?? 'UTC',
    selfRatings,
    weekdayMinutes,
    weekendMinutes,
    dayLoads,
    windows,
    sessionLength: detail?.sessionLength ?? DEFAULT_AVAILABILITY.sessionLength,
    breakRhythm: detail?.breakRhythm ?? DEFAULT_AVAILABILITY.breakRhythm,
    // Synthetic day-off commitments come back as loads, not as rows.
    commitments: (detail?.commitments ?? []).filter((c) => !isDerivedCommitment(c)),
    noStudy: detail?.noStudy[0] ?? { ...DEFAULT_AVAILABILITY.noStudy[0]! },
    quietHours: detail?.quietHours ?? { ...DEFAULT_AVAILABILITY.quietHours },
    reminderTime: detail?.reminderTime ?? DEFAULT_AVAILABILITY.reminderTime,
    blockedDates: [...(prior?.blockedDates ?? [])],
    mode: prior?.mode ?? 'balanced',
    targetGrade: prior?.targetGrade ?? '',
    remindMe: profile.remindMe,
    prioritySubject: null,
  }
}

// --- actions -------------------------------------------------------------------------

export type WizardAction =
  | { type: 'go'; step: SetupStep }
  | { type: 'toggle_subject'; code: string }
  /** The three single-paper actions act on the subject's first row. */
  | { type: 'set_component'; code: string; component: string }
  | { type: 'set_exam_date'; code: string; date: string }
  | { type: 'set_all_exam_dates'; date: string }
  | { type: 'set_exam_time'; code: string; time: string }
  | { type: 'add_paper'; code: string }
  | { type: 'remove_paper'; code: string; id: string }
  | { type: 'set_paper'; code: string; id: string; patch: Partial<Omit<WizardPaper, 'id'>> }
  | { type: 'set_time_zone'; timeZone: string }
  | { type: 'set_rating'; code: string; rating: SelfRating }
  | { type: 'set_minutes'; which: DayType; minutes: number }
  | { type: 'add_minutes'; minutes: number }
  | { type: 'cycle_day_load'; day: Weekday }
  | { type: 'toggle_window'; which: DayType; preset: WindowPreset }
  | { type: 'set_custom_window'; which: DayType; window: TimeWindow | null }
  | { type: 'set_session_length'; sessionLength: SessionLength }
  | { type: 'set_break_rhythm'; breakRhythm: BreakRhythm }
  | { type: 'add_commitment' }
  | { type: 'update_commitment'; id: string; patch: Partial<Omit<Commitment, 'id' | 'days'>> }
  | { type: 'toggle_commitment_day'; id: string; day: Weekday }
  | { type: 'remove_commitment'; id: string }
  | { type: 'set_no_study'; window: TimeWindow }
  | { type: 'set_quiet_hours'; window: TimeWindow }
  | { type: 'set_reminder_time'; time: string }
  | { type: 'add_blocked_date'; date: string }
  | { type: 'remove_blocked_date'; date: string }
  | { type: 'set_mode'; mode: RoadmapMode }
  | { type: 'set_target_grade'; targetGrade: string }
  | { type: 'set_remind_me'; remindMe: boolean }
  | { type: 'set_priority_subject'; code: string | null }

function nextCommitmentId(commitments: Commitment[]): string {
  let max = 0
  for (const c of commitments) {
    const m = /^c(\d+)$/.exec(c.id)
    if (m) max = Math.max(max, Number(m[1]))
  }
  return `c${max + 1}`
}

function clampMinutes(n: number): number {
  return Math.max(0, Math.min(MAX_DAY_MINUTES, Math.round(n)))
}

export function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'go':
      return { ...state, step: action.step }

    case 'toggle_subject': {
      const on = state.subjects.includes(action.code)
      if (on) {
        const subjects = state.subjects.filter((c) => c !== action.code)
        const { [action.code]: _gone, ...papers } = state.papers
        return {
          ...state,
          subjects,
          papers,
          prioritySubject: state.prioritySubject === action.code ? null : state.prioritySubject,
        }
      }
      if (state.subjects.length >= MAX_SUBJECTS) return state
      // A new subject starts on the plan's latest date, so one date typed once covers everyone.
      const latest = planExamDate(state) ?? ''
      const rows = state.papers[action.code]?.length ? state.papers[action.code]! : [{ id: paperId(1), component: '', date: latest, time: '' }]
      return { ...state, subjects: [...state.subjects, action.code], papers: { ...state.papers, [action.code]: rows } }
    }

    case 'set_component':
      return patchPaper(state, action.code, firstPaperId(state, action.code), { component: action.component })

    case 'set_exam_date':
      return patchPaper(state, action.code, firstPaperId(state, action.code), { date: action.date })

    case 'set_all_exam_dates': {
      // One date for every subject's first paper, and for any later paper still without one.
      const papers = { ...state.papers }
      for (const code of state.subjects) {
        const rows = papers[code]?.length ? papers[code]! : [{ id: paperId(1), component: '', date: '', time: '' }]
        papers[code] = rows.map((p, i) => (i === 0 || !p.date ? { ...p, date: action.date } : p))
      }
      return { ...state, papers }
    }

    case 'set_exam_time':
      return patchPaper(state, action.code, firstPaperId(state, action.code), { time: action.time })

    case 'add_paper': {
      const rows = state.papers[action.code] ?? []
      if (!state.subjects.includes(action.code) || rows.length >= MAX_PAPERS_PER_SUBJECT) return state
      const row: WizardPaper = { id: nextPaperId(rows), component: '', date: '', time: '' }
      return { ...state, papers: { ...state.papers, [action.code]: [...rows, row] } }
    }

    case 'remove_paper': {
      const rows = state.papers[action.code] ?? []
      if (rows.length <= 1) return state
      return { ...state, papers: { ...state.papers, [action.code]: rows.filter((p) => p.id !== action.id) } }
    }

    case 'set_paper':
      return patchPaper(state, action.code, action.id, action.patch)

    case 'set_time_zone':
      return { ...state, timeZone: action.timeZone }

    case 'set_rating':
      return { ...state, selfRatings: { ...state.selfRatings, [action.code]: action.rating } }

    case 'set_minutes':
      return action.which === 'weekday'
        ? { ...state, weekdayMinutes: clampMinutes(action.minutes) }
        : { ...state, weekendMinutes: clampMinutes(action.minutes) }

    case 'add_minutes':
      return {
        ...state,
        weekdayMinutes: clampMinutes(state.weekdayMinutes + action.minutes),
        weekendMinutes: clampMinutes(state.weekendMinutes + action.minutes),
      }

    case 'cycle_day_load': {
      const dayLoads = [...state.dayLoads]
      const cur = dayLoads[action.day] ?? 'full'
      dayLoads[action.day] = DAY_LOAD_ORDER[(DAY_LOAD_ORDER.indexOf(cur) + 1) % DAY_LOAD_ORDER.length]!
      return { ...state, dayLoads }
    }

    case 'toggle_window': {
      const choice = state.windows[action.which]
      const presets = choice.presets.includes(action.preset)
        ? choice.presets.filter((p) => p !== action.preset)
        : [...choice.presets, action.preset]
      return { ...state, windows: { ...state.windows, [action.which]: { ...choice, presets } } }
    }

    case 'set_custom_window':
      return {
        ...state,
        windows: { ...state.windows, [action.which]: { ...state.windows[action.which], custom: action.window } },
      }

    case 'set_session_length':
      return { ...state, sessionLength: action.sessionLength }

    case 'set_break_rhythm':
      return { ...state, breakRhythm: action.breakRhythm }

    case 'add_commitment':
      return {
        ...state,
        commitments: [
          ...state.commitments,
          { id: nextCommitmentId(state.commitments), label: '', kind: 'tuition', days: [], start: '16:00', end: '17:00' },
        ],
      }

    case 'update_commitment':
      return {
        ...state,
        commitments: state.commitments.map((c) => (c.id === action.id ? { ...c, ...action.patch } : c)),
      }

    case 'toggle_commitment_day':
      return {
        ...state,
        commitments: state.commitments.map((c) => {
          if (c.id !== action.id) return c
          const days = c.days.includes(action.day)
            ? c.days.filter((d) => d !== action.day)
            : [...c.days, action.day].sort((a, b) => a - b)
          return { ...c, days }
        }),
      }

    case 'remove_commitment':
      return { ...state, commitments: state.commitments.filter((c) => c.id !== action.id) }

    case 'set_no_study':
      return { ...state, noStudy: action.window }

    case 'set_quiet_hours':
      return { ...state, quietHours: action.window }

    case 'set_reminder_time':
      return { ...state, reminderTime: action.time }

    case 'add_blocked_date': {
      const d = action.date
      if (!ISO_DATE.test(d) || state.blockedDates.includes(d) || state.blockedDates.length >= MAX_BLOCKED_DATES) return state
      return { ...state, blockedDates: [...state.blockedDates, d].sort() }
    }

    case 'remove_blocked_date':
      return { ...state, blockedDates: state.blockedDates.filter((d) => d !== action.date) }

    case 'set_mode':
      return { ...state, mode: action.mode }

    case 'set_target_grade':
      return { ...state, targetGrade: action.targetGrade.slice(0, TARGET_GRADE_MAX) }

    case 'set_remind_me':
      return { ...state, remindMe: action.remindMe }

    case 'set_priority_subject':
      return { ...state, prioritySubject: action.code && state.subjects.includes(action.code) ? action.code : null }

    default:
      return state
  }
}

// --- derivations ---------------------------------------------------------------------

function firstPaperId(state: Pick<WizardState, 'papers'>, code: string): string {
  return state.papers[code]?.[0]?.id ?? paperId(1)
}

function patchPaper(state: WizardState, code: string, id: string, patch: Partial<Omit<WizardPaper, 'id'>>): WizardState {
  const rows = state.papers[code]?.length ? state.papers[code]! : [{ id, component: '', date: '', time: '' }]
  if (!rows.some((p) => p.id === id)) return state
  return { ...state, papers: { ...state.papers, [code]: rows.map((p) => (p.id === id ? { ...p, ...patch } : p)) } }
}

/** A subject's papers, earliest-entered first; one empty row when it has none yet. */
export function papersOf(state: Pick<WizardState, 'papers'>, code: string): WizardPaper[] {
  return state.papers[code]?.length ? state.papers[code]! : [{ id: paperId(1), component: '', date: '', time: '' }]
}

/** The subject's first paper — what the single-paper fields of a request read. */
export function firstPaper(state: Pick<WizardState, 'papers'>, code: string): WizardPaper {
  return papersOf(state, code)[0]!
}

/** A subject's papers in date order, dated ones only. */
function datedPapers(state: Pick<WizardState, 'papers'>, code: string): WizardPaper[] {
  return papersOf(state, code)
    .filter((p) => ISO_DATE.test(p.date))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
}

/** The plan's exam date: the latest paper of any subject. Null until some subject has a date. */
export function planExamDate(state: Pick<WizardState, 'subjects' | 'papers'>): string | null {
  let latest: string | null = null
  for (const code of state.subjects) {
    for (const p of datedPapers(state, code)) if (!latest || p.date > latest) latest = p.date
  }
  return latest
}

/** The latest paper of one subject, for the finish-line line and the legacy per-subject date. */
export function subjectExamDate(state: Pick<WizardState, 'papers'>, code: string): string | null {
  const dated = datedPapers(state, code)
  return dated.length > 0 ? dated[dated.length - 1]!.date : null
}

/** Preset and custom windows as a sorted list, adjacent or overlapping ones merged. */
export function windowsFor(choice: WindowChoice): TimeWindow[] {
  const raw: TimeWindow[] = choice.presets.map((p) => ({ start: WINDOW_PRESET[p].start, end: WINDOW_PRESET[p].end }))
  if (choice.custom && isClockTime(choice.custom.start) && isClockTime(choice.custom.end) && choice.custom.end > choice.custom.start) {
    raw.push({ start: choice.custom.start, end: choice.custom.end })
  }
  raw.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0))
  const out: TimeWindow[] = []
  for (const w of raw) {
    const last = out[out.length - 1]
    if (last && w.start <= last.end) {
      if (w.end > last.end) last.end = w.end
    } else {
      out.push({ ...w })
    }
  }
  return out
}

function windowMinutes(windows: TimeWindow[]): number {
  return windows.reduce((n, w) => n + Math.max(0, minuteOfDay(w.end) - minuteOfDay(w.start)), 0)
}

/** A span that may cross midnight, as one or two same-day intervals in minutes. */
function spanIntervals(span: TimeWindow): Array<{ start: number; end: number }> {
  const start = minuteOfDay(span.start)
  const end = minuteOfDay(span.end)
  if (end > start) return [{ start, end }]
  if (end === start) return []
  return [
    { start, end: 24 * 60 },
    { start: 0, end },
  ]
}

/**
 * The most a day of this type can hold: the free minutes inside the chosen
 * windows once the no-study span is taken out. The engine caps every day at
 * the smaller of this and the stated minutes, so a student who picks six
 * hours but keeps only the evening window gets five — the step says so
 * rather than letting the plan quietly come out short. Commitments are per
 * weekday and are not counted here.
 */
export function windowCapacityFor(state: Pick<WizardState, 'windows' | 'noStudy'>, which: DayType): number {
  const windows = windowsFor(state.windows[which])
  const off = isClockTime(state.noStudy.start) && isClockTime(state.noStudy.end) ? spanIntervals(state.noStudy) : []
  let total = 0
  for (const w of windows) {
    const start = minuteOfDay(w.start)
    const end = minuteOfDay(w.end)
    let free = Math.max(0, end - start)
    for (const o of off) free -= Math.max(0, Math.min(end, o.end) - Math.max(start, o.start))
    total += Math.max(0, free)
  }
  return total
}

export function dayTypeOf(day: number): DayType {
  return day >= 5 ? 'weekend' : 'weekday'
}

/** Stated minutes per weekday after the Full / Half / None overrides, Monday first. For display. */
export function dayMinutes(state: Pick<WizardState, 'weekdayMinutes' | 'weekendMinutes' | 'dayLoads'>): number[] {
  return state.dayLoads.map((load, i) => {
    const stated = dayTypeOf(i) === 'weekend' ? state.weekendMinutes : state.weekdayMinutes
    if (load === 'none') return 0
    if (load === 'half') return Math.max(0, Math.round(stated / 2 / 5) * 5)
    return stated
  })
}

const DERIVED_ID = /^(dayoff$|half-)/

function isDerivedCommitment(c: Commitment): boolean {
  return DERIVED_ID.test(c.id)
}

/**
 * The Full / Half / None overrides as commitments, which is the one language
 * the engine's capacity model speaks. "None" blocks the whole day. "Half"
 * blocks the tail of that day type's windows until the free time inside
 * them is half of what the day would otherwise hold (the smaller of the
 * stated minutes and the windows), so it halves capacity rather than merely
 * trimming a window the stated minutes never filled.
 */
export function dayOverrideCommitments(
  state: Pick<WizardState, 'weekdayMinutes' | 'weekendMinutes' | 'dayLoads' | 'windows'>
): Commitment[] {
  const out: Commitment[] = []
  const none = state.dayLoads.map((l, i) => (l === 'none' ? (i as Weekday) : null)).filter((d): d is Weekday => d !== null)
  if (none.length > 0) out.push({ id: 'dayoff', label: 'Day off', kind: 'other', days: none, start: '00:00', end: '23:59' })

  for (const type of ['weekday', 'weekend'] as const) {
    const days = state.dayLoads
      .map((l, i) => (l === 'half' && dayTypeOf(i) === type ? (i as Weekday) : null))
      .filter((d): d is Weekday => d !== null)
    if (days.length === 0) continue
    const windows = windowsFor(state.windows[type])
    const stated = type === 'weekend' ? state.weekendMinutes : state.weekdayMinutes
    const total = windowMinutes(windows)
    const keep = Math.round(Math.min(stated, total) / 2)
    let remove = total - keep
    let n = 0
    for (let i = windows.length - 1; i >= 0 && remove > 0; i--) {
      const w = windows[i]!
      const len = minuteOfDay(w.end) - minuteOfDay(w.start)
      const cut = Math.min(len, remove)
      out.push({
        id: `half-${type}-${++n}`,
        label: 'Lighter day',
        kind: 'other',
        days,
        start: clockOf(minuteOfDay(w.end) - cut),
        end: w.end,
      })
      remove -= cut
    }
  }
  return out
}

/** The wizard's availability as the engine takes it. */
export function toAvailability(state: WizardState): RoadmapAvailability {
  const typed = state.commitments
    .filter((c) => c.label.trim() && c.days.length > 0 && isClockTime(c.start) && isClockTime(c.end) && c.start !== c.end)
    .map((c) => ({ ...c, label: c.label.trim(), days: [...c.days].sort((a, b) => a - b) }))
  return {
    weekdayMinutes: state.weekdayMinutes,
    weekendMinutes: state.weekendMinutes,
    windows: { weekday: windowsFor(state.windows.weekday), weekend: windowsFor(state.windows.weekend) },
    sessionLength: state.sessionLength,
    breakRhythm: state.breakRhythm,
    commitments: [...typed, ...dayOverrideCommitments(state)],
    noStudy: [{ ...state.noStudy }],
    quietHours: { ...state.quietHours },
    reminderTime: state.reminderTime,
  }
}

function pick<T>(record: Record<string, T>, keys: string[]): Record<string, T> {
  const out: Record<string, T> = {}
  for (const k of keys) if (record[k] !== undefined && record[k] !== '') out[k] = record[k] as T
  return out
}

/**
 * The date the plan starts on: today in the zone the student chose, not the
 * device's. A student who types Europe/London on a laptop set to Karachi at
 * half past midnight would otherwise get a plan that starts tomorrow and a
 * roadmap that says today is not on it. An unknown zone falls back to the
 * device's date.
 */
export function startDateFor(timeZone: string, deviceIso: string, now = new Date()): string {
  return isValidTimeZone(timeZone) ? todayInZone(timeZone, now) : deviceIso
}

/** The request the feasibility preview and the build both send. `todayIso` is the device's date; the start date is today in the chosen zone. */
export function toRequest(state: WizardState, todayIso: string): RoadmapBuildRequest {
  const subjects = [...state.subjects]
  const examDate = planExamDate(state) ?? ''
  const targetGrade = state.targetGrade.trim()
  // Every dated paper, and the three per-subject maps older readers expect: the subject's last date, its nearest paper's time and component.
  const exams: NonNullable<RoadmapBuildRequest['exams']> = []
  const subjectExamDates: Record<string, string> = {}
  const subjectExamTimes: Record<string, string> = {}
  const subjectComponents: Record<string, string> = {}
  for (const code of subjects) {
    const dated = datedPapers(state, code)
    for (const p of dated) {
      exams.push({ subjectCode: code, ...(p.component ? { component: p.component } : {}), examDate: p.date, ...(p.time ? { examTime: p.time } : {}) })
    }
    const first = dated[0] ?? firstPaper(state, code)
    const last = dated[dated.length - 1]
    if (last) subjectExamDates[code] = last.date
    if (first.time) subjectExamTimes[code] = first.time
    if (first.component) subjectComponents[code] = first.component
  }
  return {
    examDate,
    startDate: startDateFor(state.timeZone, todayIso),
    mode: state.mode,
    subjects,
    subjectExamDates,
    subjectExamTimes,
    subjectComponents,
    exams,
    selfRatings: pick(state.selfRatings, subjects),
    availabilityDetail: toAvailability(state),
    timeZone: state.timeZone,
    blockedDates: [...new Set(state.blockedDates.filter((d) => ISO_DATE.test(d)))].sort(),
    targetGrade: targetGrade || null,
    prioritySubject: state.prioritySubject,
    remindMe: state.remindMe,
  }
}

// --- the fine-tune fold on step three ------------------------------------------------

/** Fields step three keeps under "Fine-tune": a message on one of them opens the fold. */
export const FINE_TUNE_FIELDS: readonly string[] = ['noStudy', 'quietHours']

/**
 * True when anything under the fold is not at its default — a prior plan
 * with a generous break rhythm, a different sleep span or a day away. The
 * fold opens on its own then, so what the student set last time is never
 * hidden from them.
 */
export function fineTuneDiffersFromDefaults(
  state: Pick<WizardState, 'breakRhythm' | 'noStudy' | 'quietHours' | 'blockedDates'>
): boolean {
  const d = DEFAULT_AVAILABILITY
  return (
    state.breakRhythm !== d.breakRhythm ||
    !sameWindow(state.noStudy, d.noStudy[0]!) ||
    !sameWindow(state.quietHours, d.quietHours) ||
    state.blockedDates.length > 0
  )
}

// --- validation -----------------------------------------------------------------------

/** `field` names the input the message sits under; the step also lists them all. */
export type WizardIssue = { field: string; message: string }

function windowIssues(which: DayType, choice: WindowChoice, label: string): WizardIssue[] {
  const issues: WizardIssue[] = []
  if (choice.presets.length === 0 && !choice.custom) {
    issues.push({ field: `window:${which}`, message: `Pick when you would rather study on ${label}.` })
  }
  if (choice.custom) {
    if (!isClockTime(choice.custom.start) || !isClockTime(choice.custom.end)) {
      issues.push({ field: `window:${which}`, message: `The custom ${label} window needs a start and an end time.` })
    } else if (choice.custom.end <= choice.custom.start) {
      issues.push({ field: `window:${which}`, message: `The custom ${label} window must end after it starts.` })
    }
  }
  return issues
}

export function validateStep(
  state: WizardState,
  step: SetupStep,
  todayIso: string,
  labels: Record<string, string> = {}
): WizardIssue[] {
  const name = (code: string) => labels[code] ?? code
  const issues: WizardIssue[] = []

  if (step === 1) {
    if (state.subjects.length === 0) issues.push({ field: 'subjects', message: 'Pick at least one subject.' })
    for (const code of state.subjects) {
      const rows = papersOf(state, code)
      const seen = new Set<string>()
      rows.forEach((p, i) => {
        // "Mathematics" for a single paper; "Business Paper 2" (or "Business paper 2") when there are several.
        const which = rows.length > 1 ? `${name(code)} ${p.component || `paper ${i + 1}`}` : name(code)
        const dateField = `examDate:${code}:${p.id}`
        if (!p.date || !ISO_DATE.test(p.date)) issues.push({ field: dateField, message: `Set the exam date for ${which}.` })
        else if (p.date <= todayIso) issues.push({ field: dateField, message: `The ${which} exam date needs to be after today.` })
        else {
          const key = `${p.component}|${p.date}`
          if (seen.has(key)) issues.push({ field: dateField, message: `${which} is listed twice on the same date.` })
          seen.add(key)
        }
        if (p.time && !isClockTime(p.time)) issues.push({ field: `examTime:${code}:${p.id}`, message: `The ${which} exam time should look like 09:00.` })
      })
    }
    const zone = timeZoneIssue(state.timeZone)
    if (zone) issues.push(zone)
  }

  if (step === 2) {
    for (const code of state.subjects) {
      if (!state.selfRatings[code]) issues.push({ field: `rating:${code}`, message: `Say where you are in ${name(code)}.` })
    }
  }

  if (step === 3) {
    if (dayMinutes(state).every((m) => m === 0)) {
      issues.push({ field: 'minutes', message: 'Every day is set to none. Free up at least one.' })
    }
    issues.push(...windowIssues('weekday', state.windows.weekday, 'weekdays'))
    issues.push(...windowIssues('weekend', state.windows.weekend, 'weekends'))
    for (const c of state.commitments) {
      const what = c.label.trim() || 'A commitment'
      if (!c.label.trim()) issues.push({ field: `commitment:${c.id}`, message: 'Give the commitment a name.' })
      if (c.days.length === 0) issues.push({ field: `commitment:${c.id}`, message: `${what} needs at least one day.` })
      if (!isClockTime(c.start) || !isClockTime(c.end)) {
        issues.push({ field: `commitment:${c.id}`, message: `${what} needs a start and an end time.` })
      } else if (c.start === c.end) {
        issues.push({ field: `commitment:${c.id}`, message: `${what} starts and ends at the same time.` })
      }
    }
    if (!isClockTime(state.noStudy.start) || !isClockTime(state.noStudy.end) || state.noStudy.start === state.noStudy.end) {
      issues.push({ field: 'noStudy', message: 'The no-study span needs a start and an end time.' })
    }
    if (!isClockTime(state.quietHours.start) || !isClockTime(state.quietHours.end) || state.quietHours.start === state.quietHours.end) {
      issues.push({ field: 'quietHours', message: 'Quiet hours need a start and an end time.' })
    }
  }

  if (step === 4) {
    if (state.targetGrade.trim().length > TARGET_GRADE_MAX) {
      issues.push({ field: 'targetGrade', message: 'Keep the target grade short.' })
    }
    // The reminder time sits under the "email me each morning" box and is only shown when it is ticked,
    // so it is only checked then: a message about a hidden field cannot be acted on.
    if (state.remindMe && !isClockTime(state.reminderTime)) {
      issues.push({ field: 'reminderTime', message: 'The reminder time should look like 08:00.' })
    }
  }

  return issues
}

/** The first step with an issue, or null when the whole thing is ready to send. */
export function firstInvalidStep(state: WizardState, todayIso: string): SetupStep | null {
  for (const s of [1, 2, 3, 4] as const) if (validateStep(state, s, todayIso).length > 0) return s
  return null
}

export const COMMITMENT_KINDS: readonly CommitmentKind[] = ['tuition', 'school', 'sport', 'work', 'family', 'other']
