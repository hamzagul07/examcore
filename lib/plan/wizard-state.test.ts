import assert from 'node:assert/strict'
import type { RoadmapPlan } from '@/lib/plan/roadmap-view'
import { DEFAULT_AVAILABILITY } from '@/lib/plan/roadmap-types'
import {
  FINE_TUNE_FIELDS,
  TIME_ZONE_FALLBACK,
  TIME_ZONE_ISSUE,
  browserTimeZone,
  dayMinutes,
  dayOverrideCommitments,
  fineTuneDiffersFromDefaults,
  firstInvalidStep,
  initialWizardState,
  isClockTime,
  planExamDate,
  ratingFromMeasured,
  supportedTimeZones,
  timeZoneIssue,
  timeZoneSource,
  toAvailability,
  toRequest,
  validateStep,
  windowsFor,
  wizardReducer,
  type SetupProfile,
  type WizardState,
  startDateFor,
} from '@/lib/plan/wizard-state'

const TODAY = '2026-09-17'

const profile: SetupProfile = {
  board: 'Cambridge International',
  level: 'A Level',
  examDate: '2026-11-15',
  subjectCodes: ['9709', '9702'],
  remindMe: true,
  timeZone: 'Asia/Karachi',
  measured: { '9709': { pct: 52, attempts: 5 }, '9702': { pct: 80, attempts: 2 } },
}

const labels = { '9709': 'Mathematics', '9702': 'Physics', '9701': 'Chemistry' }

// --- fresh state from the profile ---------------------------------------------------

{
  const s = initialWizardState(profile, null)
  assert.equal(s.step, 1)
  assert.deepEqual(s.subjects, ['9709', '9702'])
  assert.deepEqual(s.examDates, { '9709': '2026-11-15', '9702': '2026-11-15' })
  assert.equal(s.timeZone, 'Asia/Karachi')
  // Five marked attempts at 52% pre-select "getting there"; two attempts say nothing.
  assert.deepEqual(s.selfRatings, { '9709': 'getting_there' })
  assert.equal(s.weekdayMinutes, DEFAULT_AVAILABILITY.weekdayMinutes)
  assert.equal(s.weekendMinutes, DEFAULT_AVAILABILITY.weekendMinutes)
  assert.deepEqual(s.windows.weekday.presets, ['evening'])
  assert.deepEqual(s.windows.weekend.presets, ['morning', 'afternoon'])
  assert.equal(s.mode, 'balanced')
  assert.equal(s.remindMe, true)
  assert.deepEqual(s.noStudy, DEFAULT_AVAILABILITY.noStudy[0])
  assert.equal(s.reminderTime, DEFAULT_AVAILABILITY.reminderTime)
}

assert.equal(ratingFromMeasured(undefined), null)
assert.equal(ratingFromMeasured({ pct: 30, attempts: 2 }), null, 'two attempts are not enough to go on')
assert.equal(ratingFromMeasured({ pct: 30, attempts: 3 }), 'rusty')
assert.equal(ratingFromMeasured({ pct: 64, attempts: 3 }), 'getting_there')
assert.equal(ratingFromMeasured({ pct: 65, attempts: 3 }), 'confident')

// --- prefill from a prior plan --------------------------------------------------------

