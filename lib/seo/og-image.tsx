import { ImageResponse } from 'next/og'
import { faviconDataUrl } from '@/lib/brand/logo-mark'
import { SITE_NAME } from '@/lib/site-config'

export const OG_SIZE = { width: 1200, height: 630 }

type OgImageProps = {
  title: string
  subtitle?: string
}

/**
 * Share preview — a hard-paper exam slip, not a generic SaaS gradient card.
 * Dual ink: examiner green (award) + crimson (correction stamp).
 */
export function createOgImage({ title, subtitle }: OgImageProps) {
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
        {/* Canvas texture hint — soft ruled wash behind the slip */}
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
            flexDirection: 'column',
            justifyContent: 'space-between',
            width: 1040,
            height: 510,
            padding: '48px 52px',
            background: '#fffdf7',
            border: '2px solid #e3dac6',
            borderRadius: 4,
            boxShadow: '12px 12px 0 rgba(37, 34, 27, 0.12)',
          }}
        >
          {/* Top rule */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 4,
              background: '#19774d',
              display: 'flex',
            }}
          />

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={faviconDataUrl()} width={44} height={44} alt="" />
              <span
                style={{
                  fontSize: 26,
                  fontWeight: 700,
                  color: '#25221b',
                  letterSpacing: '-0.02em',
                }}
              >
                {SITE_NAME}
              </span>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <Stamp label="M1" color="#19774d" border="rgba(30,138,94,0.45)" bg="rgba(25,119,77,0.08)" />
              <Stamp label="A0" color="#bb2a25" border="rgba(187,42,37,0.4)" bg="rgba(187,42,37,0.08)" />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 8 }}>
            <div
              style={{
                fontSize: title.length > 48 ? 48 : 54,
                fontWeight: 500,
                color: '#25221b',
                lineHeight: 1.12,
                letterSpacing: '-0.03em',
                maxWidth: 900,
              }}
            >
              {title}
            </div>
            {subtitle ? (
              <div
                style={{
                  fontSize: 24,
                  color: '#5c6470',
                  lineHeight: 1.4,
                  maxWidth: 820,
                  fontFamily: 'ui-sans-serif, system-ui, sans-serif',
                }}
              >
                {subtitle}
              </div>
            ) : null}
          </div>

          {/* Mini mark lines — the brand object */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              marginTop: 10,
              paddingTop: 16,
              borderTop: '1px dashed #e3dac6',
            }}
          >
            <MarkRow work="dy/dx = 3x^2 - 12x + 9" mark="M1" ok />
            <MarkRow work="x = 1, x = 3" mark="A1" ok />
            <MarkRow work="min at x = 1" mark="A0" ok={false} note="check d2y/dx2" />
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 12,
              fontFamily: 'ui-monospace, Menlo, monospace',
              fontSize: 15,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            <span style={{ color: '#19774d', fontWeight: 700 }}>Examiner{"'"}s Ink</span>
            <span style={{ color: '#8d8470' }}>markscheme.app</span>
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE },
  )
}

/** Challenge share preview — big score on the same hard-paper slip. */
export function createChallengeOgImage({
  title,
  score,
  total,
  quizTitle,
}: {
  title: string
  score: number
  total: number
  quizTitle: string
}) {
  const pct = total > 0 ? Math.round((score / total) * 100) : 0
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
            flexDirection: 'column',
            justifyContent: 'space-between',
            width: 1040,
            height: 510,
            padding: '48px 52px',
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
              height: 4,
              background: '#19774d',
              display: 'flex',
            }}
          />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={faviconDataUrl()} width={44} height={44} alt="" />
              <span
                style={{
                  fontSize: 26,
                  fontWeight: 700,
                  color: '#25221b',
                  letterSpacing: '-0.02em',
                }}
              >
                {SITE_NAME}
              </span>
            </div>
            <Stamp
              label="VS"
              color="#19774d"
              border="rgba(30,138,94,0.45)"
              bg="rgba(25,119,77,0.08)"
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div
              style={{
                fontSize: 28,
                color: '#5c6470',
                fontFamily: 'ui-sans-serif, system-ui, sans-serif',
              }}
            >
              {title}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 16,
                fontFamily: 'ui-monospace, Menlo, monospace',
              }}
            >
              <span
                style={{
                  fontSize: 96,
                  fontWeight: 700,
                  color: '#19774d',
                  lineHeight: 1,
                  letterSpacing: '-0.04em',
                }}
              >
                {score}
              </span>
              <span style={{ fontSize: 40, color: '#5c6470' }}>/ {total}</span>
              <span
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: '#19774d',
                  marginLeft: 8,
                }}
              >
                {pct}%
              </span>
            </div>
            <div
              style={{
                fontSize: 26,
                color: '#25221b',
                maxWidth: 860,
                lineHeight: 1.3,
              }}
            >
              {quizTitle}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 8,
              paddingTop: 16,
              borderTop: '1px dashed #e3dac6',
              fontFamily: 'ui-monospace, Menlo, monospace',
              fontSize: 15,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            <span style={{ color: '#19774d', fontWeight: 700 }}>Can you beat it?</span>
            <span style={{ color: '#8d8470' }}>markscheme.app</span>
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE },
  )
}

function Stamp({
  label,
  color,
  border,
  bg,
}: {
  label: string
  color: string
  border: string
  bg: string
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '6px 12px',
        fontFamily: 'ui-monospace, Menlo, monospace',
        fontSize: 16,
        fontWeight: 700,
        letterSpacing: '0.06em',
        color,
        border: `2px solid ${border}`,
        background: bg,
      }}
    >
      {label}
    </div>
  )
}

function MarkRow({
  work,
  mark,
  ok,
  note,
}: {
  work: string
  mark: string
  ok: boolean
  note?: string
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        fontFamily: 'ui-monospace, Menlo, monospace',
        fontSize: 18,
      }}
    >
      <span style={{ color: '#25221b', flex: 1 }}>{work}</span>
      {note ? (
        <span
          style={{
            color: '#bb2a25',
            fontFamily: 'Georgia, serif',
            fontSize: 16,
            fontStyle: 'italic',
          }}
        >
          {note}
        </span>
      ) : null}
      <span
        style={{
          color: ok ? '#19774d' : '#bb2a25',
          fontWeight: 700,
          letterSpacing: '0.04em',
        }}
      >
        {mark}
      </span>
    </div>
  )
}
