import assert from 'node:assert/strict'
import type { ClassSet } from '@/lib/teacher-classroom-data'
import type { ClassroomMember } from '@/lib/teacher-analytics'
import {
  clampPageSize,
  countOverdueSets,
  classroomCursorFilter,
  classroomDeleteGuard,
  classroomUpdateFor,
  decodeClassroomCursor,
  demoSeedingEnabled,
  encodeClassroomCursor,
  isUuid,
  latestActivityByStudent,
  mergeClassroomSettings,
  parseClassroomPatch,
  parseDeleteMode,
  plainText,
  sortRoster,
  subjectCodeGroups,
  subjectCodeLabel,
  subjectStamp,
  suggestSubjectCodes,
  toClassroomRow,
} from '@/lib/teacher/list-classrooms'

const ID = '3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c'

// --- plain text: no HTML survives, whatever shape it arrives in ---------------

assert.equal(plainText('Year 12 <b>Chemistry</b>'), 'Year 12 Chemistry', 'tags go, their text stays')
assert.equal(plainText('<script>alert(1)</script>Maths'), 'alert(1)Maths', 'script tags are removed')
assert.equal(plainText('<img src=x onerror=alert(1)>Physics'), 'Physics', 'attribute payloads go with the tag')
assert.equal(plainText('a < b > c'), 'a c', 'anything shaped like a tag goes, even with spaces')
assert.equal(plainText('x > y <3'), 'x y 3', 'stray angle brackets are dropped so none can open a tag later')
assert.equal(plainText('  Year   12\tMaths  '), 'Year 12 Maths', 'single-line values collapse whitespace')
assert.equal(plainText('Line one\r\n\r\n\r\n\r\nLine two', { multiline: true }), 'Line one\n\nLine two')
assert.equal(plainText('Bio\u0000logy\u202E'), 'Biology', 'control and bidi-override characters are dropped')
assert.equal(plainText('javascript:alert(1)'), 'alert(1)', 'the shared scheme strip still applies')
assert.equal(plainText(42), null, 'non-strings are refused, not coerced')
assert.equal(plainText('Cafe\u0301'), 'Café', 'NFC-normalised so equal names compare equal')

// --- PATCH validation ---------------------------------------------------------

{
  const r = parseClassroomPatch({ name: '  Year 13 <i>Maths</i> ', year_group: 'Year 13' })
  assert.ok(r.ok)
  assert.deepEqual(r.patch, { name: 'Year 13 Maths', year_group: 'Year 13' })
}

for (const [body, field] of [
  [{ name: '' }, 'name'],
  [{ name: '<b></b>' }, 'name'],
  [{ name: 'x'.repeat(121) }, 'name'],
  [{ description: 'x'.repeat(501) }, 'description'],
  [{ board: 'Hogwarts' }, 'board'],
  [{ level: 'Degree' }, 'level'],
  [{ subject_code: '1234' }, 'subject_code'],
  [{ subject_code: 9709 }, 'subject_code'],
  [{ year_group: 'y'.repeat(41) }, 'year_group'],
  [{ settings: [] }, 'settings'],
  [{ settings: { notify_submissions: 'hourly' } }, 'settings.notify_submissions'],
  [{ settings: { student_can_see_class_avg: 'yes' } }, 'settings.student_can_see_class_avg'],
  [{ settings: { demo: true } }, 'settings.demo'],
  [{ teacher_id: ID }, 'teacher_id'],
  [{ invite_code: 'ABCDEF' }, 'invite_code'],
  [{ archived: true }, 'archived'],
] as const) {
  const r = parseClassroomPatch(body)
  assert.equal(r.ok, false, `refused: ${JSON.stringify(body)}`)
  if (!r.ok) assert.equal(r.field, field, `field for ${JSON.stringify(body)}`)
}

assert.equal(parseClassroomPatch({}).ok, false, 'an empty patch is refused')
assert.equal(parseClassroomPatch(null).ok, false)
assert.equal(parseClassroomPatch('name').ok, false)

