import type { ComponentType } from 'react'
import { CapacitorDischargeDiagram } from '@/components/diagrams/CapacitorDischargeDiagram'
import { CentripetalMotionDiagram } from '@/components/diagrams/CentripetalMotionDiagram'
import { DopplerEffectDiagram } from '@/components/diagrams/DopplerEffectDiagram'
import { ElectricFieldRadialDiagram } from '@/components/diagrams/ElectricFieldRadialDiagram'
import { EmInductionDiagram } from '@/components/diagrams/EmInductionDiagram'
import { EquilibriumForcesDiagram } from '@/components/diagrams/EquilibriumForcesDiagram'
import { FreeBodyDiagram } from '@/components/diagrams/FreeBodyDiagram'
import { CollisionBeforeAfter } from '@/components/diagrams/CollisionBeforeAfter'
import { InterferenceDiagram } from '@/components/diagrams/InterferenceDiagram'
import { KinematicsGraphDiagram } from '@/components/diagrams/KinematicsGraphDiagram'
import { MomentsDiagram } from '@/components/diagrams/MomentsDiagram'
import { PhotoelectricDiagram } from '@/components/diagrams/PhotoelectricDiagram'
import { PotentialDividerDiagram } from '@/components/diagrams/PotentialDividerDiagram'
import { SeriesCircuitDiagram } from '@/components/diagrams/SeriesCircuitDiagram'
import { SimpleHarmonicMotionDiagram } from '@/components/diagrams/SimpleHarmonicMotionDiagram'
import { StationaryWaveDiagram } from '@/components/diagrams/StationaryWaveDiagram'
import { WalErrorBarDiagram } from '@/components/diagrams/WalErrorBarDiagram'
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
  '4-1-turning-effects-of-forces': {
    Component: MomentsDiagram,
    meta: {
      caption: 'Moment = force × perpendicular distance from the pivot.',
      attribution: {
        source: 'Senpai Corner (reference) + MarkScheme animation',
        license: 'Proprietary',
        sourceUrl: 'https://www.senpaicorner.com/cie-as-physics-2025-2027-notes',
      },
    },
  },
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
  '10-3-potential-dividers': {
    Component: PotentialDividerDiagram,
    meta: {
      caption: 'Output p.d. is the fraction of supply voltage across the lower resistor.',
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
  '7-3-doppler-effect-for-sound-waves': {
    Component: DopplerEffectDiagram,
    meta: {
      caption: 'Approaching source: shorter wavelength and higher observed frequency.',
      attribution: {
        source: 'Senpai Corner (reference) + MarkScheme animation',
        license: 'Proprietary',
        sourceUrl: 'https://www.senpaicorner.com/cie-as-physics-2025-2027-notes',
      },
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
  '8-1-stationary-waves': {
    Component: StationaryWaveDiagram,
    meta: {
      caption: 'Nodes stay at zero displacement; antinodes oscillate with maximum amplitude.',
      attribution: {
        source: 'Senpai Corner (reference) + MarkScheme animation',
        license: 'Proprietary',
        sourceUrl: 'https://www.senpaicorner.com/cie-as-physics-2025-2027-notes',
      },
    },
  },
  '8-3-interference': {
    Component: InterferenceDiagram,
    meta: {
      caption: 'Path difference between two coherent sources sets fringe spacing.',
      attribution: {
        source: 'Senpai Corner (reference) + MarkScheme animation',
        license: 'Proprietary',
        sourceUrl: 'https://www.senpaicorner.com/cie-as-physics-2025-2027-notes',
      },
    },
  },
  '18-4-electric-field-of-a-point-charge': {
    Component: ElectricFieldRadialDiagram,
    meta: {
      caption: 'Radial field lines: E ∝ 1/r² for an isolated point charge.',
      attribution: {
        source: 'Senpai Corner (reference) + MarkScheme animation',
        license: 'Proprietary',
        sourceUrl: 'https://www.senpaicorner.com/cie-a-levels-physics-2025-2027-notes',
      },
    },
  },
  '20-5-electromagnetic-induction': {
    Component: EmInductionDiagram,
    meta: {
      caption: 'Changing magnetic flux through a coil induces an e.m.f. (Faraday’s law).',
      attribution: {
        source: 'Senpai Corner (reference) + MarkScheme animation',
        license: 'Proprietary',
        sourceUrl: 'https://www.senpaicorner.com/cie-a-levels-physics-2025-2027-notes',
      },
    },
  },
  '22-2-photoelectric-effect': {
    Component: PhotoelectricDiagram,
    meta: {
      caption: 'Photon energy hf must exceed work function Φ to release photoelectrons.',
      attribution: {
        source: 'Senpai Corner (reference) + MarkScheme animation',
        license: 'Proprietary',
        sourceUrl: 'https://www.senpaicorner.com/cie-a-levels-physics-2025-2027-notes',
      },
    },
  },
  '17-1-simple-harmonic-oscillations': {
    Component: SimpleHarmonicMotionDiagram,
    meta: {
      caption: 'Displacement varies sinusoidally — acceleration always points toward equilibrium.',
      attribution: {
        source: 'Senpai Corner (reference) + MarkScheme animation',
        license: 'Proprietary',
        sourceUrl: 'https://www.senpaicorner.com/cie-a-levels-physics-2025-2027-notes',
      },
    },
  },
  '19-3-discharging-a-capacitor': {
    Component: CapacitorDischargeDiagram,
    meta: {
      caption: 'Capacitor p.d. decays exponentially through a resistor: V = V₀e^(−t/RC).',
      attribution: {
        source: 'Senpai Corner (reference) + MarkScheme animation',
        license: 'Proprietary',
        sourceUrl: 'https://www.senpaicorner.com/cie-a-levels-physics-2025-2027-notes',
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
  'paper-5-planning-and-analysis': {
    Component: WalErrorBarDiagram,
    meta: {
      caption:
        'Plot error bars, draw LOBF and WAL, then Δgradient = |m_LOBF − m_WAL| (Senpai Corner Paper 5 method).',
      attribution: {
        source: 'Senpai Corner (reference) + MarkScheme animation',
        license: 'Proprietary',
        sourceUrl: 'https://www.senpaicorner.com/cie-a-levels-physics-2025-2027-notes',
      },
    },
  },
}

export function getLessonDiagram(slug: string) {
  return PILOT_DIAGRAMS[slug] ?? null
}

export const PILOT_DIAGRAM_SLUGS = Object.keys(PILOT_DIAGRAMS)
