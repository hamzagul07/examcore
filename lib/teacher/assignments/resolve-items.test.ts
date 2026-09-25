import assert from 'node:assert/strict'
import {
  AssignmentInputError,
  PREVIEW_MAX,
  pickTopicQuestions,
  questionPreview,
  resolveItemsWith,
  topicCodesFor,
  type BankQuestion,
  type ResolveDeps,
} from '@/lib/teacher/assignments/resolve-items'
import type { ItemInput } from '@/lib/teacher/types'

// --- a small bank ----------------------------------------------------------------

let n = 0
function q(paper_code: string, paper_session: string, question_number: string, over: Partial<BankQuestion> = {}): BankQuestion {
  n += 1
  return {
    id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
    paper_code,
    paper_session,
    question_number,
    total_marks: 5,
    syllabus_tags: null,
    ...over,
  }
}

const bank: BankQuestion[] = [
  q('9701/22', 'May/June 2024', '1', { syllabus_tags: ['1.2'] }),
  q('9701/22', 'May/June 2024', '2', { syllabus_tags: ['1.2'] }),
  q('9701/22', 'May/June 2024', '3(a)', { syllabus_tags: ['1.3'], total_marks: 7 }),
  q('9701/23', 'October/November 2023', '4', { syllabus_tags: ['1.2'] }),
  q('9701/21', 'May/June 2021', '5', { syllabus_tags: ['1.2'] }),
  q('9701/22', 'May/June 2024', '6', { syllabus_tags: ['1'], total_marks: 4 }),
  q('9709/12', 'May/June 2024', '1', { syllabus_tags: ['1.2'] }),
]

const calls: string[] = []
const deps: ResolveDeps = {
  async findQuestion(paperCode, paperSession, questionNumber) {
    calls.push(`find ${paperCode} ${paperSession} ${questionNumber}`)
    const norm = (s: string) => s.replace(/\s+/g, '').toLowerCase()
    return (
      bank.find(
        (b) => b.paper_code === paperCode && b.paper_session === paperSession && norm(b.question_number) === norm(questionNumber)
      ) ?? null
    )
  },
  async paperQuestions(paperCode, paperSession) {
    return bank.filter((b) => b.paper_code === paperCode && b.paper_session === paperSession)
  },
  async topicQuestions(subjectCode, topicCode, limit) {
    calls.push(`topic ${subjectCode} ${topicCode}`)
    return bank
      .filter((b) => b.paper_code.startsWith(`${subjectCode}/`) && (b.syllabus_tags ?? []).includes(topicCode))
      .slice(0, limit)
  },
}

async function rejects(items: ItemInput[], field: string, pattern: RegExp, subject = '9701') {
  await assert.rejects(
    () => resolveItemsWith(deps, subject, items),
    (err: unknown) => err instanceof AssignmentInputError && err.field === field && pattern.test(err.message),
    `expected ${field} ~ ${pattern}`
  )
}

