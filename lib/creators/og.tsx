import { ImageResponse } from 'next/og'
import { faviconDataUrl } from '@/lib/brand/logo-mark'
import { SITE_HOST, SITE_NAME } from '@/lib/site-config'

export const CREATOR_OG_SIZE = { width: 1200, height: 630 }

/**
 * Share preview for a creator's space — the same hard-paper slip as the rest
 * of the site, with the code as the object on it. A creator posts this link
 * in a bio; the card has to read at thumbnail size, so: name, code, one number.
 */
export function createCreatorOgImage(opts: {
  handle: string
  displayName: string
  code: string
  giftMarks: number
  marked: number
}) {
  const gift = opts.giftMarks > 0 ? `+${opts.giftMarks} free marks` : 'free marking'
  const nameSize = opts.displayName.length > 18 ? 54 : 66
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f3f1ea',
          fontFamily: 'Georgia, "Times New Roman", serif',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            opacity: 0.35,
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent, transparent 27px, #e3dac6 27px, #e3dac6 28px)',
          }}
        />

        <div
          style={{
            position: 'relative',
            display: 'flex',
            width: 1040,
            height: 510,
            padding: '44px 52px',
            background: '#fffdf7',
            border: '2px solid #e3dac6',
            borderRadius: 4,
            boxShadow: '12px 12px 0 rgba(37, 34, 27, 0.12)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 5,
              display: 'flex',
              background: 'linear-gradient(90deg, #19774d 0%, #19774d 60%, #bb2a25 60%, #bb2a25 100%)',
            }}
          />

          {/* Left: who */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              flex: 1,
              paddingRight: 36,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={faviconDataUrl()} width={40} height={40} alt="" />
              <span
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: '#25221b',
                  letterSpacing: '-0.02em',
                }}
              >
                {SITE_NAME}
              </span>
              <span
                style={{
                  marginLeft: 8,
                  padding: '4px 10px',
                  border: '1.5px solid rgba(25,119,77,0.45)',
                  background: 'rgba(25,119,77,0.08)',
                  color: '#19774d',
                  fontFamily: 'ui-monospace, Menlo, monospace',
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  borderRadius: 3,
                }}
              >
                Creator
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span
                style={{
                  fontFamily: 'ui-monospace, Menlo, monospace',
                  fontSize: 16,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: '#8d8470',
                }}
              >
                Study with
              </span>
              <span
                style={{
                  fontSize: nameSize,
                  fontWeight: 500,
                  color: '#25221b',
                  lineHeight: 1.05,
                  letterSpacing: '-0.03em',
                }}
              >
                {opts.displayName}
              </span>
              <span
                style={{
                  fontFamily: 'ui-monospace, Menlo, monospace',
                  fontSize: 22,
                  color: '#5c6470',
                }}
              >
                @{opts.handle}
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 10,
                paddingTop: 16,
                borderTop: '1px dashed #e3dac6',
                fontFamily: 'ui-sans-serif, system-ui, sans-serif',
              }}
            >
              <span style={{ fontSize: 40, fontWeight: 700, color: '#19774d' }}>
                {opts.marked.toLocaleString('en-GB')}
              </span>
              <span style={{ fontSize: 20, color: '#5c6470' }}>
                answers marked with @{opts.handle}
              </span>
            </div>
          </div>

          {/* Right: the ticket */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              width: 330,
              padding: '26px 28px',
              background: '#f7f4ec',
              border: '2px solid #cfc6b2',
              borderRadius: 6,
              boxShadow: '8px 8px 0 rgba(25,119,77,0.14)',
            }}
          >
            <span
              style={{
                fontFamily: 'ui-monospace, Menlo, monospace',
                fontSize: 14,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: '#8d8470',
              }}
            >
              Creator code
            </span>
            <span
              style={{
                marginTop: 10,
                fontFamily: 'ui-monospace, Menlo, monospace',
                fontSize: opts.code.length > 7 ? 46 : 60,
                fontWeight: 800,
                letterSpacing: '0.1em',
                color: '#25221b',
              }}
            >
              {opts.code}
            </span>
            <span
              style={{
                marginTop: 12,
                fontSize: 24,
                fontWeight: 700,
                color: '#19774d',
                fontFamily: 'ui-sans-serif, system-ui, sans-serif',
              }}
            >
              {gift}
            </span>
            <span
              style={{
                marginTop: 18,
                paddingTop: 14,
                borderTop: '2px dashed #cfc6b2',
                fontFamily: 'ui-monospace, Menlo, monospace',
                fontSize: 15,
                color: '#8d8470',
              }}
            >
              {SITE_HOST}/with/{opts.handle}
            </span>
          </div>
        </div>
      </div>
    ),
    { ...CREATOR_OG_SIZE }
  )
}
