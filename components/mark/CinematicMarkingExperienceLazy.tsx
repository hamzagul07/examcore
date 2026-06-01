'use client'

import dynamic from 'next/dynamic'
import type { ComponentType } from 'react'
import type { CinematicMarkingExperienceProps } from '@/components/mark/CinematicMarkingExperience'

export type { CinematicMarkingExperienceProps }

export const CinematicMarkingExperience: ComponentType<CinematicMarkingExperienceProps> =
  dynamic(
    () =>
      import('@/components/mark/CinematicMarkingExperience').then(
        (m) => m.CinematicMarkingExperience
      ),
    { ssr: false, loading: () => null }
  )
