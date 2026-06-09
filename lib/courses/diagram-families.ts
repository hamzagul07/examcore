import type { ComponentType } from 'react'
import { AcWaveformDiagram } from '@/components/diagrams/AcWaveformDiagram'
import { CapacitorDischargeDiagram } from '@/components/diagrams/CapacitorDischargeDiagram'
import { CentripetalMotionDiagram } from '@/components/diagrams/CentripetalMotionDiagram'
import { CollisionBeforeAfter } from '@/components/diagrams/CollisionBeforeAfter'
import { DiffractionSlitDiagram } from '@/components/diagrams/DiffractionSlitDiagram'
import { DopplerEffectDiagram } from '@/components/diagrams/DopplerEffectDiagram'
import { ElectricFieldRadialDiagram } from '@/components/diagrams/ElectricFieldRadialDiagram'
import { EmInductionDiagram } from '@/components/diagrams/EmInductionDiagram'
import { EnergyLevelsDiagram } from '@/components/diagrams/EnergyLevelsDiagram'
import { EnergyTransferDiagram } from '@/components/diagrams/EnergyTransferDiagram'
import { FreeBodyDiagram } from '@/components/diagrams/FreeBodyDiagram'
import { GasKineticDiagram } from '@/components/diagrams/GasKineticDiagram'
import { GravitationalFieldDiagram } from '@/components/diagrams/GravitationalFieldDiagram'
import { HeatingCurve } from '@/components/diagrams/HeatingCurve'
import { InterferenceDiagram } from '@/components/diagrams/InterferenceDiagram'
import { KinematicsGraphDiagram } from '@/components/diagrams/KinematicsGraphDiagram'
import { MagneticFieldDiagram } from '@/components/diagrams/MagneticFieldDiagram'
import { PhotoelectricDiagram } from '@/components/diagrams/PhotoelectricDiagram'
import { PotentialDividerDiagram } from '@/components/diagrams/PotentialDividerDiagram'
import { ProgressiveWaveDiagram } from '@/components/diagrams/ProgressiveWaveDiagram'
import { RadioactiveDecayDiagram } from '@/components/diagrams/RadioactiveDecayDiagram'
import { SeriesCircuitDiagram } from '@/components/diagrams/SeriesCircuitDiagram'
import { SimpleHarmonicMotionDiagram } from '@/components/diagrams/SimpleHarmonicMotionDiagram'
import { StationaryWaveDiagram } from '@/components/diagrams/StationaryWaveDiagram'
import { StressStrainDiagram } from '@/components/diagrams/StressStrainDiagram'
import { TwoThermometers } from '@/components/diagrams/TwoThermometers'
import { UniformElectricFieldDiagram } from '@/components/diagrams/UniformElectricFieldDiagram'
import { VectorAdditionDiagram } from '@/components/diagrams/VectorAdditionDiagram'
import { WalErrorBarDiagram } from '@/components/diagrams/WalErrorBarDiagram'
import { WavesComparison } from '@/components/diagrams/WavesComparison'
type DiagramAttribution = {
  source: string
  license: string
  licenseUrl?: string
  sourceUrl?: string
}

type FamilyEntry = {
  Component: ComponentType<{ className?: string }>
  caption: string
}

const SENPAI_AS = 'https://www.senpaicorner.com/cie-as-physics-2025-2027-notes'
const SENPAI_AL = 'https://www.senpaicorner.com/cie-a-levels-physics-2025-2027-notes'

