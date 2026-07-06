import fs from 'fs'
import path from 'path'
import { createGuardedWriter } from './guardrail'
import { verifyPublishedLessonJson } from './verify-published-lesson'

export type MechanicalFixReport = {
  runAt: string
  scanned: number
  updated: number
  katexFixed: number
  schemaFixed: number
  files: string[]
}

function shouldSkipDir(name: string): boolean {
  return name.startsWith('_') || name.startsWith('.')
}

function shouldSkipFile(name: string): boolean {
  if (!name.endsWith('.json')) return true
  if (name.endsWith('.pilot.json') || name.endsWith('.shadow.json')) return true
  if (name.includes('.improve.')) return true
  return false
}

const EN_DASH = '\u2013'
const EM_DASH = '\u2014'
const OMEGA = '\u03A9'
const MICRO = '\u00B5'
const SUP2 = '\u00B2'
const SUP1 = '\u00B9'

const SUP_MINUS = '\u207B' // ⁻
const SUP_DIGIT_ONE = '\u00B9' // ¹
const SUP_DIGIT_TWO = '\u00B2' // ²
const SUP_DIGIT_THREE = '\u00B3' // ³
const OMINUS = '\u29BF' // ⦵

/** Unicode superscript digits/symbols → LaTeX (inside math fragments). */
function fixUnicodeSuperscripts(s: string): string {
  let out = s
  // Combined superscript minus + digit (e.g. ⁻¹)
  out = out.replace(/\u207B\u00B9/g, '^{-1}')
  out = out.replace(/\u207B\u00B2/g, '^{-2}')
  out = out.replace(/\u207B\u00B3/g, '^{-3}')
  out = out.replace(/mol\u207B\u00B9/g, 'mol^{-1}')
  out = out.replace(/mol⁻¹/g, 'mol^{-1}')
  out = out.replace(/s\u207B\u00B9/g, 's^{-1}')
  out = out.replace(/s⁻¹/g, 's^{-1}')
  // \text{ unit³ } → \mathrm{unit}^{3}
  out = out.replace(/\\text\{\s*dm³\s*\}/g, '\\mathrm{dm}^{3}')
  out = out.replace(/\\text\{\s*cm³\s*\}/g, '\\mathrm{cm}^{3}')
  out = out.replace(/\\text\{\s*m³\s*\}/g, '\\mathrm{m}^{3}')
  out = out.replace(/\\text\{\s*dm\^?\{?3\}?\s*\}/g, '\\mathrm{dm}^{3}')
  out = out.replace(/\\text\{\s*cm\^?\{?3\}?\s*\}/g, '\\mathrm{cm}^{3}')
  out = out.replace(/\\text\{\s*([^}]*?)mol\^?\{-?1\}\s*\}/g, '\\mathrm{$1mol}^{-1}')
  out = out.replace(/\\text\{\s*g mol⁻¹\s*\}/g, '\\mathrm{g\\,mol}^{-1}')
  out = out.replace(/\\text\{\s*g mol\^?\{-?1\}\s*\}/g, '\\mathrm{g\\,mol}^{-1}')
  out = out.replace(/\\text\{\s*s⁻¹\s*\}/g, '\\mathrm{s}^{-1}')
  out = out.replace(/\\text\{\s*s\^?\{-?1\}\s*\}/g, '\\mathrm{s}^{-1}')
  out = out.replace(/\\text\{\s*([^}]*?)⁻¹\s*\}/g, '\\mathrm{$1}^{-1}')
  out = out.replace(/dm³/g, '\\mathrm{dm}^{3}')
  out = out.replace(/cm³/g, '\\mathrm{cm}^{3}')
  out = out.replace(/m³/g, '\\mathrm{m}^{3}')
  out = out.replace(/E\^⦵/g, 'E^{\\ominus}')
  out = out.replace(new RegExp(`E\\^${OMINUS}`, 'g'), 'E^{\\ominus}')
  out = out.replace(/e⁻/g, 'e^{-}')
  out = out.replace(new RegExp(EN_DASH, 'g'), '-')
  out = out.replace(new RegExp(EM_DASH, 'g'), '-')
  // Fix broken partial replacements from earlier passes
  out = out.replace(/mol-\^\{1\}/g, 'mol^{-1}')
  out = out.replace(/-\^\{(\d)\}/g, '^{-$1}')
  return out
}

