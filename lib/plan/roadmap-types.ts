/**
 * The Exam Roadmap's shared vocabulary.
 *
 * The roadmap is the study planner (lib/plan/build-study-plan.ts) grown into
 * a coach: a plan that says what to do next, why, and what changed when life
 * got in the way. Every layer — the pure engine, the service that hydrates
 * tasks into real MarkScheme destinations, the API routes, the setup wizard
 * and the roadmap screen — reads its types from here, so this file is the
 * contract and imports nothing.
 *
 * Three rules the types enforce:
 *
 *   Nothing is claimed without evidence. A task carries `why: EvidenceItem[]`
 *   and every item names its source and confidence. "Set in n of N papers"
 *   can only be said with a `stat` behind it; a topic with no data is "on the
 *   syllabus", not "high priority". A self-rating is a prior, never a verdict:
 *   the diagnostic decides whether a topic is weak.
 *
 *   The schedule is deterministic. Priorities, feasibility, placement and
 *   replans are pure functions of the snapshot in the plan. AI may explain;
 *   it never schedules.
 *
 *   Existing plans keep working. Every field the v3 engine adds to a block,
 *   a day or a plan is additive; v2 plans are normalised on read
 *   (lib/plan/roadmap-view.ts), never rewritten.
 *
 * Units, once and for all: a day's CAPACITY is wall-clock minutes inside the
 * student's windows (breaks included). WORK minutes exclude breaks and
 * buffers. Feasibility's supply is work minutes after layout, never
 * capacity × a ratio.
 */

// --- modes ---------------------------------------------------------------------

/**
 * The plan's style. Replaces the planner's preparedness ('pass' | 'secure' |
 * 'stretch'), which named a feeling rather than a strategy. The old codes
 * stay in the database and map onto these (lib/plan/modes.ts); a v3 plan
 * carries both so v2 readers keep working.
 */
export type RoadmapMode = 'foundation' | 'balanced' | 'polish'

export const ROADMAP_MODES: readonly RoadmapMode[] = ['foundation', 'balanced', 'polish']

// --- the student's own read -----------------------------------------------------

/**
 * Per subject, in the wizard's words. It sets the mastery PRIOR for leaves
 * with fewer than three marked attempts; it never decides whether a topic is
 * weak — the diagnostic step does that, and marked work overrides it.
 */
export type SelfRating = 'not_started' | 'rusty' | 'getting_there' | 'confident'

export const SELF_RATINGS: readonly SelfRating[] = ['not_started', 'rusty', 'getting_there', 'confident']

export const SELF_RATING_LABEL: Record<SelfRating, string> = {
  not_started: 'Not started',
  rusty: 'Rusty',
  getting_there: 'Getting there',
  confident: 'Confident',
}

/** Mastery prior (0–1) a self-rating implies. Blended with marks by attempt count (priority.ts). */
export const SELF_RATING_PRIOR: Record<SelfRating, number> = {
  not_started: 0.15,
  rusty: 0.35,
  getting_there: 0.6,
  confident: 0.8,
}

/** Marked attempts on a leaf before its percentage outranks the prior and may be called a weak area. */
export const CONFIDENT_ATTEMPTS = 3

// --- time ------------------------------------------------------------------------

/** 'HH:MM', 24-hour, in the plan's own zone. Validate with isClockTime() in availability.ts. */
export type ClockTime = string

/**
 * A span of a day. Windows must not cross midnight (end > start). A no-study
 * span, quiet hours or a commitment with end < start crosses midnight; the
 * engine splits it into [start, 24:00) today and [00:00, end) tomorrow.
 */
export type TimeWindow = { start: ClockTime; end: ClockTime }

/** Monday = 0 … Sunday = 6, matching WeekAvailability in the engine. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

/** The longest focused block the student wants. Breaks follow from it. */
export type SessionLength = 20 | 40 | 60

export const SESSION_LENGTHS: readonly SessionLength[] = [20, 40, 60]

/** How often to stop. Minutes off between blocks, and a longer one after a few. */
export type BreakRhythm = 'short' | 'standard' | 'generous'