const prior = {
  examDate: '2026-11-20',
  subjects: [
    { code: '9709', label: 'Mathematics', examDate: '2026-11-20' },
    { code: '9701', label: 'Chemistry', examDate: '2026-11-10' },
  ],
  exams: [
    { subjectCode: '9709', label: 'Mathematics', board: 'Cambridge International', qualification: 'A Level', examDate: '2026-11-20', examTime: '09:00', component: 'Paper 1' },
    { subjectCode: '9701', label: 'Chemistry', board: 'Cambridge International', qualification: 'A Level', examDate: '2026-11-10' },
  ],
  availability: [60, 60, 0, 60, 30, 100, 100],
  minutesPerDay: 60,
  availabilityDetail: {
    weekdayMinutes: 60,
    weekendMinutes: 100,
    windows: { weekday: [{ start: '17:00', end: '22:00' }, { start: '06:00', end: '07:30' }], weekend: [{ start: '07:00', end: '12:00' }] },
    sessionLength: 20,
    breakRhythm: 'generous',
    commitments: [
      { id: 'c1', label: 'Tuition', kind: 'tuition', days: [1, 3], start: '18:00', end: '19:30' },
      { id: 'dayoff', label: 'Day off', kind: 'other', days: [2], start: '00:00', end: '23:59' },
    ],
    noStudy: [{ start: '23:00', end: '06:00' }],
    quietHours: { start: '22:00', end: '07:00' },
    reminderTime: '07:15',
  },
  selfRatings: { '9709': 'confident', '9701': 'rusty' },
  mode: 'polish',
  blockedDates: ['2026-10-02'],
  timeZone: 'Europe/London',
  targetGrade: 'A*',
} as unknown as RoadmapPlan

{
  const s = initialWizardState({ ...profile, measured: {} }, prior)
  assert.deepEqual(s.subjects, ['9709', '9701'], 'subjects come from the prior plan, not the profile')
  assert.deepEqual(s.examDates, { '9709': '2026-11-20', '9701': '2026-11-10' })
  assert.deepEqual(s.examTimes, { '9709': '09:00' })
  assert.deepEqual(s.components, { '9709': 'Paper 1' })
  assert.deepEqual(s.selfRatings, { '9709': 'confident', '9701': 'rusty' })
  assert.equal(s.mode, 'polish')
  assert.equal(s.targetGrade, 'A*')
  assert.equal(s.weekdayMinutes, 60)
  assert.equal(s.weekendMinutes, 100)
  // Loads come from the synthetic commitments, never from the stored capacity: Friday's 30 minutes
  // (a window the stated minutes never filled) is still a full day the student never chose to halve.
  assert.deepEqual(s.dayLoads, ['full', 'full', 'none', 'full', 'full', 'full', 'full'])
  assert.deepEqual(s.windows.weekday, { presets: ['evening'], custom: { start: '06:00', end: '07:30' } })
  assert.deepEqual(s.windows.weekend, { presets: ['morning'], custom: null })
  assert.equal(s.sessionLength, 20)
  assert.equal(s.breakRhythm, 'generous')
  assert.deepEqual(s.commitments.map((c) => c.id), ['c1'], 'the synthetic day-off row is a load, not a commitment')
  assert.deepEqual(s.noStudy, { start: '23:00', end: '06:00' })
  assert.deepEqual(s.quietHours, { start: '22:00', end: '07:00' })
  assert.equal(s.reminderTime, '07:15')
  assert.deepEqual(s.blockedDates, ['2026-10-02'])
  assert.equal(s.timeZone, 'Asia/Karachi', 'the profile zone wins over the stored one')
}
{
  // A saved half day reads back as 'half' and a rebuild keeps it at half, not a quarter.
  const halved = {
    ...prior,
    availability: [60, 30, 0, 60, 60, 100, 100],
    availabilityDetail: {
      ...prior.availabilityDetail!,
      commitments: [...prior.availabilityDetail!.commitments, { id: 'half-weekday-1', label: 'Lighter day', kind: 'other', days: [1], start: '19:30', end: '22:00' }],
    },
  } as unknown as RoadmapPlan
  const s = initialWizardState({ ...profile, measured: {} }, halved)
  assert.deepEqual(s.dayLoads, ['full', 'half', 'none', 'full', 'full', 'full', 'full'])
  const again = toAvailability(s)
  const half = again.commitments.filter((c) => c.id.startsWith('half-'))
  assert.ok(half.length >= 1 && half.every((c) => c.days.length === 1 && c.days[0] === 1), 'only the chosen half day is halved again')
  assert.ok(!again.commitments.some((c) => c.id.startsWith('half-') && c.days.includes(4)), 'a short weekday is not halved by the round trip')
}
{
  // Marked work outranks the stored rating; the profile's zone option wins over everything.
  const s = initialWizardState({ ...profile, measured: { '9709': { pct: 30, attempts: 4 } } }, prior, { timeZone: 'UTC' })
  assert.equal(s.selfRatings['9709'], 'rusty')
  assert.equal(s.timeZone, 'UTC')
}