/** Escape `$1.25`-style currency so it is not parsed as inline math. */
function escapeCurrencyDollars(text: string): string {
  return text.replace(/(?<!\\)\$(\d[\d,]*\.?\d*)/g, '\\$$$1')
}

/** Strip zero-width and BOM characters that break KaTeX. */
function stripInvisibleChars(text: string): string {
  return text.replace(/[\u200B-\u200D\uFEFF]/g, '')
}

/** JSON sometimes stores literal backslash-n instead of a newline; not a LaTeX command. */
function fixLiteralEscapedNewlines(text: string): string {
  return text.replace(/\\n(?![a-zA-Z])/g, '\n')
}

/** Double-escaped LaTeX commands (\\begin) from over-escaped JSON. */
function fixDoubleEscapedLatexCommands(text: string): string {
  return text
    .replace(/\\\\begin\{/g, '\\begin{')
    .replace(/\\\\end\{/g, '\\end{')
    .replace(/\\\\to\b/g, '\\to')
    .replace(/\\\\times\b/g, '\\times')
    .replace(/\\\\implies\b/g, '\\implies')
}

/** Fix common math fragments inside $...$ or $$...$$ delimiters. */
function fixMathFragment(fragment: string): string {
  let out = fragment
  // Before generic unicode superscript pass — ⁻ inside \text{} breaks KaTeX
  out = out.replace(/\\text\{\s*m s⁻²\s*\}/g, '\\text{m s}^{-2}')
  out = out.replace(/\\text\{\s*m s⁻¹\s*\}/g, '\\text{m s}^{-1}')
  out = out.replace(/\\text\{\s*m s\^\{-2\}\s*\}/g, '\\text{m s}^{-2}')
  out = out.replace(/\\text\{\s*m s\^\{-1\}\s*\}/g, '\\text{m s}^{-1}')
  out = fixUnicodeSuperscripts(out)
  out = out.replace(/\\pounds/g, '£')
  out = out.replace(/\\text\{\s*µm\s*\}/g, '\\mu\\text{m}')
  out = out.replace(/\\text\{\s*µ\s*\}/g, '\\mu')
  out = out.replace(/\\text\{\s*([^}]*?)\\textsuperscript\{([^}]+)\}([^}]*)\}/g, '\\text{$1}^{$2}$3')
  out = out.replace(/\\text\{([^}]*?)\\mathrm\{([^}]+)\}\^\{([^}]+)\}([^}]*)\}/g, '\\text{$1}\\mathrm{$2}^{$3}')
  out = out.replace(/\\text\{([^}]*?[−–—][^}]*)\}/g, (m) =>
    m.replace(/[−–—]/g, '-')
  )
  out = out.replace(/\\"/g, '')
  out = out.replace(/(\d)\^{-0}(\d)/g, '$1$2')
  out = out.replace(/(\d)\^{-0}(?![0-9])/g, '$10')
  out = out.replace(new RegExp(EN_DASH, 'g'), '-')
  out = out.replace(new RegExp(EM_DASH, 'g'), '-')
  out = out.replace(/(?<!\\)%/g, '\\%')
  out = out.replace(new RegExp(`\\\\text\\{\\s*${OMEGA}\\s*\\}`, 'g'), '\\Omega')
  out = out.replace(new RegExp(`\\\\text\\{\\s*${MICRO}F\\s*\\}`, 'g'), '\\mu\\text{F}')
  out = out.replace(new RegExp(`\\\\text\\{\\s*${MICRO}C\\s*\\}`, 'g'), '\\mu\\text{C}')
  out = out.replace(new RegExp(`\\\\text\\{\\s*${MICRO}\\s*\\}`, 'g'), '\\mu')
  out = out.replace(new RegExp(`\\\\text\\{\\s*m s${SUP2}\\s*\\}`, 'g'), '\\text{m s}^{-2}')
  out = out.replace(new RegExp(`\\\\text\\{\\s*m s${SUP1}\\s*\\}`, 'g'), '\\text{m s}^{-1}')
  out = out.replace(new RegExp(`\\\\text\\{\\s*W m${SUP2}\\s*\\}`, 'g'), '\\text{W m}^{-2}')
  out = out.replace(new RegExp(`\\\\text\\{\\s*s${SUP1}\\s*\\}`, 'g'), '\\text{s}^{-1}')
  out = out.replace(/\\textsuperscript\{(-?\d+)\}/g, '^{$1}')
  return out
}

