/**
 * Normalize `type:"formula"` section content across content/courses so it
 * passes the formula-description audit without changing how it renders.
 *
 * - `<br>` / block tags  ->  newlines (the renderer already does this; we just
 *   remove the raw HTML from source so the audit's HTML check passes).
 * - Bare LaTeX (no `$`)  ->  wrapped in `$...$` (single eq) or `$$...$$`
 *   (multi-line, collapsing repeated `\\` line-breaks). This is the intended
 *   convention; the renderer wraps bare LaTeX identically, so parse output is
 *   unchanged (verified below).
 *
 * Run:  npx tsx scripts/normalize-formula-content.ts          (verify only)
 *       npx tsx scripts/normalize-formula-content.ts --write   (apply)
 */
import fs from 'fs'
import path from 'path'
import { parseFormulaParts } from '../lib/courses/formula-parts'

const ROOT = path.join(process.cwd(), 'content', 'courses')
const WRITE = process.argv.includes('--write')

// Mirrors the audit's two checks exactly so we only touch what it flags.
const RAW_LATEX =
  /\\(?:lambda|theta|Delta|frac|cos|sin|tan|sqrt|propto|times|text|mathrm|alpha|beta|gamma|pi|sigma|omega|mu|nu|rho|phi|epsilon)\b/i
function rawLatexOutsideMath(text: string): boolean {
  const stripped = text.replace(/\$\$[^$]+\$\$/g, '').replace(/\$[^$]+\$/g, '')
  return RAW_LATEX.test(stripped)
}
function hasHtml(text: string): boolean {
  return /<(?:br|p|div|span|b|i|strong|em)\b/i.test(text)
}

function normalizeFormula(content: string): string {
  let c = content

  // 1. Strip the HTML the audit flags (real tags only — never pseudocode like
  //    `<identifier>`). The renderer already turns <br> into line breaks, so
  //    this is render-neutral; it just removes raw HTML from source.
  if (hasHtml(c)) {
    c = c
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/?(?:p|div)\b[^>]*>/gi, '\n')
      .replace(/<\/?(?:span|b|i|strong|em)\b[^>]*>/gi, '')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }

  // 2. Wrap bare LaTeX in math delimiters — ONLY when there is genuine LaTeX
  //    outside any existing $...$ (the audit's exact condition). This skips
  //    pseudocode / code-block formula sections, which contain no LaTeX
  //    commands and must stay untouched.
  if (!c.includes('$') && rawLatexOutsideMath(c)) {
    c = c
      .replace(/(?:\\\\[ \t]*){2,}/g, ' \\\\ ')
      .replace(/[ \t]+/g, ' ')
      .trim()
    c = /\\\\/.test(c) ? `$$${c}$$` : `$${c}$`
  }

  return c
}

type Diff = { file: string; before: string; after: string; parseChanged: boolean; detail?: string }

const diffs: Diff[] = []
const skipped: { file: string; before: string; after: string; detail: string }[] = []
let lessons = 0
let formulas = 0
let changed = 0

// The FormulaCard hides placeholder/noise parts, so only these "rendered"
// parts actually appear to a student. A regression = this set changing.
function renderedParts(content: string, lesson: any, code: string): string[] {
  const p = parseFormulaParts(content, lesson, code)
  return p.parts
    .filter((x) => x.meaning !== 'Definition coming soon' && !x.meaning.endsWith('— key term in this formula'))
    .map((x) => `${x.symbol}=${x.meaning}`)
    .sort()
}

function exprSig(content: string, lesson: any, code: string): string {
  return JSON.stringify(parseFormulaParts(content, lesson, code).expressions)
}

function walk(dir: string, code: string) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name)
    if (fs.statSync(p).isDirectory()) {
      walk(p, name)
      continue
    }
    if (!name.endsWith('.json')) continue
    let lesson: any
    try {
      lesson = JSON.parse(fs.readFileSync(p, 'utf8'))
    } catch {
      continue
    }
    lessons++
    let mutated = false
    for (const s of lesson.sections ?? []) {
      if (s.type !== 'formula' || typeof s.content !== 'string') continue
      formulas++
      const after = normalizeFormula(s.content)
      if (after === s.content) continue
      const before = s.content
      const partsBefore = renderedParts(before, lesson, code)
      const partsAfter = renderedParts(after, lesson, code)
      const partsChanged = JSON.stringify(partsBefore) !== JSON.stringify(partsAfter)
      const exprChanged = exprSig(before, lesson, code) !== exprSig(after, lesson, code)

      if (partsChanged) {
        // Would alter the tappable definitions a student sees — skip, report.
        skipped.push({
          file: `${code}/${name}`,
          before,
          after,
          detail: `parts before: ${JSON.stringify(partsBefore)}\n      parts after : ${JSON.stringify(partsAfter)}`,
        })
        continue
      }

      changed++
      diffs.push({
        file: `${code}/${name}`,
        before,
        after,
        parseChanged: exprChanged,
        detail: undefined,
      })
      s.content = after
      mutated = true
    }
    if (mutated && WRITE) {
      fs.writeFileSync(p, JSON.stringify(lesson, null, 2) + '\n')
    }
  }
}

for (const code of fs.readdirSync(ROOT)) {
  const dir = path.join(ROOT, code)
  if (fs.statSync(dir).isDirectory()) walk(dir, code)
}

const exprOnly = diffs.filter((d) => d.parseChanged)
console.log(`Lessons: ${lessons} | formula sections: ${formulas}`)
console.log(`WRITTEN (rendered parts unchanged): ${changed}  [of which ${exprOnly.length} also render the equation better]`)
console.log(`SKIPPED (would change tappable definitions): ${skipped.length}`)
if (skipped.length) {
  console.log('\n--- SKIPPED sections (left for manual review) ---')
  for (const d of skipped) {
    console.log(`\n[${d.file}]`)
    console.log(`  before: ${JSON.stringify(d.before).slice(0, 140)}`)
    console.log(`  after : ${JSON.stringify(d.after).slice(0, 140)}`)
    console.log(`  ${d.detail}`)
  }
}
console.log(WRITE ? '\n[WRITE] files updated.' : '\n[DRY RUN] no files written. Re-run with --write to apply.')
