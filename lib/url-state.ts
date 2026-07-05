/**
 * Lightweight URL query-param sync for client-side tools (calculators,
 * countdowns). Uses history.replaceState so typing never triggers a
 * navigation or server roundtrip — the URL simply stays shareable.
 */

export function readUrlParams(): URLSearchParams {
  return new URLSearchParams(window.location.search)
}

/** Set (or, with null/'', remove) query params in place. */
export function writeUrlParams(entries: Record<string, string | null>): void {
  const url = new URL(window.location.href)
  for (const [key, value] of Object.entries(entries)) {
    if (value === null || value === '') url.searchParams.delete(key)
    else url.searchParams.set(key, value)
  }
  window.history.replaceState(window.history.state, '', url)
}