export const BREAK_MINUTES: Record<BreakRhythm, { short: number; long: number }> = {
  short: { short: 5, long: 10 },
  standard: { short: 5, long: 15 },
  generous: { short: 10, long: 20 },
}

/** The long break comes after this many blocks: three short sessions, two longer ones. */
export const LONG_BREAK_AFTER: Record<SessionLength, number> = { 20: 3, 40: 2, 60: 2 }

export type CommitmentKind = 'tuition' | 'school' | 'sport' | 'work' | 'family' | 'other'

export const COMMITMENT_KIND_LABEL: Record<CommitmentKind, string> = {
  tuition: 'Tuition',
  school: 'School',
  sport: 'Sport',
  work: 'Work',
  family: 'Family time',
  other: 'Other',
}

/** A recurring weekly commitment. Hard: nothing is scheduled inside it. */
export type Commitment = {
  id: string
  label: string
  kind: CommitmentKind
  days: Weekday[]
  start: ClockTime
  end: ClockTime
}

/**
 * Real-life availability, as the wizard collects it. This is the ONLY
 * capacity input to the v3 engine: a day's capacity is the smaller of the
 * stated minutes and what fits inside the windows once commitments and
 * no-study spans are taken out. The planner's WeekAvailability (minutes per
 * weekday) and minutesPerDay are derived from it for the legacy columns and
 * readers, never sent back in.
 */
export type RoadmapAvailability = {
  /** Minutes on a normal weekday / weekend day, before windows are considered. */
  weekdayMinutes: number
  weekendMinutes: number
  /** When the student would rather study. Soft: used to place blocks and time reminders. */
  windows: { weekday: TimeWindow[]; weekend: TimeWindow[] }
  sessionLength: SessionLength
  breakRhythm: BreakRhythm
  commitments: Commitment[]
  /** Daily spans with no study at all (sleep, dinner). May cross midnight. */
  noStudy: TimeWindow[]
  /** No notifications inside this span. May cross midnight. */
  quietHours: TimeWindow
  /** When the morning check-in should arrive. */
  reminderTime: ClockTime
}

export const DEFAULT_AVAILABILITY: RoadmapAvailability = {
  weekdayMinutes: 90,
  weekendMinutes: 150,
  windows: {
    weekday: [{ start: '16:00', end: '21:00' }],
    weekend: [{ start: '10:00', end: '13:00' }, { start: '15:00', end: '19:00' }],
  },
  sessionLength: 40,
  breakRhythm: 'standard',
  commitments: [],
  noStudy: [{ start: '22:30', end: '07:00' }],
  quietHours: { start: '21:30', end: '07:30' },
  reminderTime: '08:00',
}

/** The API's floor: a 10-minute recall task is real work; below it nothing is. */
export const MIN_DAY_MINUTES = 10

// --- exams -----------------------------------------------------------------------

/** One paper the student sits. The finish line the whole roadmap counts down to. */
export type RoadmapExam = {
  subjectCode: string
  label: string
  board: string
  qualification: string
  /** Paper / component as the catalogue names it, e.g. "Paper 1". Filters topic pools where a leaf-level map exists. */
  component?: string
  /** ISO date. */
  examDate: string
  /** Start time when the student gave one. On the day, the exam is a commitment from midnight to examTime + paper + 60. */
  examTime?: ClockTime
  /** The paper's length, when the catalogue knows it. */
  paperMinutes?: number
}

// --- topic signals ---------------------------------------------------------------

/**
 * Everything the planner knows about one syllabus leaf, gathered by the
 * service and scored by lib/plan/priority.ts. Absent fields mean "no data",
 * which the scorer treats honestly (a diagnostic, not a verdict).
 */
