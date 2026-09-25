import assert from 'node:assert/strict'
import {
  OMNI_HISTORY_MAX_MESSAGES,
  OMNI_MESSAGE_MAX_CHARS,
  OMNI_QUERY_MAX_CHARS,
  OMNI_WEAK_TOPICS_MAX,
  parseOmniRequestBody,
} from './context-schema'

function expectOk(raw: unknown) {
  const r = parseOmniRequestBody(raw)
  assert.ok(r.ok, `expected ok, got: ${r.ok ? '' : r.error}`)
  return r.body
}

function expectReject(raw: unknown, why: string) {
  const r = parseOmniRequestBody(raw)
  assert.equal(r.ok, false, `expected rejection (${why})`)
  if (!r.ok) assert.ok(r.error.startsWith('Invalid request'), r.error)
}

// Minimal body: query only → landing context, empty history.
{
  const body = expectOk({ query: '  hello ' })
  assert.equal(body.query, 'hello')
  assert.deepEqual(body.context, { type: 'landing' })
  assert.deepEqual(body.messages, [])
  assert.equal(body.attemptId, undefined)
}

// Query caps: empty and oversize are refused; exactly the cap is fine.
expectReject({ query: '' }, 'empty query')
expectReject({ query: '   ' }, 'whitespace query')
expectReject({ query: 'x'.repeat(OMNI_QUERY_MAX_CHARS + 1) }, 'oversize query')
expectOk({ query: 'x'.repeat(OMNI_QUERY_MAX_CHARS) })
expectReject({ query: 42 }, 'non-string query')
expectReject(null, 'null body')
expectReject('query', 'string body')

// History: last N kept, oversize content truncated (not rejected), junk dropped.
{
  const messages = Array.from({ length: 12 }, (_, i) => ({
    role: i % 2 ? 'assistant' : 'user',
    content: `m${i}`,
  }))
  const body = expectOk({ query: 'q', messages })
  assert.equal(body.messages.length, OMNI_HISTORY_MAX_MESSAGES)
  assert.equal(body.messages[0].content, 'm4')
  assert.equal(body.messages.at(-1)?.content, 'm11')
}
{
  const long = 'a'.repeat(OMNI_MESSAGE_MAX_CHARS + 500)
  const body = expectOk({
    query: 'q',
    messages: [{ role: 'assistant', content: long }],
  })
  assert.equal(body.messages.length, 1)
  assert.ok(body.messages[0].content.length <= OMNI_MESSAGE_MAX_CHARS + 1)
  assert.ok(body.messages[0].content.endsWith('…'))
}
{
  const body = expectOk({
    query: 'q',
    messages: [
      { role: 'user', content: 'ok' },
      { role: 'system', content: 'nope' },
      { role: 'user', content: '   ' },
      { role: 'user' },
      'garbage',
      null,
    ],
  })
  assert.deepEqual(body.messages, [{ role: 'user', content: 'ok' }])
}
expectReject({ query: 'q', messages: 'not an array' }, 'messages not array')

// Numeric fields are coerced from strings and must be finite — this is the
// `.toFixed` that used to throw after metering.
{
  const body = expectOk({
    query: 'q',
    context: {
      type: 'mastery_matrix',
      data: {
        coverage: '73.4',
        weakTopics: [{ code: '1.2', name: 'Quadratics', percentage: '41' }],
      },
    },
  })
  assert.equal(body.context.type, 'mastery_matrix')
  if (body.context.type === 'mastery_matrix') {
    assert.equal(body.context.data.coverage, 73.4)
    assert.equal(body.context.data.weakTopics[0].percentage, 41)
  }
}
expectReject(
  {
    query: 'q',
    context: { type: 'mastery_matrix', data: { coverage: 'abc', weakTopics: [] } },
  },
  'NaN coverage'
)
// A student with more than fifty critical topics is not a malformed request:
// the progress page sends them all, the prompt reads three. Truncate, keep
// the first ones (the client sorts weakest first), never 400.
{
  const many = Array.from({ length: OMNI_WEAK_TOPICS_MAX + 37 }, (_, i) => ({
    code: `t${i}`,
    name: `Topic ${i}`,
    percentage: i,
  }))
  const body = expectOk({
    query: 'q',
    context: { type: 'mastery_matrix', data: { coverage: 40, weakTopics: many } },
  })
  if (body.context.type === 'mastery_matrix') {
    assert.equal(body.context.data.weakTopics.length, OMNI_WEAK_TOPICS_MAX)
    assert.equal(body.context.data.weakTopics[0].code, 't0')
    assert.equal(body.context.data.weakTopics.at(-1)?.code, `t${OMNI_WEAK_TOPICS_MAX - 1}`)
  }
}
expectReject(
  {
    query: 'q',
    context: { type: 'mastery_matrix', data: { coverage: 10, weakTopics: [{ code: 'x' }] } },
  },
  'weak topic missing fields'
)
expectReject(
  {
    query: 'q',
    context: { type: 'dashboard_home', data: { name: 'Sam', streak: 'Infinity', attemptCount: 1 } },
  },
  'infinite streak'
)
expectReject(
  {
    query: 'q',
    context: { type: 'dashboard_home', data: { name: 'x'.repeat(81), streak: 1, attemptCount: 1 } },
  },
  'oversize name'
)

