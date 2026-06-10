import { INTERACTIVE_EMBED_CATALOG } from './interactive-embeds'

async function main() {
  let failed = 0

  async function checkUrl(url: string): Promise<number | string> {
    try {
      const res = await fetch(url, { method: 'GET', redirect: 'follow' })
      return res.status
    } catch {
      return 'ERR'
    }
  }

  for (const [slug, entry] of Object.entries(INTERACTIVE_EMBED_CATALOG)) {
    const status = await checkUrl(entry.embedUrl)
    if (status !== 200) {
      failed++
      console.error(`FAIL ${slug} embed ${status}: ${entry.embedUrl}`)
    }
    if (entry.launchUrl) {
      const launchStatus = await checkUrl(entry.launchUrl)
      if (launchStatus !== 200) {
        failed++
        console.error(`FAIL ${slug} launch ${launchStatus}: ${entry.launchUrl}`)
      }
    }
  }

  if (failed > 0) process.exit(1)
  console.log(
    `interactive-embed-urls.test.ts: ${Object.keys(INTERACTIVE_EMBED_CATALOG).length} embeds OK`
  )
}

main()