export type TopicSignals = {
  code: string
  name: string
  parentCode?: string
  parentName?: string
  /** The leaf's paper label as the syllabus tree carries it (e.g. 'P1/P2', 'AS'). */
  paper?: string
  /** Position in the syllabus, 0-based. Earlier leaves under a real parent are a SOFT ordering hint, never a gate. */
  order: number
  /** Curriculum importance 0–1. 1 for every leaf today: no tree carries a core/option flag yet. */
  coreWeight: number
  /**
   * Representation in the papers MarkScheme has indexed for this subject
   * (and component, when known). Only present where enough papers are
   * tagged — see FREQUENCY_MIN_PAPERS / FREQUENCY_MIN_HITS in high-yield-rank.
   * `taggedShare` < 1 means not every question on those papers is tagged.
   */
  frequency?: { papers: number; of: number; from?: string; to?: string; taggedShare: number; scope: 'component' | 'subject' }
  /** From the student's own marked work. */
  mastery?: { percentage: number; attempts: number; lastAt?: string }
  /** Error classification keys (lib/error-classifications.ts) the marker keeps finding here. Never free text. */
  errorTags?: string[]
  /** A lesson quick check or a marked weak topic is due to come back. */
  reviewDueAt?: string
  /** Codes listed after this one under the same real parent. A soft hint only. */
  prerequisiteOf?: string[]
  /** True when the leaf's paper matches the student's nearest exam's component. */
  onNearestPaper?: boolean
}

/** A topic scored for scheduling, with the reasons that produced the score. Stored in study_plans.pools. */
export type TopicPriority = {
  code: string
  name: string
  score: number
  /** What the plan may say about it. At most three items; explanations ≤ 160 characters. */
  why: EvidenceItem[]
  /**
   * must: the mode insists on reaching it; should: reached when time allows;
   * could: the first cut when time is tight. A share of the score-ranked
   * pool, not a curriculum tier.
   */
  band: 'must' | 'should' | 'could'
  /** Mastery estimate 0–1 the scorer used, and how unsure it is (1 = prior only). */
  mastery: number
  uncertainty: number
  /** The loop the scorer expects; the diagnostic result may change it. */
  loop: 'weak' | 'strong'
}

// --- what the engine adds to a day and a plan -----------------------------------------

/** A commitment (or an exam) on one date, for the day's timeline. */
export type DayCommitment = { label: string; start: ClockTime; end: ClockTime; kind: CommitmentKind | 'exam' }

/** Optional on the planner's PlanDay; required on a RoadmapDay after normalisation. */
export type RoadmapDayExtras = {
  /** Wall-clock minutes inside the day's windows after commitments and no-study spans. 0 on rest and blocked days. */
  capacityMinutes: number
  /** Capacity not laid out — time in hand, never counted as work. */
  bufferMinutes: number
  commitments: DayCommitment[]
  /** The free intervals blocks were placed into, for the timeline. Empty for v2 plans. */
  windows: TimeWindow[]
}

/** Optional on the planner's StudyPlan; required on a RoadmapPlan after normalisation. */
export type RoadmapPlanExtras = {
  mode: RoadmapMode
  algorithmVersion: number
  revision: number
  feasibility: FeasibilityReport | null
  exams: RoadmapExam[]
  availabilityDetail: RoadmapAvailability | null
  selfRatings: Record<string, SelfRating>
  /** The last date the lazy rollover ran for; it never runs twice for one date. */
  lastRolledDate?: string
  /** The date of the last replan / rollover / check-in effect, for the "Adjusted" chip. */
  lastDiffDate?: string
  /** The diff behind lastDiffDate, so "See what changed" and Undo survive a page load. Cleared by undo. */
  lastDiff?: ReplanDiff
  /** Per task type, how much longer tasks actually take for this student (took_longer check-ins). Capped at 1.5. */
  durationScale?: Partial<Record<TaskType, number>>
  targetGrade?: string | null
}

// --- evidence --------------------------------------------------------------------

export type EvidenceType =
  /** Default: the leaf is on the syllabus for a paper the student sits. */
  | 'on_syllabus'
  /** Reserved for trees that carry an explicit core/option flag. None do today; never emitted. */
  | 'core_syllabus'
  | 'frequency'
  | 'weak_area'
  | 'self_rated'
  | 'prerequisite'
  | 'review_due'
  | 'nearest_paper'
  | 'recent_practice'
  | 'diagnostic'
  | 'mode'

export type EvidenceSource =
  | 'syllabus'
  | 'user_performance'
  | 'diagnostic'
  /** Papers MarkScheme has indexed; topic tags are classifier output, so never 'high' confidence. */
  | 'indexed_papers'
  | 'self_report'
  | 'plan'