{
  const r = parseClassroomPatch({ subject_code: '9701', board: 'IB', level: 'IB Diploma' })
  assert.ok(r.ok)
  assert.equal(r.patch.subject_code, '9701')
}
{
  const r = parseClassroomPatch({ subject_code: '', description: '   ', year_group: '' })
  assert.ok(r.ok)
  assert.deepEqual(
    r.patch,
    { subject_code: null, description: null, year_group: null },
    'blank optional fields clear the column rather than storing ""'
  )
}
{
  const r = parseClassroomPatch({ settings: { notify_submissions: 'off', student_can_see_class_avg: true } })
  assert.ok(r.ok)
  assert.deepEqual(r.patch.settings, { notify_submissions: 'off', student_can_see_class_avg: true })
}
{
  const r = parseClassroomPatch({ archived: false })
  assert.ok(r.ok && r.patch.archived === false, 'restore is the one archive change PATCH accepts')
}

// --- settings merge keeps what the client did not send (and never demo) ------

assert.deepEqual(
  mergeClassroomSettings({ demo: true, notify_submissions: 'daily' }, { student_can_see_class_avg: true }),
  { demo: true, notify_submissions: 'daily', student_can_see_class_avg: true }
)
assert.deepEqual(
  mergeClassroomSettings({ junk: 1 } as never, undefined),
  {},
  'unknown stored keys are dropped on the next write'
)

// --- update mapping + the archived lock ---------------------------------------

{
  const r = classroomUpdateFor({ name: 'New' }, { settings: {}, archived_at: '2026-09-01T00:00:00Z' })
  assert.equal(r.ok, false, 'an archived class cannot be edited')
}
{
  const r = classroomUpdateFor({ archived: false }, { settings: {}, archived_at: '2026-09-01T00:00:00Z' })
  assert.ok(r.ok)
  assert.equal(r.update.archived_at, null, 'restore clears archived_at')
}
{
  const r = classroomUpdateFor(
    { name: 'N', settings: { notify_submissions: 'off' } },
    { settings: { demo: true }, archived_at: null }
  )
  assert.ok(r.ok)
  assert.equal(r.update.name, 'N')
  assert.deepEqual(r.update.settings, { demo: true, notify_submissions: 'off' })
  assert.ok(typeof r.update.updated_at === 'string')
  assert.ok(!('archived_at' in r.update), 'no archive change unless asked')
}

// --- delete guard: archive first, then empty the class ------------------------

assert.equal(parseDeleteMode(null), 'archive', 'archive is the default, reversible action')
assert.equal(parseDeleteMode('archive'), 'archive')
assert.equal(parseDeleteMode('delete'), 'delete')
assert.equal(parseDeleteMode('purge'), null)

assert.equal(classroomDeleteGuard({ archived_at: null, activeMembers: 0 }).ok, false, 'must be archived')
{
  const r = classroomDeleteGuard({ archived_at: '2026-09-01T00:00:00Z', activeMembers: 3 })
  assert.equal(r.ok, false, 'must be empty')
  if (!r.ok) assert.match(r.error, /3 students/)
}
{
  const r = classroomDeleteGuard({ archived_at: '2026-09-01T00:00:00Z', activeMembers: 1 })
  if (!r.ok) assert.match(r.error, /last student/)
}
assert.equal(classroomDeleteGuard({ archived_at: '2026-09-01T00:00:00Z', activeMembers: 0 }).ok, true)

// --- cursors are opaque, round-trip, and refuse anything injectable -----------

{
  const c = { created_at: '2026-09-25T10:15:30.123456+00:00', id: ID }
  const decoded = decodeClassroomCursor(encodeClassroomCursor(c))
  assert.deepEqual(decoded, c)
  assert.equal(
    classroomCursorFilter(c),
    `created_at.lt."${c.created_at}",and(created_at.eq."${c.created_at}",id.lt.${ID})`
  )
}
assert.equal(decodeClassroomCursor('not-base64-json'), null)
assert.equal(decodeClassroomCursor(null), null)
for (const hostile of [
  ['2026-09-25T10:00:00Z",id.gt.0', ID],
  ['2026-09-25T10:00:00Z', 'not-a-uuid'],
  ['yesterday', ID],
  [42, ID],
]) {
  const raw = Buffer.from(JSON.stringify(hostile)).toString('base64url')
  assert.equal(decodeClassroomCursor(raw), null, `refused cursor ${JSON.stringify(hostile)}`)
}

