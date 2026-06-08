/**
 * Heuristic structure analysis on Mathpix MMD + lines.json output.
 */

const QUESTION_HEAD_RE =
  /^(?:#{1,3}\s*)?(\d{1,2})(\([a-z]\))?(\([ivxlc]+\))?(\([a-z]\))?(\([ivxlc]+\))?\b/i

const MARK_BRACKET_RE = /\[(\d+(?:\s*\/\s*2)?)\]\s*$/i
const MARK_PAREN_RE = /\((\d+)\s*marks?\)/i

const ROMAN_SET = new Set(['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'])

function nestingDepth(qn) {
  const parts = qn.match(/\([a-z]\)|\([ivxlc]+\)/gi) || []
  return parts.length
}

function parseQuestionLabel(raw) {
  const m = raw.trim().match(QUESTION_HEAD_RE)
  if (!m) return null
  let label = m[1]
  for (let i = 2; i <= 5; i++) {
    if (m[i]) label += m[i].toLowerCase()
  }
  return label
}

export function analyzeMmd(mmd) {
  const lines = mmd.split(/\r?\n/)
  const questionLines = []
  const markFormats = { bracket: 0, paren_marks: 0, paren_number: 0 }
  const subPartStyles = { lowercase: 0, roman: 0 }
  let maxDepth = 0
  const samples = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    const label = parseQuestionLabel(trimmed)
    if (label) {
      const depth = nestingDepth(label)
      maxDepth = Math.max(maxDepth, depth)
      for (const part of label.match(/\([a-z]\)|\([ivxlc]+\)/gi) || []) {
        const inner = part.slice(1, -1)
        if (/^[a-z]$/.test(inner)) subPartStyles.lowercase++
        if (ROMAN_SET.has(inner)) subPartStyles.roman++
      }
      let marks = null
      if (MARK_BRACKET_RE.test(trimmed)) {
        markFormats.bracket++
        marks = trimmed.match(MARK_BRACKET_RE)?.[1] ?? null
      } else if (MARK_PAREN_RE.test(trimmed)) {
        markFormats.paren_marks++
        marks = trimmed.match(MARK_PAREN_RE)?.[1] ?? null
      } else if (/\(\d+\)\s*$/.test(trimmed)) {
        markFormats.paren_number++
      }
      questionLines.push({ label, depth, marks, line: trimmed.slice(0, 120) })
      if (samples.length < 12) samples.push({ label, depth, marks, excerpt: trimmed.slice(0, 160) })
    }
  }

  return {
    question_line_count: questionLines.length,
    max_nesting_depth: maxDepth,
    sub_part_styles: subPartStyles,
    mark_annotation_formats: markFormats,
    sample_question_lines: samples,
    top_level_questions: [
      ...new Set(questionLines.filter((q) => q.depth === 0).map((q) => q.label.replace(/\(.*/, ''))),
    ],
  }
}

export function analyzeLinesJson(linesJson) {
  if (!linesJson?.pages) {
    return {
      page_count: 0,
      diagram_count: 0,
      table_count: 0,
      figure_lines_per_page: [],
    }
  }

  const pages = linesJson.pages
  const figureLinesPerPage = []
  let diagramCount = 0
  let tableCount = 0

  for (const page of pages) {
    const pageNum = page.page ?? page.page_number ?? null
    const pageLines = page.lines || []
    let figures = 0
    let tables = 0
    for (const line of pageLines) {
      const type = (line.type || line.kind || '').toLowerCase()
      const text = (line.text || '').toLowerCase()
      if (type.includes('diagram') || type.includes('figure') || type.includes('image')) {
        figures++
        diagramCount++
      }
      if (type.includes('table') || text.includes('\\begin{tabular}') || text.includes('<table')) {
        tables++
        tableCount++
      }
      if (/^fig\.?\s*\d/i.test(line.text || '')) figures++
    }
    figureLinesPerPage.push({ page: pageNum, figure_like_lines: figures, table_like_lines: tables, line_count: pageLines.length })
  }

  return {
    page_count: pages.length,
    diagram_count: diagramCount,
    table_count: tableCount,
    figure_lines_per_page: figureLinesPerPage,
  }
}