export type EvidenceItem = {
  type: EvidenceType
  source: EvidenceSource
  confidence: 'high' | 'medium' | 'low'
  /** One line the student reads in the "Why this?" sheet. Built from templates and numbers only; never a prediction, never marker output. */
  explanation: string
  /** The number behind a claim, e.g. set in 9 of the 9 sittings indexed. */
  stat?: { n: number; of: number; from?: string; to?: string }
}

export const EVIDENCE_EXPLANATION_MAX = 160

// --- tasks -----------------------------------------------------------------------

export type TaskType =
  | 'diagnostic'
  | 'concept'
  | 'recall'
  | 'worked_example'
  | 'question'
  | 'timed_set'
  | 'error_review'
  | 'mixed'
  | 'timed_paper'
  | 'review'
  | 'buffer'
  | 'rest'
  | 'break'

export type TaskCategory = 'learn' | 'practise' | 'review' | 'recover'

export const TASK_CATEGORY: Record<TaskType, TaskCategory> = {
  diagnostic: 'practise',
  concept: 'learn',
  recall: 'review',
  worked_example: 'learn',
  question: 'practise',
  timed_set: 'practise',
  error_review: 'review',
  mixed: 'practise',
  timed_paper: 'practise',
  review: 'review',
  buffer: 'recover',
  rest: 'recover',
  break: 'recover',
}

export const TASK_CATEGORY_LABEL: Record<TaskCategory, string> = {
  learn: 'Learn',
  practise: 'Practise',
  review: 'Review',
  recover: 'Recover',
}

export const TASK_TYPE_LABEL: Record<TaskType, string> = {
  diagnostic: 'Quick diagnostic',
  concept: 'Concept refresh',
  recall: 'Active recall',
  worked_example: 'Worked example',
  question: 'Past-paper question',
  timed_set: 'Timed mini-set',
  error_review: 'Error-log review',
  mixed: 'Mixed-topic practice',
  timed_paper: 'Timed paper',
  review: 'Review',
  buffer: 'In hand',
  rest: 'Rest',
  break: 'Break',
}

/** The step a task plays in its topic's loop. Weak: diagnose → repair → recall → prove → review. */
export type LoopStep = 'diagnose' | 'repair' | 'recall' | 'prove' | 'review'

/**
 * What the v3 engine adds to every block. Required on a RoadmapTask; the
 * planner's PlanBlock carries them optionally so v2 plans still type-check,
 * and normaliseRoadmap() fills them in on read.
 */
export type RoadmapTaskFields = {
  /**
   * Stable across replans and rebuilds: `${date}-${subjectCode}-${topicCode ?? taskType}-${n}`
   * where n is the per-day ordinal of that tuple. Task state and events key
   * on it; a protected task keeps its id byte-for-byte.
   */
  id: string
  taskType: TaskType
  category: TaskCategory
  /** The concrete thing to do, from a template: "Complete one chain-rule question and check the M1 step." */
  objective: string
  why: EvidenceItem[]
  /** The TopicPriority score that placed it; 0 for breaks, rest and buffers. */
  priority: number
  loopStep?: LoopStep
  /** Steps placed after a diagnostic whose result is not in yet; the rollover re-branches them. */
  provisional?: boolean
  /** Suggested clock time inside the day's windows. Absent when the plan has no window data (v2). */
  startsAt?: ClockTime
  endsAt?: ClockTime
  pinned?: boolean
  /** Where "I need help" opens: the lesson's worked examples when it has them, its notes otherwise. Hydrated by the service. */
  helpHref?: string
}

// --- task state ------------------------------------------------------------------

export type TaskStatus = 'started' | 'done' | 'skipped' | 'deferred' | 'shortened' | 'swapped' | 'dropped'

/** The optional check-in after a task. Never required; never punished. Each one changes something (task-actions.ts). */
export type CheckinFeel = 'too_easy' | 'about_right' | 'too_hard' | 'took_longer' | 'was_busy' | 'need_help'