assert.equal(clampPageSize(undefined), 50)
assert.equal(clampPageSize('10'), 10)
assert.equal(clampPageSize('0'), 50)
assert.equal(clampPageSize('abc'), 50)
assert.equal(clampPageSize(10_000), 100, 'capped')

assert.ok(isUuid(ID))
assert.ok(!isUuid('3f2b8c1e'))

// --- rows ----------------------------------------------------------------------

{
  const row = toClassroomRow(
    {
      id: ID,
      name: 'Y12',
      description: null,
      invite_code: 'ABC234',
      board: 'Cambridge International',
      level: 'A-Level',
      subject: 'Chemistry',
      subject_code: '9701',
      year_group: null,
      archived_at: null,
      settings: { demo: 'yes', notify_submissions: 'off', extra: true },
      created_at: '2026-09-01T00:00:00Z',
    },
    4
  )
  assert.deepEqual(row.settings, { notify_submissions: 'off' }, 'settings are normalised on read')
  assert.equal(row.studentCount, 4)
}

// --- subjects ----------------------------------------------------------------------

assert.equal(subjectCodeLabel('9701'), 'Chemistry · 9701')
assert.equal(subjectCodeLabel('ib-chemistry-hl'), 'Chemistry HL')
assert.equal(subjectCodeLabel('ib-tok'), 'Theory of Knowledge')
assert.equal(subjectCodeLabel(null), 'No syllabus set')

assert.equal(subjectStamp('9709'), '9709')
assert.equal(subjectStamp('ib-chemistry-hl'), 'CH')
assert.equal(subjectStamp('ib-maths-aa-sl'), 'MAAS')
assert.equal(subjectStamp('ib-tok'), 'TK')
assert.equal(subjectStamp(null), 'CL')

assert.equal(subjectCodeGroups('IB')[0].label, 'IB Diploma', 'the class board’s group comes first')
assert.equal(subjectCodeGroups('Cambridge International')[0].label, 'Cambridge International')
assert.ok(subjectCodeGroups(null).every((g) => g.codes.length > 0))

assert.deepEqual(
  suggestSubjectCodes({ board: 'Cambridge International', level: 'A-Level', subject: 'Chemistry', current: null }),
  ['9701']
)
{
  const ib = suggestSubjectCodes({ board: 'IB', level: 'IB Diploma', subject: 'Chemistry', current: null })
  assert.deepEqual([...ib].sort(), ['ib-chemistry-hl', 'ib-chemistry-sl'], 'ambiguous IB name offers HL and SL')
}
assert.deepEqual(
  suggestSubjectCodes({ board: 'IB', level: 'IB Diploma', subject: 'ib-physics-sl', current: null })[0],
  'ib-physics-sl',
  'an exact IB code is the first suggestion'
)
assert.deepEqual(
  suggestSubjectCodes({ board: 'Edexcel', level: 'A-Level', subject: 'Mathematics', current: '9709' }),
  ['9709'],
  'the current code is always offered'
)

// --- last activity per student (from attempts the loader already scoped) ---------

{
  const latest = latestActivityByStudent([
    { user_id: 's1', created_at: '2026-09-20T00:00:00Z' },
    { user_id: 's2', created_at: '2026-09-19T00:00:00Z' },
    { user_id: 's1', created_at: '2026-09-18T00:00:00Z' },
  ])
  assert.equal(latest.get('s1'), '2026-09-20T00:00:00Z', 'the first (newest) row wins')
  assert.equal(latest.get('s2'), '2026-09-19T00:00:00Z')
  assert.equal(latest.size, 2)
}

// --- overdue sets per student: the desk's definition, counted per set ---------------

