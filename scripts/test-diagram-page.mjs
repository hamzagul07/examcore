import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

function loadEnv() {
  const p = join(ROOT, '.env.local')
  if (!existsSync(p)) return
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq === -1) continue
    const k = t.slice(0, eq).trim()
    const v = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
    if (!process.env[k]) process.env[k] = v
  }
}
loadEnv()

const page = parseInt(process.argv[2] || '10', 10)
const pdfPath = process.argv[3] || 'cambridge/9702/s24/qp_42.pdf'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const { data, error } = await sb.storage.from('paper-pdfs').download(pdfPath)
if (error || !data) throw new Error(error?.message || 'download failed')

const bytes = (await data.arrayBuffer()).slice(0)
const { extractDiagramsFromPage } = await import('../lib/extraction/diagram-extractor.ts')

const t0 = Date.now()
const diagrams = await extractDiagramsFromPage(bytes, page)
console.log(`Page ${page}: ${diagrams.length} diagrams in ${Math.round((Date.now() - t0) / 1000)}s`)
for (const d of diagrams.slice(0, 3)) {
  console.log('-', d.label, `bbox=${JSON.stringify(d.bounding_box)}`)
  console.log('  alt:', d.ai_description?.slice(0, 200))
}
