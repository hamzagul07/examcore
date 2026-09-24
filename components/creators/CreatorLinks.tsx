import type { CreatorLinks as Links } from '@/lib/creators/service'

const NETWORKS: { key: keyof Links; glyph: string; label: string; base: (h: string) => string }[] = [
  { key: 'tiktok', glyph: 'TT', label: 'TikTok', base: (h) => `https://www.tiktok.com/@${h}` },
  { key: 'instagram', glyph: 'IG', label: 'Instagram', base: (h) => `https://www.instagram.com/${h}` },
  { key: 'youtube', glyph: 'YT', label: 'YouTube', base: (h) => `https://www.youtube.com/@${h}` },
]

function hrefFor(raw: string, base: (h: string) => string): string {
  if (/^https?:\/\//i.test(raw)) return raw
  return base(raw.replace(/^@/, ''))
}

/** The creator's own channels — the thing this program exists to grow. */
export function CreatorLinks({ links }: { links: Links }) {
  const items = NETWORKS.filter((n) => links[n.key])
  if (!items.length) return null
  return (
    <div className="ms-cr-links">
      {items.map((n) => {
        const raw = links[n.key] as string
        const handle = raw.replace(/^https?:\/\/[^/]+\//i, '').replace(/^@/, '')
        return (
          <a
            key={n.key}
            className="ms-cr-link"
            href={hrefFor(raw, n.base)}
            target="_blank"
            rel="noopener noreferrer nofollow"
          >
            <span className="ms-cr-link__glyph" aria-hidden>
              {n.glyph}
            </span>
            <span>
              <span className="sr-only">{n.label} </span>@{handle}
            </span>
          </a>
        )
      })}
    </div>
  )
}
