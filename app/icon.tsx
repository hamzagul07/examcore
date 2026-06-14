import { ImageResponse } from 'next/og'
import { FAVICON, faviconDataUrl } from '@/lib/brand/favicon-svg'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
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
          borderRadius: 7,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={faviconDataUrl()} width={30} height={30} alt="" />
      </div>
    ),
    { ...size }
  )
}