function fixMathDelimiters(text: string): string {
  return text
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, inner) => `$$${fixMathFragment(inner)}$$`)
    .replace(/(?<!\$)\$(?!\$)([^$\n]+?)\$(?!\$)/g, (_, inner) => `$${fixMathFragment(inner)}$`)
}

/** Deterministic KaTeX / text normalisation in lesson JSON strings. */
export function fixKatexInText(text: string): { text: string; changed: boolean } {
  const before = text
  let normalized = stripInvisibleChars(before)
  normalized = fixLiteralEscapedNewlines(normalized)
  normalized = fixDoubleEscapedLatexCommands(normalized)
  normalized = escapeCurrencyDollars(normalized)
  normalized = fixUnicodeSuperscripts(normalized)
  const out = fixMathDelimiters(normalized)
  return { text: out, changed: out !== before }
}

function normalizeInvalidSection(section: Record<string, unknown>): Record<string, unknown> | null {
  const type = section.type as string | undefined

  if (type === 'faq') {
    if (Array.isArray(section.items) && section.items.length > 0) {
      const blocks = section.items
        .filter((item): item is { q: string; a: string } => {
          return !!item && typeof item === 'object' && 'q' in item && 'a' in item
        })
        .map((item) => `**Q:** ${String(item.q)}\n\n**A:** ${String(item.a)}`)
      if (blocks.length > 0) {
        return { type: 'text', content: blocks.join('\n\n') }
      }
    }
    if (section.q && section.a) {
      return {
        type: 'text',
        content: `**Q:** ${String(section.q)}\n\n**A:** ${String(section.a)}`,
      }
    }
  }

  if (type === 'callout' && section.content) {
    const title = section.title ? `**${String(section.title)}**\n\n` : ''
    return { type: 'examTip', content: `${title}${String(section.content)}` }
  }

  if (!type && Array.isArray(section.keyPoints)) {
    return { type: 'keyPoints', items: section.keyPoints.map(String) }
  }

  if (!type && section.content) {
    return { type: 'text', content: String(section.content) }
  }

  return null
}

function fixLessonDeep(value: unknown): { value: unknown; katex: boolean; schema: boolean } {
  if (typeof value === 'string') {
    const { text, changed } = fixKatexInText(value)
    return { value: text, katex: changed, schema: false }
  }

  if (Array.isArray(value)) {
    let katex = false
    let schema = false
    const next = value.map((item) => {
      const r = fixLessonDeep(item)
      katex = katex || r.katex
      schema = schema || r.schema
      return r.value
    })
    return { value: next, katex, schema }
  }

  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const next: Record<string, unknown> = { ...obj }
    let katex = false
    let schema = false

    if (Array.isArray(obj.sections)) {
      const sections: unknown[] = []
      for (const item of obj.sections) {
        if (item && typeof item === 'object') {
          const rec = item as Record<string, unknown>
          const validTypes = new Set([
            'intro', 'heading', 'text', 'formula', 'keyPoints', 'examTip',
            'workedExample', 'pastPaperPractice', 'practice', 'resources', 'interactive',
          ])
          if (!validTypes.has(String(rec.type ?? ''))) {
            const normalized = normalizeInvalidSection(rec)
            if (normalized) {
              schema = true
              sections.push(normalized)
              continue
            }
          }
          if (rec.type === 'keyPoints' && Array.isArray(rec.items)) {
            const items = rec.items.map(String).filter((s) => s.trim().length > 0)
            if (items.length !== rec.items.length) {
              schema = true
              sections.push({ ...rec, items })
              continue
            }
          }
        }
        const r = fixLessonDeep(item)
        katex = katex || r.katex
        schema = schema || r.schema
        sections.push(r.value)
      }
      next.sections = sections
    }

    for (const [k, v] of Object.entries(obj)) {
      if (k === 'sections') continue
      if (
        k === 'solution' &&
        obj.type === 'workedExample' &&
        Array.isArray(v) &&
        v.every((x) => typeof x === 'string')
      ) {
        next[k] = v.join('\n')
        schema = true
        continue
      }
      const r = fixLessonDeep(v)
      katex = katex || r.katex
      schema = schema || r.schema
      next[k] = r.value
    }
    return { value: next, katex, schema }
  }

  return { value, katex: false, schema: false }
}

