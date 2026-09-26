import { safeUrl, stripRawHtml, clampNoteContent } from './sanitize'

let failed = 0
function eq(actual: unknown, expected: unknown, label: string) {
  if (actual !== expected) {
    failed++
    console.error(`FAIL ${label}: got ${JSON.stringify(actual)} want ${JSON.stringify(expected)}`)
  }
}
function truthy(actual: boolean, label: string) {
  if (!actual) {
    failed++
    console.error(`FAIL ${label}`)
  }
}

// --- safeUrl: dangerous protocols rejected ---
eq(safeUrl('javascript:alert(1)'), undefined, 'reject javascript:')
eq(safeUrl('JavaScript:alert(1)'), undefined, 'reject JavaScript: (case)')
eq(safeUrl(' javascript:alert(1)'), undefined, 'reject leading-space javascript:')
eq(safeUrl('data:text/html,<script>'), undefined, 'reject data:')
eq(safeUrl('vbscript:msgbox'), undefined, 'reject vbscript:')
eq(safeUrl('file:///etc/passwd'), undefined, 'reject file:')

// --- safeUrl: safe values allowed ---
eq(safeUrl('https://example.com/x'), 'https://example.com/x', 'allow https')
eq(safeUrl('http://example.com'), 'http://example.com', 'allow http')
eq(safeUrl('mailto:a@b.com'), 'mailto:a@b.com', 'allow mailto')
eq(safeUrl('/courses/9702'), '/courses/9702', 'allow relative /')
eq(safeUrl('#section'), '#section', 'allow anchor')
eq(safeUrl(''), undefined, 'empty -> undefined')
eq(safeUrl(null), undefined, 'null -> undefined')

// --- stripRawHtml: injection markers neutralized ---
truthy(!/<script/i.test(stripRawHtml('<script>alert(1)</script>')), 'strip <script>')
truthy(!/<iframe/i.test(stripRawHtml('<iframe src=x>')), 'strip <iframe>')
truthy(!/\sonerror=/i.test(stripRawHtml('<img onerror=alert(1)>')), 'neutralize onerror=')
truthy(!/javascript:/i.test(stripRawHtml('[x](javascript:alert(1))')), 'strip javascript: in text')
// A single pass leaves `javascript:` behind once the outer copy is removed —
// the strip must loop until the string stops changing.
truthy(!/javascript:/i.test(stripRawHtml('[x](javajavascript:script:alert(1))')), 'nested javascript: collapses')
truthy(
  !/javascript:/i.test(stripRawHtml('javajavajavascript:script:script:')),
  'triply nested javascript: collapses'
)
truthy(!/vbscript:/i.test(stripRawHtml('[x](vbscript:msgbox)')), 'strip vbscript:')
truthy(!/vbscript:/i.test(stripRawHtml('vbvbscript:script:')), 'nested vbscript: collapses')
truthy(!/javascript\s*:/i.test(stripRawHtml('javascript :alert(1)')), 'space before the colon still stripped')
truthy(!/data:\s*text\/html/i.test(stripRawHtml('[x](data:text/html,<b>)')), 'strip data:text/html')
truthy(
  !/data:\s*text\/html/i.test(stripRawHtml('data:text/data:text/htmlhtml')),
  'nested data:text/html collapses'
)
truthy(
  !/(javascript|vbscript)\s*:/i.test(stripRawHtml('vbjavascript:script:')),
  'schemes nested inside each other collapse'
)
// safeUrl stays the real gate: what the stripper would let through in text
// form is still refused as a link target.
eq(safeUrl('java\nscript:alert(1)'), undefined, 'safeUrl rejects newline-split javascript:')
eq(safeUrl('java\tscript:alert(1)'), undefined, 'safeUrl rejects tab-split javascript:')
eq(safeUrl('data:image/png;base64,AAAA'), undefined, 'safeUrl rejects data: images too')
// normal markdown preserved
eq(stripRawHtml('# Hello **world**'), '# Hello **world**', 'preserve plain markdown')
eq(stripRawHtml('The data: column shows x'), 'The data: column shows x', 'plain "data:" prose survives')
eq(stripRawHtml(''), '', 'empty in, empty out')

// --- clamp ---
eq(clampNoteContent('a'.repeat(30000)).length, 20000, 'clamp to 20000')

if (failed) {
  console.error(`\nsanitize.test.ts: ${failed} FAILED`)
  process.exit(1)
}
console.log('sanitize.test.ts: all passed')
