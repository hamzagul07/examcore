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
// normal markdown preserved
eq(stripRawHtml('# Hello **world**'), '# Hello **world**', 'preserve plain markdown')

// --- clamp ---
eq(clampNoteContent('a'.repeat(30000)).length, 20000, 'clamp to 20000')

if (failed) {
  console.error(`\nsanitize.test.ts: ${failed} FAILED`)
  process.exit(1)
}
console.log('sanitize.test.ts: all passed')
