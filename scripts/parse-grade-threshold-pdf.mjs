#!/usr/bin/env node
/**
 * Turn an official Cambridge grade-threshold PDF into a session JSON.
 *
 *   node scripts/parse-grade-threshold-pdf.mjs --file path/to/table.pdf --code 2059
 *   node scripts/parse-grade-threshold-pdf.mjs --url https://www.cambridgeinternational.org/Images/....pdf --code 2059
 *   ... --out /tmp/2059-june-2026.json      # then feed to ingest-grade-threshold-session.mjs
 *
 * Exists because the slow, error-prone step on results day is transcription, not
 * ingestion. Reading two numbers off a PDF by hand is fine; reading thirty-two
 * across nine syllabuses while people are refreshing the site is how a boundary
 * ends up one row out. A search summary of the 2059 table already did exactly
 * that — it transposed the two component rows, giving Paper 1 the Paper 2
 * boundaries — which is why nothing here trusts anything but the PDF.
 *
 * The table is regular across every syllabus and session Cambridge publishes:
 *
 *   Component 01 75 44 36 29 23 18
 *   ^ code       ^max ^A ^B ^C ^D ^E
 *
 * So the component rows are extracted structurally, and the session and syllabus
 * are read from the document's own heading rather than supplied — if the PDF
 * disagrees with --code, that is a wrong file and the script says so instead of
 * writing it.
 */
import fs from 'node:fs'
import path from 'node:path'

function arg(name) {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}
const has = (name) => process.argv.includes(`--${name}`)

async function pdfText(buffer) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer), useSystemFonts: true }).promise
  const pages = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const tc = await page.getTextContent()
    pages.push(tc.items.map((x) => x.str).join(' '))
  }
  // Cambridge splits words oddly ("taken f or Syllabus"), so collapse whitespace
  // and let the patterns below tolerate it rather than matching exact prose.
  return pages.join('\n').replace(/\s+/g, ' ')
}

/** Component rows. Six numbers after the code: max, then A B C D E. */
function parseComponents(text) {
  const out = []
  const rx = /Component\s+(\d{2})\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/g
  let m
  while ((m = rx.exec(text))) {
    const [, component, max, A, B, C, D, E] = m
    out.push({
      component,
      paper: `Paper ${component[0] === '0' ? Number(component[1]) : component[0]}`,
      max: Number(max),
      thresholds: { A: Number(A), B: Number(B), C: Number(C), D: Number(D), E: Number(E) },
    })
  }
  return out
}

function parseHeading(text) {
  const session = text.match(/Grade thresholds\s*[–-]\s*(\w+\s+\d{4})/i)?.[1] ?? null
  const syllabus = text.match(/Syllabus\s+(\d{4})/i)?.[1] ?? null
  // IGCSE headings read "Cambridge IGCSE ™ Mathematics (without Coursework)
  // (0580)" — spaced trademark, and a name that itself contains brackets. The
  // first version stopped at the first bracket and returned nothing, which was
  // only cosmetic (the syllabus guard reads "Syllabus 0580" separately and did
  // fire) but made the output say which file it had read for O Level and stay
  // silent for IGCSE, exactly where a reader wants confirmation.
  const subject =
    text.match(/Cambridge\s+(?:International\s+)?(?:O Level|IGCSE\s*™?|AS & A Level)\s+(.+?)\s*\((\d{4})\)/)?.[1]?.trim() ?? null
  return { session, syllabus, subject }
}

async function load() {
  const file = arg('file')
  if (file) return fs.readFileSync(file)
  const url = arg('url')
  if (!url) throw new Error('pass --file <path> or --url <pdf url>')
  const res = await fetch(url)
  if (!res.ok) throw new Error(`fetch failed: ${res.status} ${url}`)
  return Buffer.from(await res.arrayBuffer())
}

async function main() {
  const code = arg('code')
  if (!code) throw new Error('pass --code <syllabus code>')

  const buf = await load()
  const text = await pdfText(buf)
  const head = parseHeading(text)

  // A wrong file is the failure that looks like success: it parses cleanly and
  // writes somebody else's boundaries under your syllabus code.
  if (head.syllabus && head.syllabus !== code) {
    throw new Error(`PDF is syllabus ${head.syllabus}, not ${code} — wrong file`)
  }
  const components = parseComponents(text)
  if (components.length === 0) {
    throw new Error('no component rows found — the table layout may have changed; check by hand')
  }

  const session = {
    session: head.session ?? arg('session') ?? null,
    sourceUrl: arg('url') ?? arg('file'),
    components,
  }
  if (!session.session) throw new Error('could not read the session from the PDF; pass --session "June 2026"')

  console.log(`${code} ${head.subject ?? ''} — ${session.session}`)
  for (const c of components) {
    const t = c.thresholds
    console.log(`  ${c.component}  max ${String(c.max).padStart(3)}   A ${t.A}  B ${t.B}  C ${t.C}  D ${t.D}  E ${t.E}`)
  }

  const out = arg('out')
  if (!out) {
    console.log('\nNo --out given, nothing written.')
    return
  }
  fs.mkdirSync(path.dirname(out), { recursive: true })
  fs.writeFileSync(out, JSON.stringify(session, null, 2) + '\n')
  console.log(`\nwrote ${out}`)
  console.log(`next: node scripts/ingest-grade-threshold-session.mjs --code ${code} --file ${out}`)
  if (has('verify')) console.log('(paper labels are inferred from the component code — check them)')
}

main().catch((err) => {
  console.error(String(err.message ?? err))
  process.exitCode = 1
})