export const CHECKIN_FEEL_LABEL: Record<CheckinFeel, string> = {
  too_easy: 'Too easy',
  about_right: 'About right',
  too_hard: 'Too difficult',
  took_longer: 'Took longer than expected',
  was_busy: 'I was busy',
  need_help: 'I need help',
}

/**
 * What each feeling does — the contract task-actions.ts implements and the
 * check-in sheet promises. Every effect is a diff with an undo. Written in
 * the student's words, not the loop's: "refresh", "recall" and "past-paper
 * question" are things they can see on the timeline; "repair step" and
 * "marked question" are engine vocabulary they never learned.
 */
export const CHECKIN_FEEL_EFFECT: Record<CheckinFeel, string> = {
  too_easy: "We'll skip the refresh and recall on this topic and go straight to its past-paper question.",
  about_right: 'Nothing changes — the plan is sized right for you.',
  too_hard: 'A short refresh of this topic goes first on your next study day.',
  took_longer: 'Tasks like this get a little more time from now on.',
  was_busy: 'The rest of this topic moves to the next day with room. Nothing piles up.',
  need_help: "We'll open a worked example now and put a short refresh next.",
}

export type TaskStateEntry = {
  status: TaskStatus
  /** ISO timestamp of the latest change. */
  at: string
  actualMinutes?: number
  feel?: CheckinFeel
  reason?: string
  /** Minutes after a shorten. */
  minutes?: number
  /** ISO date a deferred task was moved to. A task is deferred at most once. */
  deferredTo?: string
  /** The topic code a swapped task replaced. */
  swappedFrom?: string
}

/** Task id → its state. Lives in study_plans.task_state. */
export type TaskState = Record<string, TaskStateEntry>

// --- feasibility -----------------------------------------------------------------

/**
 * Whether the work fits the time. Three honest states, never a silent
 * impossible plan. on_track: every topic's loop is on the calendar and
 * supply ≥ the whole pool's demand (no subject has topics waiting or
 * opened-but-unproved); focused: supply ≥ the priority (must-band) demand;
 * tight: below that. A subject in its taper contributes review demand only
 * and is never "tight".
 */
export type FeasibilityState = 'on_track' | 'focused' | 'tight'

export const FEASIBILITY_LABEL: Record<FeasibilityState, string> = {
  on_track: 'On track',
  focused: 'Focused plan',
  tight: 'Time is tight',
}

export type FeasibilitySubject = {
  code: string
  label: string
  daysToPaper: number
  /** Priority (must-band) topics in this mode, and how many topics the plan reaches — a topic is reached only when its marked question is on the calendar. */
  mustTopics: number
  plannedTopics: number
  /** Priority topics whose loop fits in the study days before the taper, never below plannedTopics (so the card never says "N of N" while more are on the calendar). 0 for a review-only subject. */
  mustReachable?: number
  /** Topics opened (a diagnostic or a lesson placed) whose marked question is not on the calendar yet. */
  started?: string[]
  /** Topics left for later, least important first. */
  later: string[]
  /** Work minutes scheduled for this subject. */
  minutes: number
  /** The subject is in its taper: nothing new is planned before this paper. */
  reviewOnly?: boolean
}

export type FeasibilityOption = 'keep' | 'add_time' | 'prioritise_subject' | 'change_mode'

export type FeasibilityReport = {
  state: FeasibilityState
  /** Work minutes across study days after layout — what the plan can actually hold. */
  supplyMinutes: number
  /** Work minutes the plan scheduled. */
  plannedMinutes: number
  /** Work minutes the priority (must-band) loops need in this mode, and the whole pool's loops — everything the mode would like. */
  demandMustMinutes: number
  demandFullMinutes: number
  /** Σ(work + breaks) / Σ capacity — the 75–85% rule made visible. */
  utilisation: number
  /** supply / demand, for calibration in plan:report. */
  ratios: { must: number; full: number }
  subjects: FeasibilitySubject[]
  /** Plain sentences about what was cut and why. */
  tradeoffs: string[]
  options: FeasibilityOption[]
  headline: string
  /** Σ capacity and Σ(work + breaks) over study days, and how many study days there are — so "in hand" is arithmetic, not a ratio. */
  capacityMinutes?: number
  laidMinutes?: number
  studyDays?: number
}

