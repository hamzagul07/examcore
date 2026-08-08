import { INDEXNOW_PRIORITY_URLS } from '@/lib/seo/llms-geo-qa'
import { SITE_URL } from '@/lib/site-config'

/**
 * Notify IndexNow of URL changes. Best-effort — never throws to callers.
 * Uses INDEXNOW_KEY from env; no-ops when unset.
 */
export async function pingIndexNow(paths: string[]): Promise<{ ok: boolean; count: number }> {
  const key = process.env.INDEXNOW_KEY?.trim()
  if (!key || paths.length === 0) return { ok: false, count: 0 }

  const host = SITE_URL.replace(/^https?:\/\//, '').replace(/\/$/, '') || 'markscheme.app'
  const base = `https://${host}`
  const urlList = [...new Set(paths)]
    .map((p) => (p.startsWith('http') ? p : `${base}${p.startsWith('/') ? p : `/${p}`}`))
    .slice(0, 10000)

  try {
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host,
        key,
        keyLocation: `${base}/${key}.txt`,
        urlList,
      }),
    })
    if (!res.ok) {
      console.error('[indexnow]', res.status, await res.text())
      return { ok: false, count: 0 }
    }
    return { ok: true, count: urlList.length }
  } catch (err) {
    console.error('[indexnow]', err)
    return { ok: false, count: 0 }
  }
}

export async function pingIndexNowPriority(): Promise<{ ok: boolean; count: number }> {
  return pingIndexNow([...INDEXNOW_PRIORITY_URLS])
}
