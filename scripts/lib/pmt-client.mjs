/**
 * Shared PMT (Physics & Maths Tutor) CAIE fetch helpers.
 * School ingestion: download PDFs → private folder → Gemini outlines → original lessons.
 */

export const PMT_CAIE_INDEX = {
  '9702': 'https://www.physicsandmathstutor.com/physics-revision/a-level-caie/',
}

/** Fallback slugs when the index HTML omits topics. */
export const PMT_CAIE_SLUGS_9702 = {
  1: 'physical-quantities-and-units',
  2: 'kinematics',
  3: 'dynamics',
  4: 'forces-density-pressure',
  5: 'work-energy-power',
  6: 'deformation-of-solids',
  7: 'waves',
  8: 'superposition',
  9: 'electricity',
  10: 'dc-circuits',
  11: 'particle-physics',
  12: 'motion-in-a-circle',
  13: 'gravitational-fields',
  14: 'temperature',
  15: 'ideal-gases',
  16: 'thermodynamics',
  17: 'oscillations',
  18: 'electric-fields',
  19: 'capacitance',
  20: 'magnetic-fields',
  21: 'alternating-currents',
  22: 'quantum-physics',
  23: 'nuclear-physics',
  24: 'medical-physics',
  25: 'astronomy-and-cosmology',
}

export const USER_AGENT =
  'MarkScheme-SchoolIngest/1.0 (+https://markscheme.app; licensed-school-use)'

export function decodeHtml(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&#038;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
}

export function resolvePmtUrl(href, baseUrl) {
  const clean = decodeHtml(href).trim()
  if (clean.startsWith('http://') || clean.startsWith('https://')) return clean
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  return new URL(clean.replace(/^\//, ''), base).href
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function fetchWithRetry(url, init, { attempts = 4, label = 'fetch' } = {}) {
  let lastErr
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(url, init)
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
      return res
    } catch (err) {
      lastErr = err
      if (i < attempts) {
        const wait = 800 * 2 ** (i - 1)
        console.warn(`    ${label} retry ${i}/${attempts - 1} in ${wait}ms (${err.message})`)
        await sleep(wait)
      }
    }
  }
  throw lastErr
}

export async function fetchHtml(url) {
  const res = await fetchWithRetry(
    url,
    { headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' } },
    { label: 'page' }
  )
  return res.text()
}

export async function fetchBuffer(url) {
  const res = await fetchWithRetry(url, { headers: { 'User-Agent': USER_AGENT } }, { label: 'pdf' })
  return Buffer.from(await res.arrayBuffer())
}

export function extractTopicPagesFromIndex(html, baseUrl) {
  const topics = []
  const re =
    /<a href="([^"]+)"[^>]*>\s*Topic\s*(\d+)\s*<br\s*\/?>\s*<strong>([^<]*)<\/strong>\s*<\/a>/gi
  let m
  while ((m = re.exec(html))) {
    const href = decodeHtml(m[1])
    const url = resolvePmtUrl(href, baseUrl).replace(/\/$/, '') + '/'
    const num = m[2]
    const name = decodeHtml(m[3]).trim()
    if (!topics.some((t) => t.parentCode === num)) {
      topics.push({ parentCode: num, label: `Topic ${num} ${name}`, url })
    }
  }
  return topics
}

export function extractPdfLinks(html) {
  const links = []
  const re =
    /<a[^>]+href="(https:\/\/pmt\.physicsandmathstutor\.com\/download\/[^"]+\.pdf)"[^>]*>([^<]*)<\/a>/gi
  let m
  while ((m = re.exec(html))) {
    const href = decodeHtml(m[1]).replace(/ /g, '%20')
    const label = decodeHtml(m[2]).trim() || 'PMT PDF'
    if (!links.some((l) => l.href === href)) {
      links.push({ label, href })
    }
  }
  return links
}

export function buildTopicCatalog(subjectCode, indexUrl, indexHtml) {
  const fromIndex = extractTopicPagesFromIndex(indexHtml, indexUrl)
  const byCode = Object.fromEntries(fromIndex.map((t) => [t.parentCode, t]))

  const slugs = subjectCode === '9702' ? PMT_CAIE_SLUGS_9702 : {}
  for (const [code, slug] of Object.entries(slugs)) {
    if (!byCode[code]) {
      const base = indexUrl.endsWith('/') ? indexUrl : `${indexUrl}/`
      byCode[code] = {
        parentCode: code,
        label: `Topic ${code}`,
        url: `${base}${slug}/`,
      }
    }
  }

  return Object.values(byCode).sort(
    (a, b) => parseInt(a.parentCode, 10) - parseInt(b.parentCode, 10)
  )
}