/** Share of a day's capacity the engine lays work and breaks into; the rest is in hand. */
export const UTILISATION_TARGET = 0.8
export const UTILISATION_MIN = 0.75
export const UTILISATION_MAX = 0.85
/** A buffer block is only shown when at least this long; smaller reserves stay implicit. */
export const MIN_BUFFER_MINUTES = 10

// --- replanning ------------------------------------------------------------------

export type ReplanChangeKind = 'moved' | 'shortened' | 'dropped' | 'added' | 'swapped' | 'inserted' | 'resized' | 'kept'

export type ReplanChange = {
  taskId: string
  kind: ReplanChangeKind
  label: string
  detail?: string
}

/** What a replan, rollover or check-in effect did, shown to the student with an undo. */
export type ReplanDiff = {
  date: string
  changes: ReplanChange[]
  /** Done, pinned and started tasks: never moved. */
  protectedTaskIds: string[]
  /** "Plans change. We protected the essentials and rebuilt today." */
  summary: string
}

/** One day as it was, in the plan's stored shape. */
export type UndoDay = {
  date: string
  blocks: unknown[]
  workMinutes: number
  bufferMinutes?: number
  focus: string
}

/**
 * The single-level undo point, a few KB: the days a change touched and
 * their task state, not the whole plan. `date` is the day the diff was
 * shown for; `days` carries every date the change reached (a defer or a
 * rollover touches two), so undoing one restores both sides.
 */
export type UndoSnapshot = {
  revision: number
  date: string
  /** The day's blocks as they were, in the plan's stored shape. */
  blocks: unknown[]
  workMinutes: number
  bufferMinutes?: number
  focus: string
  /** Task state for every snapshotted date (entries keyed by id, ids start with the date). */
  taskStateForDay: TaskState
  summary: string
  /** The other dates the change touched, as they were. */
  otherDays?: UndoDay[]
  /** Plan-level fields the change may have set, restored with it. */
  lastDiffDate?: string | null
  lastDiff?: ReplanDiff | null
  durationScale?: Partial<Record<TaskType, number>> | null
}

/** The calm chip at the top of the roadmap. */
export type RoadmapStatus = 'on_track' | 'adjusted' | 'reset'

/**
 * 'adjusted' says only that something changed: the hero line beneath the
 * chip says what and when, and a too_hard check-in lands on the next study
 * day, so "Adjusted today" was wrong half the time.
 */
export const ROADMAP_STATUS_LABEL: Record<RoadmapStatus, string> = {
  on_track: 'On track',
  adjusted: 'Adjusted',
  reset: "Let's reset",
}

// --- API -------------------------------------------------------------------------

/** POST /api/plan. Legacy fields (preparedness, minutesPerDay, availability alone) still build a v2-style plan. */
export type RoadmapBuildRequest = {
  /** The last exam; a subject dated later extends the plan. */
  examDate: string
  startDate?: string
  mode: RoadmapMode
  subjects: string[]
  subjectExamDates?: Record<string, string>
  subjectExamTimes?: Record<string, ClockTime>
  /** Paper / component per subject, where the student chose one. */
  subjectComponents?: Record<string, string>
  selfRatings?: Record<string, SelfRating>
  /** When present, minutes per weekday and minutesPerDay are DERIVED from it; anything else sent is ignored. */
  availabilityDetail?: RoadmapAvailability
  /** Legacy: minutes per weekday, Monday first. Only read when availabilityDetail is absent. */
  availability?: number[]
  timeZone?: string
  blockedDates?: string[]
  /** Private motivation; never shown in copy as a promise. */
  targetGrade?: string | null
  /** The feasibility option "prioritise one subject": its priority topics are admitted before the others'. */
  prioritySubject?: string | null
  remindMe?: boolean
  /** Return the plan and its feasibility without hydrating or saving. */
  preview?: boolean
}

export type TaskAction = 'start' | 'complete' | 'shorten' | 'skip' | 'defer' | 'swap' | 'checkin' | 'pin' | 'unpin'