// --- reducer -----------------------------------------------------------------------------

{
  let s = initialWizardState(profile, null)
  s = wizardReducer(s, { type: 'toggle_subject', code: '9701' })
  assert.deepEqual(s.subjects, ['9709', '9702', '9701'])
  assert.equal(s.examDates['9701'], '2026-11-15', 'a new subject takes the latest date already set')
  s = wizardReducer(s, { type: 'toggle_subject', code: '9708' })
  s = wizardReducer(s, { type: 'toggle_subject', code: '9706' })
  assert.equal(s.subjects.length, 4, 'capped at four')
  s = wizardReducer(s, { type: 'set_priority_subject', code: '9701' })
  s = wizardReducer(s, { type: 'toggle_subject', code: '9701' })
  assert.equal(s.subjects.includes('9701'), false)
  assert.equal(s.prioritySubject, null, 'dropping the prioritised subject clears the priority')

  s = wizardReducer(s, { type: 'set_exam_date', code: '9709', date: '2026-12-01' })
  assert.equal(planExamDate(s), '2026-12-01', 'the plan runs to the latest paper')
  s = wizardReducer(s, { type: 'set_all_exam_dates', date: '2026-11-15' })
  assert.equal(planExamDate(s), '2026-11-15')

  s = wizardReducer(s, { type: 'cycle_day_load', day: 2 })
  assert.equal(s.dayLoads[2], 'half')
  s = wizardReducer(s, { type: 'cycle_day_load', day: 2 })
  assert.equal(s.dayLoads[2], 'none')
  s = wizardReducer(s, { type: 'cycle_day_load', day: 2 })
  assert.equal(s.dayLoads[2], 'full')

  s = wizardReducer(s, { type: 'add_minutes', minutes: 30 })
  assert.equal(s.weekdayMinutes, 120)
  assert.equal(s.weekendMinutes, 180)
  s = wizardReducer(s, { type: 'set_minutes', which: 'weekday', minutes: 900 })
  assert.equal(s.weekdayMinutes, 300, 'clamped')

  s = wizardReducer(s, { type: 'toggle_window', which: 'weekday', preset: 'afternoon' })
  assert.deepEqual(windowsFor(s.windows.weekday), [{ start: '12:00', end: '22:00' }], 'adjacent presets merge')
  s = wizardReducer(s, { type: 'toggle_window', which: 'weekday', preset: 'afternoon' })
  assert.deepEqual(windowsFor(s.windows.weekday), [{ start: '17:00', end: '22:00' }])

  s = wizardReducer(s, { type: 'add_commitment' })
  s = wizardReducer(s, { type: 'add_commitment' })
  assert.deepEqual(s.commitments.map((c) => c.id), ['c1', 'c2'])
  s = wizardReducer(s, { type: 'remove_commitment', id: 'c1' })
  s = wizardReducer(s, { type: 'add_commitment' })
  assert.deepEqual(s.commitments.map((c) => c.id), ['c2', 'c3'], 'ids never repeat')
  s = wizardReducer(s, { type: 'toggle_commitment_day', id: 'c2', day: 3 })
  s = wizardReducer(s, { type: 'toggle_commitment_day', id: 'c2', day: 1 })
  assert.deepEqual(s.commitments[0]!.days, [1, 3], 'days stay sorted')
  s = wizardReducer(s, { type: 'update_commitment', id: 'c2', patch: { label: 'Tuition', start: '18:00', end: '19:30' } })
  assert.equal(s.commitments[0]!.label, 'Tuition')

  s = wizardReducer(s, { type: 'add_blocked_date', date: '2026-10-05' })
  s = wizardReducer(s, { type: 'add_blocked_date', date: '2026-10-01' })
  s = wizardReducer(s, { type: 'add_blocked_date', date: '2026-10-01' })
  assert.deepEqual(s.blockedDates, ['2026-10-01', '2026-10-05'], 'sorted and unique')
  s = wizardReducer(s, { type: 'add_blocked_date', date: 'not a date' })
  assert.equal(s.blockedDates.length, 2)

  s = wizardReducer(s, { type: 'set_target_grade', targetGrade: 'A* in everything please' })
  assert.equal(s.targetGrade.length, 12, 'trimmed to the maximum')
  s = wizardReducer(s, { type: 'set_priority_subject', code: 'nope' })
  assert.equal(s.prioritySubject, null, 'only a subject on the plan can be prioritised')
}

