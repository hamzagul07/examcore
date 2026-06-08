/**
 * Mathpix PDF API client (Prompt C — feature-flagged off by default).
 * Enable with EXTRACTION_USE_MATHPIX=true. Docs: https://docs.mathpix.com/reference/post-v3-pdf
 */

const MATHPIX_BASE = 'https://api.mathpix.com/v3'

export function isMathpixEnabled() {
  return process.env.EXTRACTION_USE_MATHPIX === 'true'
}

export function getMathpixCredentials() {
  const appId = process.env.MATHPIX_APP_ID?.trim()
  const appKey = process.env.MATHPIX_APP_KEY?.trim()
  if (!appId || !appKey) {
    throw new Error(
      'MATHPIX_APP_ID and MATHPIX_APP_KEY must be set in .env.local (https://accounts.mathpix.com)'
    )
  }
  return { appId, appKey }
}

function mathpixHeaders(creds) {
  return {
    app_id: creds.appId,
    app_key: creds.appKey,
  }
}

/**
 * Submit a PDF buffer for async OCR. Returns { pdf_id }.
 */
export async function submitPdfBuffer(buffer, options = {}) {
  const creds = getMathpixCredentials()
  const form = new FormData()
  form.append(
    'file',
    new Blob([buffer], { type: 'application/pdf' }),
    options.filename || 'document.pdf'
  )
  form.append(
    'options_json',
    JSON.stringify({
      conversion_formats: { mmd: true },
      ...options.mathpixOptions,
    })
  )

  const res = await fetch(`${MATHPIX_BASE}/pdf`, {
    method: 'POST',
    headers: mathpixHeaders(creds),
    body: form,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Mathpix submit failed (${res.status}): ${text}`)
  }

  return res.json()
}

/** Poll until status is completed or failed. */
export async function waitForPdf(pdfId, { pollMs = 3000, timeoutMs = 600_000 } = {}) {
  const creds = getMathpixCredentials()
  const started = Date.now()

  while (Date.now() - started < timeoutMs) {
    const res = await fetch(`${MATHPIX_BASE}/pdf/${pdfId}`, {
      headers: mathpixHeaders(creds),
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Mathpix status failed (${res.status}): ${text}`)
    }
    const data = await res.json()
    if (data.status === 'completed') return data
    if (data.status === 'error' || data.status === 'failed') {
      throw new Error(`Mathpix processing failed: ${data.error || JSON.stringify(data)}`)
    }
    await new Promise((r) => setTimeout(r, pollMs))
  }

  throw new Error(`Mathpix timed out after ${timeoutMs}ms for pdf_id=${pdfId}`)
}

export async function downloadMmd(pdfId) {
  const creds = getMathpixCredentials()
  const res = await fetch(`${MATHPIX_BASE}/pdf/${pdfId}.mmd`, {
    headers: mathpixHeaders(creds),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Mathpix MMD download failed (${res.status}): ${text}`)
  }
  return res.text()
}

export async function downloadLinesJson(pdfId) {
  const creds = getMathpixCredentials()
  const res = await fetch(`${MATHPIX_BASE}/pdf/${pdfId}.lines.json`, {
    headers: mathpixHeaders(creds),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Mathpix lines.json failed (${res.status}): ${text}`)
  }
  return res.json()
}

/** Full pipeline: buffer → mmd + lines.json + status metadata. */
export async function processPdfBuffer(buffer, options = {}) {
  if (!isMathpixEnabled()) {
    throw new Error(
      'Mathpix is disabled (EXTRACTION_USE_MATHPIX=false). Use Gemini Pro via lib/extraction/pdf-parser.ts'
    )
  }
  const submitted = await submitPdfBuffer(buffer, options)
  const pdfId = submitted.pdf_id
  if (!pdfId) throw new Error(`Mathpix returned no pdf_id: ${JSON.stringify(submitted)}`)

  const status = await waitForPdf(pdfId, options)
  const [mmd, lines] = await Promise.all([
    downloadMmd(pdfId),
    downloadLinesJson(pdfId).catch(() => null),
  ])

  return {
    pdf_id: pdfId,
    status,
    mmd,
    lines,
    num_pages: status.num_pages ?? status.num_pages_completed ?? null,
  }
}
