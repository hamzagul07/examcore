'use client'

import { MacBookFrame } from './MacBookFrame'
import { IPhoneFrame } from './IPhoneFrame'

export type DeviceFrameProps = {
  src: string
  alt: string
  width: number
  height: number
  priority?: boolean
  className?: string
}

export function DeviceFrame(props: DeviceFrameProps) {
  return (
    <>
      <div className="hidden md:block">
        <MacBookFrame {...props} />
      </div>
      <div className="block md:hidden">
        <IPhoneFrame {...props} />
      </div>
    </>
  )
}
