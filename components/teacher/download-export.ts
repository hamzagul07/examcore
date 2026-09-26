/**
 * Download a teacher CSV export (`T/export`) through fetch rather than a bare
 * `<a download>`: a refused export (an archived class, a missing set, a failed
 * read) comes back as JSON with a reason, which a download link would save as
 * a ".csv" or show as the browser's "Failed — server problem"; and a link
 * cannot read `X-Export-Truncated`, the route's way of saying the file hit its
 * row ceiling. Shared by the class settings page and the set page.
 *
 * Browser-only (it creates an object URL and clicks a temporary link); call
 * it from a client component's event handler.
 */

export type ExportDownloadResult = { ok: true; truncated: boolean } | { ok: false; error: string }

/** `attachment; filename="12B-sets.csv"` → `12B-sets.csv`, else the fallback. */
export function exportFilename(disposition: string | null, fallback: string): string {
  const match = disposition ? /filename="([^"]+)"/.exec(disposition) : null
  return match?.[1] ?? fallback
}

export async function downloadExport(url: string, fallbackName: string): Promise<ExportDownloadResult> {
  let res: Response
  try {
    res = await fetch(url, { cache: 'no-store' })
  } catch {
    return { ok: false, error: 'Could not reach the server. Check your connection and try again.' }
  }
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string }
    return { ok: false, error: data.error || 'Could not build the export. Try again.' }
  }
  let blob: Blob
  try {
    blob = await res.blob()
  } catch {
    return { ok: false, error: 'The download was interrupted. Try again.' }
  }
  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = exportFilename(res.headers.get('Content-Disposition'), fallbackName)
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
  return { ok: true, truncated: Boolean(res.headers.get('X-Export-Truncated')) }
}
