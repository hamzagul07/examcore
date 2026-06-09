import type { ComponentType } from 'react'
import { CentripetalMotionDiagram } from '@/components/diagrams/CentripetalMotionDiagram'
import { EquilibriumForcesDiagram } from '@/components/diagrams/EquilibriumForcesDiagram'
import { FreeBodyDiagram } from '@/components/diagrams/FreeBodyDiagram'
import { CollisionBeforeAfter } from '@/components/diagrams/CollisionBeforeAfter'
import { KinematicsGraphDiagram } from '@/components/diagrams/KinematicsGraphDiagram'
import { SeriesCircuitDiagram } from '@/components/diagrams/SeriesCircuitDiagram'
import { WavesComparison } from '@/components/diagrams/WavesComparison'
import { TwoThermometers } from '@/components/diagrams/TwoThermometers'
import { HeatingCurve } from '@/components/diagrams/HeatingCurve'

export type LessonDiagramMeta = {
  caption: string
  attribution: {
    source: string
    license: string
    licenseUrl?: string
    sourceUrl?: string
  }
}

const PILOT_DIAGRAMS: Record<
  string,
  { Component: ComponentType<{ className?: string }>; meta: LessonDiagramMeta }
> = {
  '4-2-equilibrium-of-forces': {
    Component: EquilibriumForcesDiagram,
    meta: {
      caption:
        'Rotational equilibrium: clockwise and anticlockwise moments balance. Translational equilibrium: coplanar forces form a closed vector triangle.',
      attribution: {
        source: 'Senpai Corner (diagram reference) + MarkScheme animation',
        license: 'Proprietary',
        sourceUrl: 'https://www.senpaicorner.com/cie-as-physics-2025-2027-notes',
      },
    },
  },
  '2-1-equations-of-motion': {
    Component: KinematicsGraphDiagram,
    meta: {
      caption: 'On an s–t graph, the gradient at any point gives the instantaneous velocity.',
      attribution: {
        source: 'Senpai Corner (reference) + MarkScheme animation',
        license: 'Proprietary',
        sourceUrl: 'https://www.senpaicorner.com/cie-as-physics-2025-2027-notes',
      },
    },
  },
  '3-1-momentum-and-newtons-laws-of-motion': {
    Component: FreeBodyDiagram,
    meta: {
      caption: 'Net force on a mass produces acceleration — Newton’s second law in one picture.',
      attribution: {
        source: 'Senpai Corner (reference) + MarkScheme animation',
        license: 'Proprietary',
        sourceUrl: 'https://www.senpaicorner.com/cie-as-physics-2025-2027-notes',
      },
    },
  },
  '10-1-practical-circuits': {
    Component: SeriesCircuitDiagram,
    meta: {
      caption: 'In a series circuit the same current passes through every component.',
      attribution: {
        source: 'Senpai Corner (reference) + MarkScheme animation',
        license: 'Proprietary',
        sourceUrl: 'https://www.senpaicorner.com/cie-as-physics-2025-2027-notes',
      },
    },
  },
  '12-1-kinematics-of-uniform-circular-motion': {
    Component: CentripetalMotionDiagram,
    meta: {
      caption: 'Velocity is tangential; centripetal acceleration points toward the centre.',
      attribution: {
        source: 'Senpai Corner (reference) + MarkScheme animation',
        license: 'Proprietary',
        sourceUrl: 'https://www.senpaicorner.com/cie-a-levels-physics-2025-2027-notes',
      },
    },
  },
  '3-3-linear-momentum-and-its-conservation': {
    Component: CollisionBeforeAfter,
    meta: {
      caption: 'Before and after an inelastic collision — total momentum is conserved.',
      attribution: { source: 'Original', license: 'Proprietary' },
    },
  },
  '7-2-transverse-and-longitudinal-waves': {
    Component: WavesComparison,
    meta: {
      caption: 'Transverse: particle motion ⊥ energy transfer. Longitudinal: both parallel.',
      attribution: {
        source: 'Senpai Corner (reference) + MarkScheme animation',
        license: 'Proprietary',
        sourceUrl: 'https://www.senpaicorner.com/cie-as-physics-2025-2027-notes',
      },
    },
  },
  '14-2-temperature-scales': {
    Component: TwoThermometers,
    meta: {
      caption: 'Celsius and Kelvin scales differ by 273.15 — same size steps, different zero.',
      attribution: { source: 'Original', license: 'Proprietary' },
    },
  },
  '14-3-specific-heat-capacity-and-specific-latent-heat': {
    Component: HeatingCurve,
    meta: {
      caption:
        'Temperature stays constant during phase changes — that hidden energy is specific latent heat.',
      attribution: { source: 'Original', license: 'Proprietary' },
    },
  },
}

export function getLessonDiagram(slug: string) {
  return PILOT_DIAGRAMS[slug] ?? null
}

export const PILOT_DIAGRAM_SLUGS = Object.keys(PILOT_DIAGRAMS)