// --- derivations -------------------------------------------------------------------------

{
  const s: WizardState = { ...initialWizardState(profile, null), weekdayMinutes: 90, weekendMinutes: 150, dayLoads: ['full', 'half', 'none', 'full', 'full', 'half', 'full'] }
  assert.deepEqual(dayMinutes(s), [90, 45, 0, 90, 90, 75, 150])

  const derived = dayOverrideCommitments(s)
  const dayOff = derived.find((c) => c.id === 'dayoff')
  assert.deepEqual(dayOff, { id: 'dayoff', label: 'Day off', kind: 'other', days: [2], start: '00:00', end: '23:59' })
  // Weekday window 17:00–22:00 (300 min) with 90 stated: a half day keeps 45 free, so 255 are blocked from the tail.
  const halfWeekday = derived.filter((c) => c.id.startsWith('half-weekday'))
  assert.deepEqual(halfWeekday, [{ id: 'half-weekday-1', label: 'Lighter day', kind: 'other', days: [1], start: '17:45', end: '22:00' }])
  // Weekend 07:00–17:00 merged (600 min) with 150 stated: keep 75, block 525 → 08:15 onwards.
  const halfWeekend = derived.filter((c) => c.id.startsWith('half-weekend'))
  assert.deepEqual(halfWeekend, [{ id: 'half-weekend-1', label: 'Lighter day', kind: 'other', days: [5], start: '08:15', end: '17:00' }])
}
{
  // A half day whose cut spans two windows produces one row per window.
  const s: WizardState = {
    ...initialWizardState(profile, null),
    weekendMinutes: 150,
    dayLoads: ['full', 'full', 'full', 'full', 'full', 'full', 'half'],
    windows: { weekday: { presets: ['evening'], custom: null }, weekend: { presets: ['morning'], custom: { start: '15:00', end: '16:00' } } },
  }
  const rows = dayOverrideCommitments(s).filter((c) => c.id.startsWith('half-weekend'))
  // Windows 07:00–12:00 + 15:00–16:00 = 360 min; keep 75; remove 285: all of 15:00–16:00 then 225 off the morning.
  assert.deepEqual(rows.map((r) => [r.start, r.end, r.days]), [['15:00', '16:00', [6]], ['08:15', '12:00', [6]]])
}
{
  let s = initialWizardState(profile, null)
  s = wizardReducer(s, { type: 'add_commitment' })
  s = wizardReducer(s, { type: 'update_commitment', id: 'c1', patch: { label: '  Football ', kind: 'sport', start: '16:00', end: '18:00' } })
  s = wizardReducer(s, { type: 'toggle_commitment_day', id: 'c1', day: 5 })
  s = wizardReducer(s, { type: 'add_commitment' })
  const a = toAvailability(s)
  assert.deepEqual(a.commitments, [{ id: 'c1', label: 'Football', kind: 'sport', days: [5], start: '16:00', end: '18:00' }], 'an empty row is dropped, labels are trimmed')
  assert.deepEqual(a.windows.weekday, [{ start: '17:00', end: '22:00' }])
  assert.deepEqual(a.windows.weekend, [{ start: '07:00', end: '17:00' }])
  assert.deepEqual(a.noStudy, [DEFAULT_AVAILABILITY.noStudy[0]])
}

// --- validation ------------------------------------------------------------------------------

