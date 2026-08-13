/**
 * Extract operational marking guidance from an IB Teacher Support Material PDF.
 *
 *   node scripts/extract-ib-guidance.mjs <tsm.pdf> <subject-code> <component-key> <out.json> [first] [last]
 *
 * The companion to `extract-ib-criteria.mjs`, and a different kind of text.
 * Criteria descriptors say what a level IS, verbatim and licensed. Guidance says
 * how an examiner APPLIES it — what distinguishes the top of a band from the
 * bottom, what a common misreading looks like, what earns credit and what only
 * appears to. Every band in the catalogue currently has none, which is why a
 * marker asked to place a TOK essay has "Good. The discussion is focused on the
 * title" and nothing about how good is good enough.
 *
 * Guidance is NOT verbatim licensed content in the way descriptors are, so this
 * does not enforce a substring check. It enforces the opposite discipline: the
 * output must be operational rather than a restatement, and must not contradict
 * or replace the descriptor it accompanies — the prompt sends both.
 *
 * Writes JSON for review. Applying is a separate, deliberate step.
 *
 * WHY NOT SUBJECT REPORTS. They would be the natural source for exam papers —
 * teacher support material turns out to be overwhelmingly about internal
 * assessment (Economics devotes 24 pages to the commentary and 3 to the papers),
 * so the papers get little from this route. Subject reports carry exactly the
 * missing thing: what candidates actually got wrong and what separated strong
 * answers. The archive here holds 1,418 of them and stops at November 2018,
 * which predates every current guide in the catalogue — Economics 2022, TOK
 * 2022, Business Management 2024, the sciences 2025. Examiner commentary on a
 * syllabus nobody sits is worse than none, so the avenue is closed until newer
 * reports exist. Checked 2026-08; re-check if the archive is topped up.
 */
import fs from 'node:fs'
import path from 'node:path'

process.loadEnvFile?.('.env.local')

const [, , pdfPath, subjectCode, componentKey, outPath, firstArg, lastArg] =
  process.argv
if (!pdfPath || !subjectCode || !componentKey || !outPath) {
  console.error(
    'usage: extract-ib-guidance.mjs <tsm.pdf> <subject-code> <component-key> <out.json> [firstPage] [lastPage]'
  )
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
    pages.push({
      page: i,
      text: tc.items.map((x) => x.str).join(' ').replace(/\s+/g, ' ').trim(),
    })
  }
  return { numPages: doc.numPages, pages }
}

const SCHEMA_NOTE = `Return JSON only:
{
  "component_guidance": "How this component is marked overall: the examiner's approach, what the global judgement rests on. 2-4 sentences, or null.",
  "criteria": [
    {
      "letter": "A",
      "guidance": "How this criterion is applied. What examiners look for, what they discount. 2-4 sentences, or null.",
      "bands": [
        {
          "marks_min": number,
          "marks_max": number,
          "guidance": "What separates this band from the ones either side of it, in operational terms. 1-3 sentences.",
          "source_pages": [numbers]
        }
      ]
    }
  ]
}`

async function main() {
  const first = firstArg ? Number(firstArg) : undefined
  const last = lastArg ? Number(lastArg) : undefined
  const { numPages, pages } = await pdfText(pdfPath, first, last)
  console.error(
    `[guidance] ${path.basename(pdfPath)} — ${numPages} pages, using ${pages.length}`
  )

  const { generateGeminiText } = await import('../lib/ai/gemini-text.ts')
  const corpus = pages
    .map((p) => `<page n="${p.page}">\n${p.text}\n</page>`)
    .join('\n\n')

  const system = `You extract OPERATIONAL MARKING GUIDANCE from official IB teacher support material, for use by an examiner applying published assessment criteria.

WHAT YOU ARE PRODUCING:
Guidance that helps someone decide WHERE in a band a piece of work sits, and WHY it is not the band above or below. Think of what a senior examiner says at a standardisation meeting.

RULES:
- Ground everything in this document. If the material does not discuss a band, return null for it rather than inventing plausible advice.
- Do NOT restate or paraphrase the band descriptor. The descriptor is already sent to the marker verbatim, alongside your guidance. Repeating it wastes the slot and adds nothing.
- Be operational and concrete: what distinguishes adjacent bands, what examiners commonly over-credit, what a borderline case turns on.
- Never contradict the published descriptor. Guidance refines application; it does not redefine the standard.
- No hedging, no encouragement, no meta-commentary about the course.
- Prefer silence to filler. A null is a better answer than a sentence that could have been written without reading the document.

${SCHEMA_NOTE}`

  const text = await generateGeminiText(
    `Subject: ${subjectCode}\nComponent: ${componentKey}\n\nTeacher support material:\n\n${corpus}`,
    { task: 'structured-extraction', system, maxOutputTokens: 16000, temperature: 0 }
  )

  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    const m = text.match(/\{[\s\S]*\}/)
    if (!m) {
      console.error('[guidance] model did not return JSON')
      process.exit(1)
    }
    parsed = JSON.parse(m[0])
  }

  // Quality gate, inverted from the criteria extractor. There the risk is
  // wording that ISN'T in the source; here it is wording that adds nothing —
  // guidance which merely echoes the descriptor costs the marker context window
  // and buys no discrimination at all.
  let bands = 0
  let empty = 0
  const thin = []
  for (const c of parsed.criteria ?? []) {
    for (const b of c.bands ?? []) {
      bands++
      const g = (b.guidance ?? '').trim()
      if (!g) {
        empty++
        continue
      }
      if (g.split(/\s+/).length < 8) {
        thin.push(`${c.letter} ${b.marks_min}-${b.marks_max}: "${g}"`)
      }
    }
  }

  const report = {
    subjectCode,
    componentKey,
    source: path.basename(pdfPath),
    pagesUsed: [pages[0]?.page, pages[pages.length - 1]?.page],
    extractedAt: new Date().toISOString(),
    bandsFound: bands,
    bandsWithoutGuidance: empty,
    thin,
    ...parsed,
  }
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2))
  console.error(
    `[guidance] wrote ${outPath} — ${bands} band(s), ${empty} left null, ${thin.length} thin`
  )
  if (thin.length) {
    console.error('[guidance] REVIEW THESE — too short to be operational:')
    for (const t of thin.slice(0, 8)) console.error('  -', t)
  }
}

main().catch((e) => {
  console.error('[guidance] failed:', e?.message ?? e)
  process.exit(1)
})
