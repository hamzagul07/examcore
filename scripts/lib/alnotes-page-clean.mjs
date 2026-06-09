/**
 * Clean A-Level Notes PDF page renders: remove footer branding and light watermarks.
 */
import { createCanvas } from '@napi-rs/canvas'

function pixelAvg(data, i) {
  return (data[i] + data[i + 1] + data[i + 2]) / 3
}

function neighborhoodAvg(data, width, height, x, y, radius = 3) {
  let sum = 0
  let count = 0
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const nx = x + dx
      const ny = y + dy
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
      sum += pixelAvg(data, (ny * width + nx) * 4)
      count++
    }
  }
  return count ? sum / count : 255
}

/** Whiten footer band, yellow branding, and faint gray watermark / URL text. */
export function cleanAlnotesPage(canvas) {
  const ctx = canvas.getContext('2d')
  const { width, height } = canvas
  const image = ctx.getImageData(0, 0, width, height)
  const { data } = image

  const footerStart = Math.floor(height * 0.94)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const avg = (r + g + b) / 3
      const spread = Math.max(r, g, b) - Math.min(r, g, b)
      const nAvg = neighborhoodAvg(data, width, height, x, y, 4)

      const isFooter = y >= footerStart
      const isYellowBrand =
        (r > 130 && g > 110 && b < 165 && r > b + 15 && avg > 125) ||
        (r > 200 && g > 175 && b < 210 && r - b > 15)
      const isFaintOnWhite =
        nAvg > 228 && avg >= 150 && avg <= 250 && spread <= 38
      const isPaleLink =
        avg >= 165 &&
        avg <= 250 &&
        spread <= 42 &&
        nAvg > 220 &&
        (b >= r - 5 || g >= r - 5)

      if (isFooter || isYellowBrand || isFaintOnWhite || isPaleLink) {
        data[i] = 255
        data[i + 1] = 255
        data[i + 2] = 255
        data[i + 3] = 255
      }
    }
  }

  ctx.putImageData(image, 0, 0)

  const cropBottom = Math.min(Math.floor(height * 0.06), 140)
  const cropTop = Math.floor(height * 0.012)
  const outH = height - cropBottom - cropTop
  if (outH <= 0) return canvas

  const cleaned = createCanvas(width, outH)
  cleaned.getContext('2d').fillStyle = '#ffffff'
  cleaned.getContext('2d').fillRect(0, 0, width, outH)
  cleaned.getContext('2d').drawImage(canvas, 0, cropTop, width, outH, 0, 0, width, outH)
  return cleaned
}