const FAMILIES: Record<string, FamilyEntry> = {
  kinematics: {
    Component: KinematicsGraphDiagram,
    caption: 'On an s–t graph, the gradient gives velocity; area under v–t gives displacement.',
  },
  vectors: {
    Component: VectorAdditionDiagram,
    caption: 'Vectors add nose-to-tail; the resultant has magnitude and direction.',
  },
  'error-bars': {
    Component: WalErrorBarDiagram,
    caption: 'Combine measurement uncertainties before plotting and analysing graphs.',
  },
  'free-body': {
    Component: FreeBodyDiagram,
    caption: 'Resolve forces on an object — net force determines acceleration.',
  },
  collision: {
    Component: CollisionBeforeAfter,
    caption: 'Total momentum before = total momentum after (if no external impulse).',
  },
  'energy-transfer': {
    Component: EnergyTransferDiagram,
    caption: 'Energy transfers between stores; total energy conserved in a closed system.',
  },
  'stress-strain': {
    Component: StressStrainDiagram,
    caption: 'σ = F/A and ε = ΔL/L — gradient of linear region gives Young modulus.',
  },
  'progressive-wave': {
    Component: ProgressiveWaveDiagram,
    caption: 'Progressive waves transfer energy; v = fλ links speed, frequency, and wavelength.',
  },
  'waves-compare': {
    Component: WavesComparison,
    caption: 'Compare transverse and longitudinal wave motion and energy transfer.',
  },
  doppler: {
    Component: DopplerEffectDiagram,
    caption: 'Relative motion shifts observed frequency and wavelength.',
  },
  'stationary-wave': {
    Component: StationaryWaveDiagram,
    caption: 'Nodes and antinodes form when two identical waves superpose.',
  },
  diffraction: {
    Component: DiffractionSlitDiagram,
    caption: 'Waves spread after passing a gap; narrower slit → wider pattern.',
  },
  interference: {
    Component: InterferenceDiagram,
    caption: 'Path difference between coherent sources sets fringe spacing.',
  },
  'series-circuit': {
    Component: SeriesCircuitDiagram,
    caption: 'Series: same current everywhere. Parallel: same p.d. across each branch.',
  },
  'potential-divider': {
    Component: PotentialDividerDiagram,
    caption: 'Vout = Vin × R₂ / (R₁ + R₂) for a simple divider.',
  },
  'gravitational-field': {
    Component: GravitationalFieldDiagram,
    caption: 'g = GM/r²; field lines point toward the mass creating the field.',
  },
  thermal: {
    Component: TwoThermometers,
    caption: 'Kelvin and Celsius scales: same step size, different zero.',
  },
  'heating-curve': {
    Component: HeatingCurve,
    caption: 'Plateaus during phase change — energy goes into latent heat, not temperature.',
  },
  'gas-kinetic': {
    Component: GasKineticDiagram,
    caption: 'pV = nRT; particle speed relates to absolute temperature.',
  },
  shm: {
    Component: SimpleHarmonicMotionDiagram,
    caption: 'SHM: a = −ω²x — acceleration always directed toward equilibrium.',
  },
  'uniform-e-field': {
    Component: UniformElectricFieldDiagram,
    caption: 'Uniform field E = V/d between parallel charged plates.',
  },
  'radial-e-field': {
    Component: ElectricFieldRadialDiagram,
    caption: 'Radial field around a point charge: E ∝ 1/r².',
  },
  capacitor: {
    Component: CapacitorDischargeDiagram,
    caption: 'Capacitor stores charge; discharge through R is exponential.',
  },
  'magnetic-field': {
    Component: MagneticFieldDiagram,
    caption: 'Magnetic field circles a current; F = BIL sin θ on a conductor.',
  },
  'em-induction': {
    Component: EmInductionDiagram,
    caption: 'Changing flux induces e.m.f.: ε = −dΦ/dt.',
  },
  'ac-waveform': {
    Component: AcWaveformDiagram,
    caption: 'AC varies sinusoidally; Vrms = V₀/√2.',
  },
  photoelectric: {
    Component: PhotoelectricDiagram,
    caption: 'Photon energy hf must exceed work function to release electrons.',
  },
  'energy-levels': {
    Component: EnergyLevelsDiagram,
    caption: 'Electrons absorb/emit photons when jumping between discrete levels.',
  },
  'radioactive-decay': {
    Component: RadioactiveDecayDiagram,
    caption: 'Activity decays exponentially: A = A₀e^(−λt).',
  },
  centripetal: {
    Component: CentripetalMotionDiagram,
    caption: 'Centripetal acceleration points toward the centre of the circle.',
  },
}