// Unknown / malformed context shapes are a 400, not a prompt with garbage.
expectReject({ query: 'q', context: { type: 'evil' } }, 'unknown context type')
expectReject({ query: 'q', context: { type: 'marking', data: { mode: 'root' } } }, 'bad mode')
expectReject({ query: 'q', context: 'landing' }, 'context not object')
expectReject({ query: 'q', context: { type: 'marking_result', data: {} } }, 'missing attemptId')

// Every context type round-trips.
expectOk({ query: 'q', context: { type: 'landing' } })
expectOk({
  query: 'q',
  context: { type: 'dashboard_home', data: { name: 'Sam', streak: 3, attemptCount: 12 } },
})
expectOk({
  query: 'q',
  context: {
    type: 'examiner_ink',
    data: {
      attemptId: 'abc',
      questionText: 'Solve x',
      marksAwarded: [{ mark_id: 'M1', earned: false, reasoning: 'wrong sign' }],
      lineReferences: [{ any: 'thing' }],
      score: '2/5',
    },
  },
})
{
  // lineReferences is optional on the wire and defaults to [] so the
  // AIContextType shape is always satisfied.
  const body = expectOk({
    query: 'q',
    context: {
      type: 'examiner_ink',
      data: { attemptId: 'abc', questionText: 'Q', marksAwarded: [], score: '1/1' },
    },
  })
  if (body.context.type === 'examiner_ink') {
    assert.deepEqual(body.context.data.lineReferences, [])
  }
}
expectOk({ query: 'q', context: { type: 'marking_result', data: { attemptId: 'abc' } } })
expectOk({ query: 'q', context: { type: 'marking', data: { mode: 'past_paper' } } })
expectOk({ query: 'q', context: { type: 'teacher_dashboard', data: {} } })
{
  // Teacher metrics: only the fields the prompt reads survive; extra keys are
  // dropped rather than forwarded.
  const body = expectOk({
    query: 'q',
    context: {
      type: 'teacher_dashboard',
      data: {
        classMetrics: {
          analytics: { classroomName: '10B', studentCount: '24', avgScore: 61.25, junk: 'x' },
          blindspots: { topics: [{ code: '3.1', name: 'Vectors', avgMastery: '40' }] },
          quadrants: { students: [{ name: 'A', quadrant: 'risk', predictedGrade: 'C', accuracy: 50 }] },
          hugeBlob: 'z'.repeat(50_000),
        },
      },
    },
  })
  if (body.context.type === 'teacher_dashboard') {
    const metrics = body.context.data.classMetrics as Record<string, unknown>
    assert.equal('hugeBlob' in metrics, false)
    assert.equal((metrics.analytics as { studentCount: number }).studentCount, 24)
  }
}
{
  // The teacher page passes `data: { classMetrics: null }` while loading.
  const body = expectOk({
    query: 'q',
    context: { type: 'teacher_dashboard', data: { classMetrics: null } },
  })
  assert.equal(body.context.type, 'teacher_dashboard')
}

// attemptId is a short id, not a payload carrier.
expectOk({ query: 'q', attemptId: '0b8f7c1e-1111-4222-8333-444455556666' })
expectReject({ query: 'q', attemptId: 'x'.repeat(65) }, 'oversize attemptId')
expectReject({ query: 'q', attemptId: 7 }, 'numeric attemptId')

console.log('omni context-schema: ok')
