import fs from 'fs'
import path from 'path'
import { createCanvas } from '@napi-rs/canvas'

const pdfPath = path.join('content/source-notes/9702/_senpai-import/chapter-4-forces.pdf')
const outDir = path.join('tmp/senpai-ch4-pages')
fs.mkdirSync(outDir, { recursive: true })

const worker = await import('pdfjs-dist/legacy/build/pdf.worker.mjs')
globalThis.pdfjsWorker = worker
const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
pdfjs.GlobalWorkerOptions.workerSrc = 'pdfjs-dist/legacy/build/pdf.worker.mjs'

const data = new Uint8Array(fs.readFileSync(pdfPath))
const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise
console.log('pages', doc.numPages)

for (let p = 1; p <= doc.numPages; p++) {
  const page = await doc.getPage(p)
  const textContent = await page.getTextContent()
  const text = textContent.items.map((i) => i.str).join(' ')
  const snippet = text.slice(0, 200).replace(/\s+/g, ' ')
  console.log(`--- page ${p} ---`)
  console.log(snippet)
  if (/equilibrium|moment|couple|triangle of force/i.test(text)) {
    console.log('>>> MATCH equilibrium topic')
    const viewport = page.getViewport({ scale: 2 })
    const canvas = createCanvas(viewport.width, viewport.height)
    const ctx = canvas.getContext('2d')
    await page.render({ canvas, canvasContext: ctx, viewport }).promise
    const pngPath = path.join(outDir, `page-${String(p).padStart(2, '0')}.png`)
    fs.writeFileSync(pngPath, canvas.toBuffer('image/png'))
    console.log('saved', pngPath)
  }
}
