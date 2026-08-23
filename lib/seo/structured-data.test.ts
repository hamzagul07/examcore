import assert from 'node:assert/strict'
import { jsonLdScript } from './structured-data'

// A community question title reaches this sink unfiltered — stripRawHtml() is
// applied to post bodies, never to titles — and JSON.stringify does not escape
// `<`. The payload below closed the JSON-LD block and executed as markup on
// /community/questions, a public indexed page, with no CSP to blunt it.
{
  const hostile = '</script><script>alert(1)</script>'
  const out = jsonLdScript({ '@type': 'Question', name: hostile })

  assert.ok(!out.includes('</script'), 'must not be able to close the script element')
  assert.ok(!out.includes('<script'), 'must not be able to open one either')
  assert.ok(out.includes('\\u003c'), 'angle brackets are unicode-escaped')

  // The escaping must be lossless: a parser decodes it back to the original.
  const parsed = JSON.parse(out) as { name: string }
  assert.equal(parsed.name, hostile, 'escaping changes the bytes, never the value')
}

// Arrays are the other accepted shape, and ampersands are escaped too so the
// output stays safe if it is ever emitted into an HTML-escaping context.
{
  const out = jsonLdScript([{ name: 'Fish & Chips <b>' }])
  assert.ok(!out.includes('<b>'), 'markup in an array entry is escaped')
  assert.ok(out.includes('\\u0026'), 'ampersands are escaped')
  assert.equal(
    (JSON.parse(out) as Array<{ name: string }>)[0].name,
    'Fish & Chips <b>'
  )
}

console.log('structured-data.test.ts: ok')
