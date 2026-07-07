#!/usr/bin/env node
/**
 * Ping IndexNow after GEO deploys. Requires INDEXNOW_KEY env and key file at public/{key}.txt
 * Usage: INDEXNOW_KEY=abc123 SITE_HOST=markscheme.app pnpm seo:indexnow
 */
import { INDEXNOW_PRIORITY_URLS } from '../lib/seo/llms-geo-qa.ts'

const key = process.env.INDEXNOW_KEY?.trim()
const host = (process.env.SITE_HOST || 'markscheme.app').replace(/^https?:\/\//, '')
const base = `https://${host}`

if (!key) {
  console.log('INDEXNOW_KEY not set — skip (see docs/GEO_SYNC_CHECKLIST.md)')
  process.exit(0)
}

const urlList = INDEXNOW_PRIORITY_URLS.map((p) => `${base}${p}`)
const body = {
  host,
  key,
  keyLocation: `${base}/${key}.txt`,
  urlList,
}

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify(body),
})

if (!res.ok) {
  console.error(`IndexNow failed: ${res.status} ${await res.text()}`)
  process.exit(1)
}

console.log(`IndexNow OK — ${urlList.length} URLs submitted for ${host}`)
