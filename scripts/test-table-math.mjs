/**
 * Test table cell math pipeline.
 * Run: npx tsx scripts/test-table-math.mjs
 */

import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import remarkGfm from 'remark-gfm'
import rehypeKatex from 'rehype-katex'
import { normalizeMarkingText } from '../lib/rich-text/normalize-marking-text.ts'
import { normalizeQuestionText } from '../lib/rich-text/normalize-question-text.ts'

const TABLE = `| nucleon number | proton number |
| --- | --- |
| Mg$^{2+}$ | 24 |
| Al$^{3+}$ | 27 |`

function renderHtml(md, gfmFirst) {
  const plugins = gfmFirst
    ? [remarkGfm, [remarkMath, { singleDollarTextMath: true }]]
    : [[remarkMath, { singleDollarTextMath: true }], remarkGfm]
  return renderToStaticMarkup(
    React.createElement(ReactMarkdown, {
      remarkPlugins: plugins,
      rehypePlugins: [rehypeKatex],
      children: md,
    })
  )
}

function hasKatexInTd(html) {
  return /<td[^>]*>[\s\S]*?class="katex[\s\S]*?<\/td>/i.test(html)
}

function hasRawMgMath(html) {
  return html.includes('Mg$') || html.includes('$^{2+}$')
}

const prodRaw =
  'nucleon number | proton number | number of electrons\nMg$^{2+}$ | 24 | |\nAl$^{3+}$ | 27 | |'
const prodQuestion = normalizeQuestionText(prodRaw)
const prodWithMarking = normalizeMarkingText(prodQuestion)

console.log('normalizeMarkingText on row:')
console.log(' in:', '| Mg$^{2+}$ | 24 |')
console.log(' out:', normalizeMarkingText('| Mg$^{2+}$ | 24 |'))

const htmlMathFirst = renderHtml(TABLE, false)
const htmlGfmFirst = renderHtml(TABLE, true)
const htmlProdBad = renderHtml(prodWithMarking, true)
const htmlProdGood = renderHtml(prodQuestion, true)

console.log('\nplugin math→gfm: katex in td', hasKatexInTd(htmlMathFirst), 'raw$', hasRawMgMath(htmlMathFirst))
console.log('plugin gfm→math: katex in td', hasKatexInTd(htmlGfmFirst), 'raw$', hasRawMgMath(htmlGfmFirst))
console.log('prod + marking norm: katex', hasKatexInTd(htmlProdBad), 'raw$', hasRawMgMath(htmlProdBad))
console.log('prod question only: katex', hasKatexInTd(htmlProdGood), 'raw$', hasRawMgMath(htmlProdGood))

const ok =
  hasKatexInTd(htmlGfmFirst) &&
  !hasRawMgMath(htmlGfmFirst) &&
  hasKatexInTd(htmlProdGood) &&
  !hasRawMgMath(htmlProdGood) &&
  !hasKatexInTd(htmlProdBad)

console.log(ok ? '\nPASS' : '\nFAIL')
process.exit(ok ? 0 : 1)
