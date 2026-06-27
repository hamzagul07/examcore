import type { ReactNode } from 'react'
import { GuestSignupGate } from '@/components/auth/GuestSignupGate'

type Props = {
  children: ReactNode
}

export default function IbCourseLessonGateLayout({ children }: Props) {
  return <GuestSignupGate>{children}</GuestSignupGate>
}