{
  const empty = wizardReducer(wizardReducer(initialWizardState(profile, null), { type: 'toggle_subject', code: '9709' }), { type: 'toggle_subject', code: '9702' })
  assert.deepEqual(validateStep(empty, 1, TODAY), [{ field: 'subjects', message: 'Pick at least one subject.' }])
}
{
  let s = initialWizardState(profile, null)
  s = wizardReducer(s, { type: 'set_exam_date', code: '9702', date: '2026-09-17' })
  s = wizardReducer(s, { type: 'set_exam_date', code: '9709', date: '' })
  s = wizardReducer(s, { type: 'set_exam_time', code: '9702', time: '9am' })
  s = wizardReducer(s, { type: 'set_time_zone', timeZone: 'Mars/Olympus' })
  const issues = validateStep(s, 1, TODAY, labels)
  assert.deepEqual(issues.map((i) => i.field), ['examDate:9709', 'examDate:9702', 'examTime:9702', 'timeZone'])
  assert.equal(issues[0]!.message, 'Set the exam date for Mathematics.')
  assert.equal(issues[1]!.message, 'The Physics exam date needs to be after today.')
  assert.equal(issues[3]!.message, TIME_ZONE_ISSUE, 'the step and the blurred field say the same thing')
  assert.equal(validateStep(initialWizardState(profile, null), 1, TODAY).length, 0)
}

// --- the zone field: its list, its source note and its on-blur check --------------------

