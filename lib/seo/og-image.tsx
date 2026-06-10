import { ImageResponse } from 'next/og'
import { logoMarkDataUrl } from '@/lib/brand/logo-mark'
import { SITE_NAME } from '@/lib/site-config'

export const OG_SIZE = { width: 1200, height: 630 }

type OgImageProps = {
  title: string
  subtitle?: string
}

export function createOgImage({ title, subtitle }: OgImageProps) {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 72,
          background: '#f7f2e7',
          fontFamily: 'Georgia, serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoMarkDataUrl()} width={52} height={52} alt="" />
          <span
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: '#211c17',
              letterSpacing: '-0.02em',
            }}
          >
            {SITE_NAME}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              fontSize: 56,
              fontWeight: 400,
              color: '#211c17',
              lineHeight: 1.1,
              letterSpacing: '-0.03em',
              maxWidth: 900,
            }}
          >
            {title}
          </div>
          {subtitle ? (
            <div
              style={{
                fontSize: 26,
                color: '#4a4239',
                lineHeight: 1.4,
                maxWidth: 800,
                fontFamily: 'system-ui, sans-serif',
              }}
            >
              {subtitle}
            </div>
          ) : null}
        </div>

        <div
          style={{
            fontSize: 16,
            color: '#8f1f1c',
            fontFamily: 'ui-monospace, monospace',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
          }}
        >
          Cambridge past papers · markscheme.app
        </div>
      </div>
    ),
    { ...OG_SIZE }
  )
}