{
  const now = new Date('2026-09-25T12:00:00Z')
  const joined = '2026-09-01T00:00:00Z'
  const members: ClassroomMember[] = ['a', 'b', 'c', 'd', 'late-joiner'].map((id) => ({
    student_id: id,
    status: 'active' as const,
    joined_at: id === 'late-joiner' ? '2026-09-22T00:00:00Z' : joined,
  }))
  members.push({ student_id: 'gone', status: 'left', joined_at: joined })
  const set = (id: string, due: string | null, extra: Partial<ClassSet> = {}): ClassSet => ({
    id,
    classroom_id: 'c1',
    title: id,
    kind: 'question_set',
    subject_code: '9709',
    is_mock: false,
    target: 'all',
    due_at: due,
    published_at: '2026-09-10T00:00:00Z',
    closed_at: null,
    archived_at: null,
    created_at: '2026-09-10T00:00:00Z',
    items: [
      {
        id: `${id}-i1`,
        assignment_id: id,
        position: 0,
        item_type: 'prompt',
        mark_scheme_id: null,
        paper_code: null,
        paper_session: null,
        question_number: null,
        total_marks: 5,
        syllabus_tags: null,
        topic_code: null,
        prompt_text: 'Explain.',
        ib_component_key: null,
      },
    ],
    flags: [],
    submissions: [],
    ...extra,
  })
  const handIn = (setId: string, student: string) => ({
    id: `${setId}-${student}`,
    assignment_id: setId,
    item_id: `${setId}-i1`,
    student_id: student,
    attempt_id: null,
    attempt_count: 1,
    marks_earned: 3,
    total_marks: 5,
    status: 'submitted' as const,
    source: 'linked' as const,
    first_submitted_at: '2026-09-19T00:00:00Z',
    last_submitted_at: '2026-09-19T00:00:00Z',
  })
  const counts = countOverdueSets(
    [
      set('past1', '2026-09-20T16:00:00Z', {
        submissions: [handIn('past1', 'a')],
        flags: [
          {
            assignment_id: 'past1',
            student_id: 'c',
            excused_at: '2026-09-19T00:00:00Z',
            extended_due_at: null,
            feedback: null,
            feedback_at: null,
            reminded_at: null,
          },
          {
            assignment_id: 'past1',
            student_id: 'd',
            excused_at: null,
            extended_due_at: '2026-09-30T16:00:00Z',
            feedback: null,
            feedback_at: null,
            reminded_at: null,
          },
        ],
      }),
      set('past2', '2026-09-21T16:00:00Z'),
      set('future', '2026-09-30T16:00:00Z'),
      set('closed', '2026-09-20T16:00:00Z', { closed_at: '2026-09-21T00:00:00Z' }),
    ],
    members,
    now
  )
  assert.equal(counts.get('a'), 1, 'handed in past1, still owes past2')
  assert.equal(counts.get('b'), 2, 'owes both open, past-due sets')
  assert.equal(counts.get('c'), 1, 'excused from past1 only')
  assert.equal(counts.get('d'), 1, 'extension on past1 not reached yet')
  assert.equal(counts.has('late-joiner'), false, 'joined after both deadlines: never theirs to hand in')
  assert.equal(counts.has('gone'), false, 'students who left are not chased')
}

assert.deepEqual(
  sortRoster([
    { full_name: 'Zed', status: 'active' as const },
    { full_name: 'Amy', status: 'left' as const },
    { full_name: 'bea', status: 'active' as const },
    { full_name: null, status: 'active' as const },
  ]).map((r) => r.full_name),
  [null, 'bea', 'Zed', 'Amy'],
  'active A–Z (case-insensitive), then the rest'
)

// --- demo seeding never runs in production ---------------------------------------

assert.equal(demoSeedingEnabled({ NODE_ENV: 'production' }), false)
assert.equal(demoSeedingEnabled({ NODE_ENV: 'development' }), true)
assert.equal(demoSeedingEnabled({ NODE_ENV: 'test' }), true)

console.log('list-classrooms.test.ts — all assertions passed')