{
  assert.equal(timeZoneIssue('Europe/London'), null)
  assert.equal(timeZoneIssue('UTC'), null)
  assert.deepEqual(timeZoneIssue('Mars/Olympus'), { field: 'timeZone', message: TIME_ZONE_ISSUE })
  assert.deepEqual(timeZoneIssue(''), { field: 'timeZone', message: TIME_ZONE_ISSUE })
  assert.ok(!/[!]/.test(TIME_ZONE_ISSUE), 'no exclamation marks')
}
{
  // The note beside the field is only ever one of three true things.
  assert.equal(timeZoneSource('Asia/Karachi', 'Asia/Karachi', 'Asia/Karachi'), 'device', 'the device wins a tie')
  assert.equal(timeZoneSource('Asia/Karachi', 'Europe/London', 'Asia/Karachi'), 'account')
  assert.equal(timeZoneSource('Asia/Karachi', 'Europe/London', undefined), 'typed')
  assert.equal(timeZoneSource('Asia/Tokyo', 'Europe/London', 'Asia/Karachi'), 'typed', 'an edited value is neither')
  assert.equal(timeZoneSource('', 'Europe/London', ''), 'typed')
}
{
  const zones = supportedTimeZones()
  assert.ok(zones.includes('Europe/London') && zones.includes('Asia/Karachi'), 'the runtime list or the fallback, either way the common zones are there')
  assert.deepEqual(zones, [...zones].sort(), 'sorted for the datalist')
  assert.equal(new Set(zones).size, zones.length, 'no duplicates')
  assert.ok(supportedTimeZones(['Etc/Nowhere']).includes('Etc/Nowhere'), 'the current value is always in its own list')
  assert.ok(!supportedTimeZones(['']).includes(''), 'an empty value adds nothing')
  assert.ok(TIME_ZONE_FALLBACK.every((z) => timeZoneIssue(z) === null), 'every fallback zone is one Intl knows')
  assert.equal(timeZoneIssue(browserTimeZone()), null, 'the device zone always validates')
}
{
  const s = initialWizardState(profile, null)
  assert.deepEqual(validateStep(s, 2, TODAY, labels), [{ field: 'rating:9702', message: 'Say where you are in Physics.' }])
  assert.equal(validateStep(wizardReducer(s, { type: 'set_rating', code: '9702', rating: 'confident' }), 2, TODAY).length, 0)
}
{
  let s = initialWizardState(profile, null)
  assert.equal(validateStep(s, 3, TODAY).length, 0, 'the defaults are valid')
  s = { ...s, dayLoads: ['none', 'none', 'none', 'none', 'none', 'none', 'none'] }
  s = wizardReducer(s, { type: 'toggle_window', which: 'weekday', preset: 'evening' })
  s = wizardReducer(s, { type: 'set_custom_window', which: 'weekend', window: { start: '15:00', end: '14:00' } })
  s = wizardReducer(s, { type: 'add_commitment' })
  s = wizardReducer(s, { type: 'update_commitment', id: 'c1', patch: { label: 'Tuition', start: '18:00', end: '18:00' } })
  s = wizardReducer(s, { type: 'set_reminder_time', time: '8' })
  s = wizardReducer(s, { type: 'set_no_study', window: { start: '22:00', end: '22:00' } })
  const fields = validateStep(s, 3, TODAY).map((i) => i.field)
  // The reminder time is asked on step four now, beside the email it sets; step three never mentions it.
  assert.deepEqual(fields, ['minutes', 'window:weekday', 'window:weekend', 'commitment:c1', 'commitment:c1', 'noStudy'])
  const messages = validateStep(s, 3, TODAY).map((i) => i.message)
  assert.ok(messages.includes('The custom weekends window must end after it starts.'))
  assert.ok(messages.includes('Tuition needs at least one day.'))
  // Every field that can carry a message inside the fine-tune fold is one the fold opens for.
  assert.ok(FINE_TUNE_FIELDS.includes('noStudy') && FINE_TUNE_FIELDS.includes('quietHours'))
  assert.ok(!FINE_TUNE_FIELDS.includes('reminderTime'), 'the reminder is not in the fold')
}
{
  // The reminder time is checked on step four, and only while the morning email is on: a hidden field never blocks Next.
  let s = wizardReducer(initialWizardState(profile, null), { type: 'set_reminder_time', time: '8' })
  assert.equal(s.remindMe, true)
  assert.deepEqual(validateStep(s, 4, TODAY), [{ field: 'reminderTime', message: 'The reminder time should look like 08:00.' }])
  assert.equal(validateStep(s, 3, TODAY).length, 0, 'step three does not repeat it')
  s = wizardReducer(s, { type: 'set_remind_me', remindMe: false })
  assert.equal(validateStep(s, 4, TODAY).length, 0)
  s = wizardReducer(s, { type: 'set_remind_me', remindMe: true })
  s = wizardReducer(s, { type: 'set_reminder_time', time: '07:15' })
  assert.equal(validateStep(s, 4, TODAY).length, 0)
  assert.equal(toRequest(s, TODAY).availabilityDetail?.reminderTime, '07:15', 'still travels with the availability the engine reads')
}
{
  // The fine-tune fold opens itself only when something under it is not at its default.
  const fresh = initialWizardState(profile, null)
  assert.equal(fineTuneDiffersFromDefaults(fresh), false, 'a fresh wizard keeps the fold closed')
  assert.equal(fineTuneDiffersFromDefaults({ ...fresh, breakRhythm: 'generous' }), true)
  assert.equal(fineTuneDiffersFromDefaults({ ...fresh, noStudy: { start: '23:00', end: '06:00' } }), true)
  assert.equal(fineTuneDiffersFromDefaults({ ...fresh, quietHours: { start: '22:00', end: '07:00' } }), true)
  assert.equal(fineTuneDiffersFromDefaults({ ...fresh, blockedDates: ['2026-10-02'] }), true)
  const outside: WizardState = { ...fresh, reminderTime: '07:15', sessionLength: 20 }
  assert.equal(fineTuneDiffersFromDefaults(outside), false, 'session length and the reminder are outside the fold')
  assert.equal(fineTuneDiffersFromDefaults(initialWizardState({ ...profile, measured: {} }, prior)), true, 'the prior plan above set a generous rhythm and a day away')
}
{
  const s = initialWizardState(profile, null)
  assert.equal(firstInvalidStep(s, TODAY), 2, 'physics has no rating yet')
  assert.equal(firstInvalidStep(wizardReducer(s, { type: 'set_rating', code: '9702', rating: 'rusty' }), TODAY), null)
}