/** 9702 slug → diagram family (custom slug-specific diagrams take priority). */
const SLUG_FAMILY: Record<string, keyof typeof FAMILIES> = {
  '1-1-physical-quantities': 'vectors',
  '1-2-si-units': 'vectors',
  '1-3-errors-and-uncertainties': 'error-bars',
  '1-4-scalars-and-vectors': 'vectors',
  '3-2-non-uniform-motion': 'kinematics',
  '4-3-density-and-pressure': 'energy-transfer',
  '5-1-energy-conservation': 'energy-transfer',
  '5-2-gravitational-potential-energy-and-kinetic-energy': 'energy-transfer',
  '6-1-stress-and-strain': 'stress-strain',
  '6-2-elastic-and-plastic-behaviour': 'stress-strain',
  '7-1-progressive-waves': 'progressive-wave',
  '7-4-electromagnetic-spectrum': 'progressive-wave',
  '7-5-polarisation': 'progressive-wave',
  '8-2-diffraction': 'diffraction',
  '8-4-the-diffraction-grating': 'diffraction',
  '9-1-electric-current': 'series-circuit',
  '9-2-potential-difference-and-power': 'series-circuit',
  '9-3-resistance-and-resistivity': 'series-circuit',
  '10-2-kirchhoffs-laws': 'series-circuit',
  '11-1-atoms-nuclei-and-radiation': 'energy-levels',
  '11-2-fundamental-particles': 'energy-levels',
  '12-2-centripetal-acceleration': 'centripetal',
  '13-1-gravitational-field': 'gravitational-field',
  '13-2-gravitational-force-between-point-masses': 'gravitational-field',
  '13-3-gravitational-field-of-a-point-mass': 'gravitational-field',
  '13-4-gravitational-potential': 'gravitational-field',
  '14-1-thermal-equilibrium': 'thermal',
  '15-1-the-mole': 'gas-kinetic',
  '15-2-equation-of-state': 'gas-kinetic',
  '15-3-kinetic-theory-of-gases': 'gas-kinetic',
  '16-1-internal-energy': 'heating-curve',
  '16-2-the-first-law-of-thermodynamics': 'heating-curve',
  '17-2-energy-in-simple-harmonic-motion': 'shm',
  '17-3-damped-and-forced-oscillations-resonance': 'shm',
  '18-1-electric-fields-and-field-lines': 'uniform-e-field',
  '18-2-uniform-electric-fields': 'uniform-e-field',
  '18-3-electric-force-between-point-charges': 'radial-e-field',
  '18-5-electric-potential': 'uniform-e-field',
  '19-1-capacitors-and-capacitance': 'capacitor',
  '19-2-energy-stored-in-a-capacitor': 'capacitor',
  '20-1-concept-of-a-magnetic-field': 'magnetic-field',
  '20-2-force-on-a-current-carrying-conductor': 'magnetic-field',
  '20-3-force-on-a-moving-charge': 'magnetic-field',
  '20-4-magnetic-fields-due-to-currents': 'magnetic-field',
  '21-1-characteristics-of-alternating-currents': 'ac-waveform',
  '21-2-rectification-and-smoothing': 'ac-waveform',
  '22-1-energy-and-momentum-of-a-photon': 'photoelectric',
  '22-3-wave-particle-duality': 'waves-compare',
  '22-4-energy-levels-in-atoms-and-line-spectra': 'energy-levels',
  '23-1-mass-defect-and-nuclear-binding-energy': 'energy-levels',
  '23-2-radioactive-decay': 'radioactive-decay',
  '24-1-production-and-use-of-ultrasound': 'progressive-wave',
  '24-2-production-and-use-of-x-rays': 'energy-levels',
  '24-3-pet-scanning': 'radioactive-decay',
  '25-1-standard-candles': 'gravitational-field',
  '25-2-stellar-radii': 'gravitational-field',
  '25-3-hubbles-law-and-the-big-bang-theory': 'kinematics',
}

function familyAttribution(slug: string): DiagramAttribution {
  const isAl = /^1[2-9]|^2[0-5]|^paper-5/.test(slug)
  return {
    source: 'MarkScheme diagram family',
    license: 'Proprietary',
    sourceUrl: isAl ? SENPAI_AL : SENPAI_AS,
  }
}

export function resolveFamilyDiagram(slug: string): {
  Component: ComponentType<{ className?: string }>
  meta: { caption: string; attribution: DiagramAttribution }
} | null {
  const familyId = SLUG_FAMILY[slug]
  if (!familyId) return null
  const family = FAMILIES[familyId]
  if (!family) return null
  return {
    Component: family.Component,
    meta: {
      caption: family.caption,
      attribution: familyAttribution(slug),
    },
  }
}

export function getFamilyIdForSlug(slug: string): string | null {
  return SLUG_FAMILY[slug] ?? null
}

export function listFamilyCoverage(): { slug: string; family: string }[] {
  return Object.entries(SLUG_FAMILY).map(([slug, family]) => ({ slug, family }))
}
