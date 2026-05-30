import { ImageResponse } from 'next/og'
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
          background: 'linear-gradient(135deg, #0a0f1a 0%, #0d1f17 50%, #120a1f 100%)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #10b981, #06b6d4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              fontWeight: 800,
              color: 'white',
            }}
          >
            E
          </div>
          <span
            style={{
              fontSize: 28,
              fontWeight: 800,
              background: 'linear-gradient(90deg, #34d399, #22d3ee)',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            {SITE_NAME}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              fontSize: 56,
              fontWeight: 800,
              color: '#f8fafc',
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
                color: '#94a3b8',
                lineHeight: 1.4,
                maxWidth: 800,
              }}
            >
              {subtitle}
            </div>
          ) : null}
        </div>

        <div
          style={{
            fontSize: 18,
            color: '#64748b',
            fontFamily: 'monospace',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          Cambridge A-Level marking · Early access
        </div>
      </div>
    ),
    { ...OG_SIZE }
  )
}