assert.equal(isClockTime('08:00'), true)
assert.equal(isClockTime('24:00'), false)
assert.equal(isClockTime('8:00'), false)

// --- the request ---------------------------------------------------------------------------

{
  let s = initialWizardState(profile, null)
  s = wizardReducer(s, { type: 'set_rating', code: '9702', rating: 'rusty' })
  s = wizardReducer(s, { type: 'set_exam_date', code: '9702', date: '2026-11-20' })
  s = wizardReducer(s, { type: 'set_exam_time', code: '9709', time: '09:00' })
  s = wizardReducer(s, { type: 'set_component', code: '9709', component: 'Paper 1' })
  s = wizardReducer(s, { type: 'set_mode', mode: 'foundation' })
  s = wizardReducer(s, { type: 'set_target_grade', targetGrade: ' A ' })
  s = wizardReducer(s, { type: 'add_blocked_date', date: '2026-10-05' })
  s = wizardReducer(s, { type: 'set_priority_subject', code: '9702' })
  s = wizardReducer(s, { type: 'set_remind_me', remindMe: false })
  const req = toRequest(s, TODAY)

  assert.equal(req.examDate, '2026-11-20', 'the latest paper')
  assert.equal(req.startDate, startDateFor(s.timeZone, TODAY))
  assert.equal(req.mode, 'foundation')
  assert.deepEqual(req.subjects, ['9709', '9702'])
  assert.deepEqual(req.subjectExamDates, { '9709': '2026-11-15', '9702': '2026-11-20' })
  assert.deepEqual(req.subjectExamTimes, { '9709': '09:00' })
  assert.deepEqual(req.subjectComponents, { '9709': 'Paper 1' })
  assert.deepEqual(req.selfRatings, { '9709': 'getting_there', '9702': 'rusty' })
  assert.equal(req.timeZone, 'Asia/Karachi')
  assert.deepEqual(req.blockedDates, ['2026-10-05'])
  assert.equal(req.targetGrade, 'A')
  assert.equal(req.prioritySubject, '9702')
  assert.equal(req.remindMe, false)
  assert.equal(req.preview, undefined)
  assert.equal('availability' in req, false, 'the seven-day array is never sent beside availabilityDetail')
  assert.equal('minutesPerDay' in req, false)
  assert.equal('preparedness' in req, false)
  assert.ok(req.availabilityDetail)
  assert.equal(req.availabilityDetail.weekdayMinutes, 90)
  assert.equal(req.availabilityDetail.sessionLength, 40)
  assert.deepEqual(Object.keys(req).sort(), [
    'availabilityDetail',
    'blockedDates',
    'examDate',
    'mode',
    'prioritySubject',
    'remindMe',
    'selfRatings',
    'startDate',
    'subjectComponents',
    'subjectExamDates',
    'subjectExamTimes',
    'subjects',
    'targetGrade',
    'timeZone',
  ])
}
{
  // A subject removed from the plan leaves nothing behind in the request.
  let s = initialWizardState(profile, null)
  s = wizardReducer(s, { type: 'set_exam_time', code: '9702', time: '13:00' })
  s = wizardReducer(s, { type: 'toggle_subject', code: '9702' })
  const req = toRequest(s, TODAY)
  assert.deepEqual(req.subjects, ['9709'])
  assert.deepEqual(req.subjectExamTimes, {})
  assert.deepEqual(req.selfRatings, { '9709': 'getting_there' })
  assert.equal(req.targetGrade, null)
}

// The start date follows the chosen zone, not the device clock.
{
  const at = new Date('2026-09-17T19:30:00Z')
  assert.equal(startDateFor('Asia/Karachi', '2026-09-17', at), '2026-09-18')
  assert.equal(startDateFor('Europe/London', '2026-09-18', at), '2026-09-17')
  assert.equal(startDateFor('Not/AZone', '2026-09-18', at), '2026-09-18')
}

console.log('lib/plan/wizard-state.test.ts: ok')