async function main() {
  // --- past-paper questions ------------------------------------------------------------

  {
    const rows = await resolveItemsWith(deps, '9701', [
      { item_type: 'past_paper_question', paper_code: '9701/22', paper_session: 'May/June 2024', question_number: '3 (a)' },
      { item_type: 'past_paper_question', paper_code: '9701/22', paper_session: 'May/June 2024', question_number: '1' },
    ])
    assert.equal(rows.length, 2)
    assert.equal(rows[0].mark_scheme_id, bank[2].id, 'the banked question’s id is ALWAYS stored (reconciliation keys on it)')
    assert.equal(rows[0].question_number, '3(a)', 'the bank’s own spelling is stored')
    assert.equal(rows[0].total_marks, 7)
    assert.deepEqual(rows.map((r) => r.position), [0, 1], 'positions follow the order picked')
    assert.equal(rows[0].topic_code, null)
  }

  await rejects(
    [{ item_type: 'past_paper_question', paper_code: '9701/22', paper_session: 'May/June 2024', question_number: '99' }],
    'items.0',
    /don’t hold a mark scheme/
  )
  await rejects(
    [{ item_type: 'past_paper_question', paper_code: '9709/12', paper_session: 'May/June 2024', question_number: '1' }],
    'items.0',
    /not a paper for this class/,
    '9701'
  )
  await rejects(
    [
      { item_type: 'past_paper_question', paper_code: '9701/22', paper_session: 'May/June 2024', question_number: '1' },
      { item_type: 'past_paper_question', paper_code: '9701/22', paper_session: 'May/June 2024', question_number: '1' },
    ],
    'items.1',
    /already in this set/
  )

  // --- whole papers ------------------------------------------------------------------------

  {
    const [paper] = await resolveItemsWith(deps, '9701', [
      { item_type: 'whole_paper', paper_code: '9701/22', paper_session: 'May/June 2024' },
    ])
    assert.equal(paper.item_type, 'whole_paper')
    assert.equal(paper.mark_scheme_id, null, 'a whole paper has no single scheme (DB shape check)')
    assert.equal(paper.total_marks, 5 + 5 + 7 + 4, 'its total is the sum of its questions')
  }
  await rejects([{ item_type: 'whole_paper', paper_code: '9701/42', paper_session: 'May/June 2024' }], 'items.0', /don’t hold/)

  // --- prompts ------------------------------------------------------------------------------------

  {
    const [prompt] = await resolveItemsWith(deps, 'ib-economics-hl', [
      { item_type: 'prompt', prompt_text: 'Evaluate a carbon tax.', total_marks: 15, ib_component_key: 'paper_1' },
    ])
    assert.deepEqual(
      { type: prompt.item_type, text: prompt.prompt_text, marks: prompt.total_marks, key: prompt.ib_component_key, scheme: prompt.mark_scheme_id },
      { type: 'prompt', text: 'Evaluate a carbon tax.', marks: 15, key: 'paper_1', scheme: null }
    )
  }

  // --- topics -----------------------------------------------------------------------------------

  {
    calls.length = 0
    const rows = await resolveItemsWith(deps, '9701', [{ item_type: 'topic', topic_code: '1.2' }])
    assert.equal(rows.length, 2, 'two per topic by default')
    assert.ok(rows.every((r) => r.topic_code === '1.2' && r.item_type === 'past_paper_question' && r.mark_scheme_id))
    assert.deepEqual(
      rows.map((r) => r.paper_code),
      ['9701/22', '9701/23'],
      'newest session first, one per paper before any paper gives a second'
    )
    assert.deepEqual(calls, ['topic 9701 1.2'], 'the leaf had enough; no walk up')
  }

  {
    calls.length = 0
    const rows = await resolveItemsWith(deps, '9701', [{ item_type: 'topic', topic_code: '1.3', per_topic: 2 }])
    assert.deepEqual(calls, ['topic 9701 1.3', 'topic 9701 1'], 'walks up only for what the leaf cannot supply')
    assert.equal(rows.length, 2)
    assert.equal(rows[1].question_number, '6', 'topped up from the section')
  }

  {
    const rows = await resolveItemsWith(deps, '9701', [
      { item_type: 'past_paper_question', paper_code: '9701/22', paper_session: 'May/June 2024', question_number: '1' },
      { item_type: 'topic', topic_code: '1.2', per_topic: 3 },
    ])
    const ids = rows.map((r) => r.mark_scheme_id)
    assert.equal(new Set(ids).size, ids.length, 'a topic never repeats a question already in the set')
    assert.equal(rows.length, 4)
  }

  await rejects([{ item_type: 'topic', topic_code: '99.9' }], 'items.0', /not a topic in this class’s syllabus/)
  await rejects([{ item_type: 'topic', topic_code: '12.1' }], 'items.0', /No banked questions/)
  assert.deepEqual(topicCodesFor('9701', '1.2'), ['1.2', '1'])
  assert.equal(topicCodesFor('9701', '99.9'), null, 'unknown in a subject with a syllabus tree')
  assert.deepEqual(topicCodesFor('0580', '3.1'), ['3.1', '3'], 'a subject without a tree accepts any code')

  await assert.rejects(
    () =>
      resolveItemsWith(deps, '9701', [
        { item_type: 'topic', topic_code: '1.2', per_topic: 4 },
        ...Array.from({ length: 9 }, (_, i) => ({ item_type: 'prompt' as const, prompt_text: `Prompt ${i}` })),
      ]),
    (err: unknown) => err instanceof AssignmentInputError && /at most 12/.test(err.message),
    'more than twelve rows once expanded'
  )

  // --- pickTopicQuestions -----------------------------------------------------------------------

  {
    const pool = [
      q('9701/22', 'May/June 2020', '1'),
      q('9701/22', 'May/June 2024', '2'),
      q('9701/22', 'May/June 2024', '10'),
      q('9701/23', 'May/June 2024', '1'),
    ]
    assert.deepEqual(
      pickTopicQuestions(pool, 3, new Set()).map((x) => `${x.paper_code} ${x.paper_session} ${x.question_number}`),
      ['9701/22 May/June 2024 2', '9701/23 May/June 2024 1', '9701/22 May/June 2020 1'],
      'spread across papers first, newest first, question numbers in numeric order'
    )
    assert.equal(pickTopicQuestions(pool, 3, new Set(pool.map((x) => x.id))).length, 0, 'excluded ids are never picked')
    assert.deepEqual(pickTopicQuestions(pool, 2, new Set()), pickTopicQuestions([...pool].reverse(), 2, new Set()), 'order-independent')
  }

  // --- previews --------------------------------------------------------------------------------------

  assert.equal(questionPreview('  Find   the\nvalue of x.  '), 'Find the value of x.', 'one line')
  assert.equal(questionPreview(null), null)
  assert.equal(questionPreview('   '), null)
  {
    const long = `The curve y = x^2 ${'and the line y = 2x + 3 meet at two points '.repeat(10)}`
    const preview = questionPreview(long)!
    assert.ok(preview.length <= PREVIEW_MAX, 'never longer than the cap')
    assert.ok(preview.endsWith('…'), 'marked as cut')
    assert.ok(!/\s…$/.test(preview), 'cut at a word, not mid-space')
  }

  console.log('resolve-items.test.ts: all checks passed')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
