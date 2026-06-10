import { jsonrepair } from 'jsonrepair'

const greedy = (text) => text.match(/{[\s\S]*}/)?.[0] ?? text

const cases = [
  "{'a':1}",
  '{broken} and {"valid": true}',
  '{type: "progress"}',
  '{',
  '{}',
  'data: {"type":"progress"}',
  '{"type":"progress"}',
  '`{"a":1}`',
  '{\\"a\\":1}',
]

for (const c of cases) {
  try {
    JSON.parse(c)
    console.log('parse OK:', c)
  } catch (e) {
    console.log('parse FAIL:', JSON.stringify(c), '->', e.message)
  }
  const g = greedy(c)
  try {
    const repaired = jsonrepair(g)
    JSON.parse(repaired)
    console.log('  repair OK:', g.slice(0, 50))
  } catch (e) {
    console.log('  repair FAIL:', g.slice(0, 50), '->', e.message)
  }
}
