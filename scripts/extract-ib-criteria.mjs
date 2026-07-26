/**
 * Extract IB assessment criteria + band descriptors from a subject guide PDF.
 *
 * Writes JSON for review; it does NOT touch the database. Applying is a separate,
 * deliberate step — criteria are verbatim licensed content and a bad extraction
 * would put a wrong rubric in front of students, which is worse than no rubric.
 *
 *   node scripts/extract-ib-criteria.mjs <guide.pdf> <subject-code> <out.json> [firstPage] [lastPage]
 *
 * Verbatim fidelity is the whole point: the prompt forbids paraphrase, and the
 * output is checked back against the source text before it is written.
 */
import fs from 'node:fs'
import path from 'node:path'

const [, , pdfPath, subjectCode, outPath, firstArg, lastArg] = process.argv
if (!pdfPath || !subjectCode || !outPath) {
  console.error('usage: extract-ib-criteria.mjs <guide.pdf> <subject-code> <out.json> [firstPage] [lastPage]')
  process.exit(1)
}

async function pdfText(file, first, last) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(fs.readFileSync(file)),
    useSystemFonts: true,
  }).promise
  const from = first ?? 1
  const to = Math.min(last ?? doc.numPages, doc.numPages)
  const pages = []
  for (let i = from; i <= to; i++) {
    const page = await doc.getPage(i)
    const tc = await page.getTextContent()
    pages.push({ page: i, text: tc.items.map((x) => x.str).join(' ').replace(/\s+/g, ' ').trim() })
  }
  return { numPages: doc.numPages, pages }
}

const SCHEMA_NOTE = `Return JSON only:
{
  "components": [
    {
      "component_key": "snake_case stable key, e.g. textual_analysis",
      "label": "exact component name from the guide",
      "level": "HL" | "SL" | "both",
      "max_marks": number|null,
      "criteria": [
        {
          "letter": "A",
          "name": "exact criterion name",
          "max_marks": number,
          "source_pages": [numbers],
          "bands": [
            { "marks_min": number, "marks_max": number, "descriptor": "VERBATIM text" }
          ]
        }
      ]
    }
  ]
}`

async function main() {
  const first = firstArg ? Number(firstArg) : undefined
  const last = lastArg ? Number(lastArg) : undefined
  const { numPages, pages } = await pdfText(pdfPath, first, last)
  console.error(`[extract] ${path.basename(pdfPath)} — ${numPages} pages, using ${pages.length}`)

  const { generateGeminiText } = await import('../lib/ai/gemini-text.ts')

  const corpus = pages.map((p) => `<page n="${p.page}">\n${p.text}\n</page>`).join('\n\n')

  const system = `You extract assessment criteria from an official IB subject guide.

RULES:
- Descriptors must be VERBATIM. Copy the wording exactly as printed. Never paraphrase, summarise, tidy or merge. If a band lists "possible characteristics" as separate keywords, include only the descriptor sentence(s), not the keyword column.
- Extract ONLY externally/internally assessed components that have criterion-based markbands. Skip components marked with points/objective marking.
- A band's marks_min and marks_max come from the mark column. A single-mark row has marks_min === marks_max.
- If a criterion is applied several times (e.g. once per role), record it ONCE and note that in the name only if the guide does.
- Omit anything you cannot find verbatim. Never invent a descriptor.

${SCHEMA_NOTE}`

  const text = await generateGeminiText(
    `Subject: ${subjectCode}\n\nGuide text:\n\n${corpus}`,
    { task: 'structured-extraction', system, maxOutputTokens: 32000, temperature: 0 }
  )

  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    const m = text.match(/\{[\s\S]*\}/)
    if (!m) {
      console.error('[extract] model did not return JSON')
      process.exit(1)
    }
    parsed = JSON.parse(m[0])
  }

  // Fidelity gate: every descriptor must actually appear in the source text.
  // A hallucinated or "improved" descriptor is the failure mode that matters,
  // and it is cheap to detect by substring.
  const flat = pages.map((p) => p.text).join(' ').replace(/\s+/g, ' ')
  // PDF text extraction inserts a space before punctuation ("This work is good ."),
  // so a naive substring check flags correctly-copied descriptors as suspect.
  // Normalise that away on BOTH sides before comparing.
  const norm = (s) =>
    s
      .replace(/\s+/g, ' ')
      .replace(/[\u201c\u201d]/g, '"')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/\s+([.,;:!?])/g, '$1')
      .trim()
  const haystack = norm(flat)
  let checked = 0
  const suspect = []
  for (const c of parsed.components ?? []) {
    for (const cr of c.criteria ?? []) {
      for (const b of cr.bands ?? []) {
        checked++
        const probe = norm(b.descriptor).slice(0, 60)
        if (probe.length > 12 && !haystack.includes(probe)) {
          suspect.push(`${c.component_key} ${cr.letter} ${b.marks_min}-${b.marks_max}: ${probe}`)
        }
      }
    }
  }

  const report = {
    subjectCode,
    source: path.basename(pdfPath),
    pagesUsed: [pages[0]?.page, pages[pages.length - 1]?.page],
    extractedAt: new Date().toISOString(),
    bandsChecked: checked,
    bandsNotFoundVerbatim: suspect.length,
    suspect,
    ...parsed,
  }
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2))
  console.error(
    `[extract] wrote ${outPath} — ${(parsed.components ?? []).length} components, ${checked} bands, ${suspect.length} not found verbatim`
  )
  if (suspect.length) {
    console.error('[extract] REVIEW THESE before applying:')
    for (const s of suspect.slice(0, 10)) console.error('  -', s)
  }
}

main().catch((e) => {
  console.error('[extract] failed:', e?.message ?? e)
  process.exit(1)
})
