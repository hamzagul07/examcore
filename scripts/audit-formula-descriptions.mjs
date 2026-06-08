import fs from 'fs'
import path from 'path'

const ROOT = path.join(process.cwd(), 'content', 'courses')
const OUT = path.join(process.cwd(), 'docs', 'formula-description-audit.md')

const RAW_LATEX =
  /\\(?:lambda|theta|Delta|frac|cos|sin|tan|sqrt|propto|times|text|mathrm|alpha|beta|gamma|pi|sigma|omega|mu|nu|rho|phi|epsilon)\b/i

function countDollars(s) {
  return (s.match(/\$/g) ?? []).length
}

function rawLatexOutsideMath(text) {
  const stripped = text.replace(/\$\$[^$]+\$\$/g, '').replace(/\$[^$]+\$/g, '')
  return RAW_LATEX.test(stripped)
}

function longMathSpans(text) {
  const bad = []
  for (const m of text.matchAll(/\$([^$]+)\$/g)) {
    if (m[1].length > 30) bad.push(m[1])
  }
  return bad
}

function hasHtml(text) {
  return /<(?:br|p|div|span|b|i|strong|em)\b/i.test(text)
}

function splitDescription(content) {
  const s = content
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .trim()
  const lines = []
  for (const segment of s.split(/\n+/)) {
    const t = segment.trim()
    if (!t) continue
    const inlines = [...t.matchAll(/\$([^$]+)\$/g)]
    if (inlines.length) {
      for (const m of inlines) lines.push(m[1].trim())
    } else if (/=/.test(t)) {
      lines.push(t.replace(/^\$+|\$+$/g, '').trim())
    }
  }
  const latex = lines[0] ?? ''
  const description = s
    .replace(/\$\$[^$]+\$\$/g, ' ')
    .replace(/\$[^$]+\$/g, ' ')
    .replace(/:\s*$/, '')
    .trim()
  return { description, expression: latex ? `$${latex}$` : '' }
}

function auditLesson(rel, lesson) {
  const issues = []
  for (const section of lesson.sections ?? []) {
    if (section.type !== 'formula') continue
    const { description, expression } = splitDescription(section.content)
    const problems = []
    if (!description.trim() && !section.content.includes('$')) continue

    if (hasHtml(description) || hasHtml(section.content)) {
      problems.push('Contains HTML tags (<br>, <p>, etc.)')
    }
    const dollars = countDollars(description)
    if (dollars % 2 !== 0) problems.push(`Unmatched $ count (${dollars})`)
    const longSpans = longMathSpans(description)
    if (longSpans.length) {
      problems.push(`Long math span(s) >30 chars`)
    }
    if (rawLatexOutsideMath(description) || rawLatexOutsideMath(section.content)) {
      problems.push('Raw LaTeX outside $...$ delimiters')
    }
    if (problems.length) {
      issues.push({ lesson: rel, topicCode: lesson.topicCode, expression, description, problems })
    }
  }
  return issues
}

let lessonCount = 0
let formulaCount = 0
const allIssues = []

for (const code of fs.readdirSync(ROOT)) {
  const dir = path.join(ROOT, code)
  if (!fs.statSync(dir).isDirectory()) continue
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    const rel = `${code}/${file}`
    const lesson = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'))
    lessonCount++
    formulaCount += (lesson.sections ?? []).filter((s) => s.type === 'formula').length
    allIssues.push(...auditLesson(rel, lesson))
  }
}

const lines = [
  '# Formula description audit',
  '',
  `Generated: ${new Date().toISOString()}`,
  '',
  `Scanned **${lessonCount}** lesson files, **${formulaCount}** formula sections.`,
  '',
  allIssues.length
    ? `**${allIssues.length}** issue(s) found.`
    : '**No issues found** — all formula descriptions pass checks.',
  '',
]

if (allIssues.length) {
  for (const issue of allIssues) {
    lines.push(`## ${issue.lesson} (${issue.topicCode})`)
    lines.push('')
    lines.push(`- **Expression:** ${issue.expression}`)
    lines.push(`- **Problems:** ${issue.problems.join('; ')}`)
    lines.push(`- **Description:** ${issue.description.slice(0, 300).replace(/\n/g, ' ')}`)
    lines.push('')
  }
}

fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, `${lines.join('\n')}\n`)
console.log(`Wrote ${OUT}`)
console.log(`${allIssues.length} issue(s) across ${lessonCount} lessons`)