/** PATCH /api/plan/task. Repeating a terminal action is a no-op that returns the current state. */
export type TaskActionRequest = {
  taskId: string
  action: TaskAction
  /** The plan revision the client is looking at; 409 { error: 'stale', revision } on mismatch. */
  revision: number
  actualMinutes?: number
  feel?: CheckinFeel
  reason?: string
  /** Target length for shorten. */
  minutes?: number
}

/** POST /api/plan/replan. The date is the one on screen; the server refuses (409) if it is not the plan's today. */
export type ReplanRequest = {
  scope: 'today'
  date: string
  /** Minutes since local midnight on the client, so "the rest of today" is the student's. */
  nowMinute: number
  revision: number
  minutesLeft?: number
}

/** What task, replan and undo routes return: one day, not the whole plan. The client splices it in. */
export type DayMutationResponse<Day> = {
  date: string
  day: Day
  taskState: TaskState
  diff?: ReplanDiff
  revision: number
  /** Effects on other days (a check-in inserting tomorrow's repair), by date. */
  otherDays?: Array<{ date: string; day: Day }>
  /** The plan's "Adjusted" marks as they now stand (null = cleared), and whether an undo point exists. */
  lastDiffDate?: string | null
  lastDiff?: ReplanDiff | null
  canUndo?: boolean
}

/**
 * GET /api/plan/today — what the lesson page, /mark and notifications need,
 * nothing more.
 *
 * The summary is materialised into study_plans.today_summary on every
 * write, and the today route serves it straight from that column when it
 * is still today's and no rollover is pending (the fast path — no plan
 * load, no evidence query). Only `remainingMinutes` depends on the clock,
 * so the row also stores the two numbers it is derived from
 * (`openMinutes`, `windowEndMinute`) and the route redoes that one sum
 * (remainingMinutesAt in task-actions.ts). A summary written before these
 * fields existed has neither, and the route takes the full path instead.
 */
export type RoadmapTodaySummary = {
  hasPlan: boolean
  date?: string
  revision?: number
  dayNumber?: number
  daysLeft?: number
  nearestExam?: { label: string; date: string; daysLeft: number }
  status?: RoadmapStatus
  /** min(openMinutes, minutes left in today's windows) at the moment the summary was computed. */
  remainingMinutes?: number
  /** The day's open tasks' minutes at write time, before the clock caps them. */
  openMinutes?: number
  /** Minute of day the last window ends; null when the plan carries no windows (a v2 plan), so the clock never caps it. */
  windowEndMinute?: number | null
  nextTask?: {
    id: string
    label: string
    objective: string
    minutes: number
    href?: string
    subjectLabel?: string
    category: TaskCategory
    /** For the chip: "Roadmap · Quick diagnostic · Equations of motion · 10 min". Absent on a summary written before v3.1. */
    taskType?: TaskType
    /** The topic's name, when the task has one. */
    topic?: string
    startsAt?: ClockTime
  }
  feasibility?: FeasibilityState
}

// --- analytics -------------------------------------------------------------------

/** Server-side events in study_plan_events; the client funnel mirrors the activation/engagement ones. */
export type RoadmapEventType =
  | 'roadmap_started'
  | 'roadmap_generated'
  | 'roadmap_accepted'
  | 'roadmap_viewed'
  | 'task_started'
  | 'task_completed'
  | 'task_skipped'
  | 'task_swapped'
  | 'task_shortened'
  | 'task_deferred'
  | 'task_checkin'
  | 'roadmap_replanned'
  | 'roadmap_rollover'
  | 'roadmap_undo'
  | 'why_this_task_opened'
  | 'reminder_clicked'
  | 'plan_felt_realistic'
  | 'understood_why'

/** Kinds of nudge the roadmap may send. Opt-in, quiet-hours aware, backs off when ignored. */
export type RoadmapNotificationKind =
  | 'block_ready'
  | 'after_commitment'
  | 'adjusted_after_busy_day'
  | 'milestone_close'
  | 'morning_checkin'

/** Words no roadmap notification or check-in line may contain (pinned by test). */
export const FORBIDDEN_NUDGE_WORDS: readonly string[] = ['behind', 'missed', 'streak', 'catch up', 'failed', 'everyone else']
