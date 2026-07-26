import { lessonBlockKey, isExplainIntent } from './explain-block-key'

let failed = 0

function check(name: string, ok: boolean) {
  if (!ok) {
    failed++
    console.error(`FAIL ${name}`)
  }
}

const block = {
  h: 'Kinetic energy',
  p: 'A moving body stores energy because of its motion. The kinetic energy of a body of mass m travelling at speed v is one half m v squared.',
}

// Determinism — the client and the route must land on the same row.
check('stable across calls', lessonBlockKey(block) === lessonBlockKey(block))
check('16 hex chars', /^[0-9a-f]{16}$/.test(lessonBlockKey(block)))

// Whitespace and case are formatting, not identity: a reflow of the JSON must
// not orphan a warm cache row.
check(
  'insensitive to whitespace',
  lessonBlockKey(block) ===
    lessonBlockKey({ h: '  Kinetic   energy ', p: block.p.replace(/ /g, '  ') })
)
check(
  'insensitive to case',
  lessonBlockKey(block) ===
    lessonBlockKey({ h: 'KINETIC ENERGY', p: block.p.toUpperCase() })
)

// Different paragraphs must not collide, or one section's explanation would be
// served under another.
check(
  'heading change is a different block',
  lessonBlockKey(block) !== lessonBlockKey({ ...block, h: 'Potential energy' })
)
check(
  'prose change is a different block',
  lessonBlockKey(block) !==
    lessonBlockKey({ ...block, p: 'Gravitational potential energy depends on height.' })
)

// Only the first 200 chars of prose are hashed, so an edit past that point on a
// long paragraph keeps the warm row. Note the corollary: on a paragraph shorter
// than the sample window, ANY prose edit is a new key — correct, but it means
// short blocks re-generate on every content tweak.
const longBlock = {
  h: 'Kinetic energy',
  p: `${'A moving body stores energy because of its motion. '.repeat(6)}END`,
}
check('long prose exceeds the sample window', longBlock.p.length > 200)
check(
  'edits past the sample window keep the key',
  lessonBlockKey(longBlock) ===
    lessonBlockKey({ ...longBlock, p: `${longBlock.p} A clarifying sentence appended later.` })
)
check(
  'edits inside the sample window change the key',
  lessonBlockKey(longBlock) !==
    lessonBlockKey({ ...longBlock, p: `Rewritten opening. ${longBlock.p}` })
)

// No collisions across a realistic lesson's worth of blocks.
const keys = new Set(
  Array.from({ length: 500 }, (_, i) =>
    lessonBlockKey({ h: `Section ${i}`, p: `Body text for section number ${i}.` })
  )
)
check('no collisions over 500 blocks', keys.size === 500)

check('accepts known intent', isExplainIntent('simpler'))
check('rejects unknown intent', !isExplainIntent('eli5'))
check('rejects non-string', !isExplainIntent(42))

if (failed > 0) process.exit(1)
console.log('explain-block-key.test.ts: all checks passed')
