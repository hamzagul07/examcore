import { ImageResponse } from 'next/og'
import { FAVICON, faviconDataUrl } from '@/lib/brand/favicon-svg'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: FAVICON.bg,
          borderRadius: 36,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={faviconDataUrl()} width={156} height={156} alt="" />
      </div>
    ),
    { ...size }
  )
}
