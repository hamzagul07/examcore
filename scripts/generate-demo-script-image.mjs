/**
 * Generate the demo handwritten script used by the examiner-ink showcase.
 *
 * Kept as a script rather than a one-off so the image and the bounding boxes in
 * lib/marking/demo-ink.ts stay derivable from the same numbers. If you change
 * the layout constants here, update those percentages to match — they are
 * computed from LINE_Y / FONT_SIZE / canvas size below.
 *
 * Run: node scripts/generate-demo-script-image.mjs
 */
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

export const W = 1100
export const H = 880
export const FONT_SIZE = 34
export const FIRST_BASELINE = 96
export const LINE_STEP = 52
export const TEXT_X = 132

// Mirrors DEMO_MARK_RESULT.ocr_text, in order.
const LINES = [
  'dy/dx = 3x^2 - 12x + 9',
  '3x^2 - 12x + 9 = 0',
  'x^2 - 4x + 3 = 0',
  '(x - 1)(x - 3) = 0',
  'x = 1  or  x = 3',
  'when x = 1,  y = 1 - 6 + 9 + 1 = 5',
  'when x = 3,  y = 27 - 54 + 27 + 1 = 1',
  'stationary points: (1, 5) and (3, 1)',
  '(1, 5) is a maximum, (3, 1) is a minimum',
]

const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;')

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="100%" height="100%" fill="#fcfbf7"/>
  ${Array.from(
    { length: 15 },
    (_, i) =>
      `<line x1="60" y1="${FIRST_BASELINE + 10 + i * LINE_STEP}" x2="${W - 60}" y2="${
        FIRST_BASELINE + 10 + i * LINE_STEP
      }" stroke="#e2e8f0" stroke-width="1.4"/>`
  ).join('')}
  <line x1="104" y1="0" x2="104" y2="${H}" stroke="#f2cfcf" stroke-width="2"/>
  ${LINES.map((t, i) => {
    const y = FIRST_BASELINE + i * LINE_STEP
    const tilt = (i % 3) - 1
    return `<text x="${TEXT_X}" y="${y}" transform="rotate(${tilt * 0.32} ${TEXT_X} ${y})" font-family="'Snell Roundhand','Bradley Hand',cursive" font-size="${FONT_SIZE}" fill="#1c2f57">${esc(
      t
    )}</text>`
  }).join('')}
</svg>`

const out = path.join(process.cwd(), 'public/demo/handwritten-script.webp')
await mkdir(path.dirname(out), { recursive: true })
await sharp(Buffer.from(svg)).webp({ quality: 88 }).toFile(out)
console.log('wrote', out)

// Print the bbox percentages for each line so demo-ink.ts can be checked.
for (const [i, t] of LINES.entries()) {
  const baseline = FIRST_BASELINE + i * LINE_STEP
  const top = ((baseline - FONT_SIZE * 0.78) / H) * 100
  const height = ((FONT_SIZE * 1.02) / H) * 100
  const width = ((t.length * FONT_SIZE * 0.46) / W) * 100
  console.log(
    `line ${i + 1}: top=${top.toFixed(2)} left=${((TEXT_X / W) * 100).toFixed(
      2
    )} width=${width.toFixed(2)} height=${height.toFixed(2)}  "${t}"`
  )
}