export function applyMechanicalFixesToLesson(raw: unknown): {
  lesson: unknown
  katex: boolean
  schema: boolean
} {
  const r = fixLessonDeep(raw)
  return { lesson: r.value, katex: r.katex, schema: r.schema }
}

function needsMechanicalFix(
  raw: unknown,
  rel: string,
  subjectCode: string
): { katex: boolean; schema: boolean } {
  const audit = verifyPublishedLessonJson(raw, rel, subjectCode, { auditStrict: true })
  const codes = new Set(audit.issues.filter((i) => i.severity === 'error').map((i) => i.code))
  return {
    katex: codes.has('katex_parse_error'),
    schema: codes.has('schema_invalid'),
  }
}

function fixResolvedMechanicalIssues(
  before: unknown,
  after: unknown,
  rel: string,
  subjectCode: string,
  need: { katex: boolean; schema: boolean }
): boolean {
  const beforeAudit = verifyPublishedLessonJson(before, rel, subjectCode, { auditStrict: true })
  const afterAudit = verifyPublishedLessonJson(after, rel, subjectCode, { auditStrict: true })
  const beforeCodes = new Set(
    beforeAudit.issues.filter((i) => i.severity === 'error').map((i) => i.code)
  )
  const afterCodes = new Set(
    afterAudit.issues.filter((i) => i.severity === 'error').map((i) => i.code)
  )

  if (need.schema) {
    const beforeSchema = beforeAudit.issues.filter((i) => i.code === 'schema_invalid').length
    const afterSchema = afterAudit.issues.filter((i) => i.code === 'schema_invalid').length
    if (afterSchema === 0) {
      if (!need.katex) return true
    } else if (afterSchema >= beforeSchema) {
      return false
    }
  }

  if (!need.katex) return true

  const beforeKatex = beforeAudit.issues.filter((i) => i.code === 'katex_parse_error').length
  const afterKatex = afterAudit.issues.filter((i) => i.code === 'katex_parse_error').length
  if (afterKatex === 0) return true
  return afterKatex < beforeKatex
}

export function runMechanicalFixes(opts: {
  projectRoot?: string
  relPaths?: string[]
}): MechanicalFixReport {
  const projectRoot = opts.projectRoot ?? process.cwd()
  const coursesRoot = path.join(projectRoot, 'content', 'courses')
  process.env.COURSE_AUTONOMY = '1'
  const writer = createGuardedWriter()

  const files: string[] = []
  let scanned = 0
  let katexFixed = 0
  let schemaFixed = 0

  const processFile = (rel: string) => {
    const abs = path.join(projectRoot, rel)
    if (!fs.existsSync(abs)) return

    const subjectCode = rel.split('/')[2] ?? ''
    let raw: unknown
    try {
      raw = JSON.parse(fs.readFileSync(abs, 'utf8'))
    } catch {
      return
    }

    const status = (raw as { status?: string }).status
    if (status !== 'premium' && status !== 'published') return

    scanned += 1
    const need = needsMechanicalFix(raw, rel, subjectCode)
    if (!need.katex && !need.schema) return

    const fixed = applyMechanicalFixesToLesson(raw)
    if (!fixResolvedMechanicalIssues(raw, fixed.lesson, rel, subjectCode, need)) return

    writer.writeFile(rel, `${JSON.stringify(fixed.lesson, null, 2)}\n`)
    files.push(rel)
    if (need.katex) katexFixed += 1
    if (need.schema) schemaFixed += 1
  }

  if (opts.relPaths?.length) {
    for (const rel of opts.relPaths) processFile(rel)
  } else if (fs.existsSync(coursesRoot)) {
    const walk = (dir: string) => {
      for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const abs = path.join(dir, ent.name)
        if (ent.isDirectory()) {
          if (shouldSkipDir(ent.name)) continue
          walk(abs)
          continue
        }
        if (shouldSkipFile(ent.name)) continue
        const rel = path.relative(projectRoot, abs).split(path.sep).join('/')
        processFile(rel)
      }
    }
    walk(coursesRoot)
  }

  return {
    runAt: new Date().toISOString(),
    scanned,
    updated: files.length,
    katexFixed,
    schemaFixed,
    files,
  }
}
