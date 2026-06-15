import type { ComponentType } from 'react'
import { BiologicalMoleculeDiagram } from '@/components/diagrams/BiologicalMoleculeDiagram'
import { BiotechDiagram } from '@/components/diagrams/BiotechDiagram'
import { CellStructureDiagram } from '@/components/diagrams/CellStructureDiagram'
import { CirculatoryDiagram } from '@/components/diagrams/CirculatoryDiagram'
import { DnaReplicationDiagram } from '@/components/diagrams/DnaReplicationDiagram'
import { EcologyDiagram } from '@/components/diagrams/EcologyDiagram'
import { EnzymeActionDiagram } from '@/components/diagrams/EnzymeActionDiagram'
import { GasExchangeDiagram } from '@/components/diagrams/GasExchangeDiagram'
import { GeneticsInheritanceDiagram } from '@/components/diagrams/GeneticsInheritanceDiagram'
import { HomeostasisDiagram } from '@/components/diagrams/HomeostasisDiagram'
import { ImmuneResponseDiagram } from '@/components/diagrams/ImmuneResponseDiagram'
import { MembraneTransportDiagram } from '@/components/diagrams/MembraneTransportDiagram'
import { MitosisDiagram } from '@/components/diagrams/MitosisDiagram'
import { NervousSystemDiagram } from '@/components/diagrams/NervousSystemDiagram'
import { PhotosynthesisDiagram } from '@/components/diagrams/PhotosynthesisDiagram'
import { PlantTransportDiagram } from '@/components/diagrams/PlantTransportDiagram'
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
import { DifferentiationTangentDiagram } from '@/components/diagrams/DifferentiationTangentDiagram'
import { DefiniteIntegralDiagram } from '@/components/diagrams/DefiniteIntegralDiagram'
import { ComplexPlaneDiagram } from '@/components/diagrams/ComplexPlaneDiagram'
import { MoleculeShapeDiagram } from '@/components/diagrams/MoleculeShapeDiagram'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
type DiagramAttribution = {
  source: string
  license: string
  licenseUrl?: string
  sourceUrl?: string
}

type FamilyEntry = {
  Component: ComponentType<LessonDiagramComponentProps>
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
  differentiation: {
    Component: DifferentiationTangentDiagram,
    caption: 'Gradient of the tangent at x₀ equals dy/dx — the derivative at that point.',
  },
  integration: {
    Component: DefiniteIntegralDiagram,
    caption: '∫ₐᵇ f(x) dx is the signed area under y = f(x) between x = a and x = b.',
  },
  'complex-numbers': {
    Component: ComplexPlaneDiagram,
    caption: 'Complex numbers z = x + iy plot on the Argand diagram — |z| and arg(z) from the axes.',
  },
  'molecule-shape': {
    Component: MoleculeShapeDiagram,
    caption: 'VSEPR: electron pairs repel — lone pairs compress bond angles below ideal values.',
  },
  centripetal: {
    Component: CentripetalMotionDiagram,
    caption: 'Centripetal acceleration points toward the centre of the circle.',
  },
  'bio-cell': {
    Component: CellStructureDiagram,
    caption: 'Cells are the basic unit of life — membrane, nucleus, and organelles.',
  },
  'bio-molecule': {
    Component: BiologicalMoleculeDiagram,
    caption: 'Monomers join by condensation; polymers break by hydrolysis.',
  },
  'bio-enzyme': {
    Component: EnzymeActionDiagram,
    caption: 'Substrate fits the active site; products leave so the enzyme can repeat.',
  },
  'bio-membrane': {
    Component: MembraneTransportDiagram,
    caption: 'Fluid mosaic membrane controls movement by diffusion, osmosis, and transport proteins.',
  },
  'bio-mitosis': {
    Component: MitosisDiagram,
    caption: 'Mitosis produces two genetically identical daughter cells.',
  },
  'bio-dna': {
    Component: DnaReplicationDiagram,
    caption: 'Semi-conservative replication — each new DNA has one old and one new strand.',
  },
  'bio-plant-transport': {
    Component: PlantTransportDiagram,
    caption: 'Xylem carries water up; phloem translocates assimilates.',
  },
  'bio-circulatory': {
    Component: CirculatoryDiagram,
    caption: 'Double circulation: heart → lungs → heart → body tissues.',
  },
  'bio-gas-exchange': {
    Component: GasExchangeDiagram,
    caption: 'Gas exchange at alveoli by diffusion down concentration gradients.',
  },
  'bio-immune': {
    Component: ImmuneResponseDiagram,
    caption: 'Antibodies bind specific antigens to mark pathogens for destruction.',
  },
  'bio-photosynthesis': {
    Component: PhotosynthesisDiagram,
    caption: 'Light energy drives conversion of CO₂ and H₂O into glucose and O₂.',
  },
  'bio-homeostasis': {
    Component: HomeostasisDiagram,
    caption: 'Negative feedback detects change and restores the set point.',
  },
  'bio-nervous': {
    Component: NervousSystemDiagram,
    caption: 'Neurones transmit impulses from receptor to effector via the CNS.',
  },
  'bio-genetics': {
    Component: GeneticsInheritanceDiagram,
    caption: 'Allele combinations in a Punnett square predict genotype ratios.',
  },
  'bio-ecology': {
    Component: EcologyDiagram,
    caption: 'Energy passes between trophic levels — only ~10% transferred each step.',
  },
  'bio-biotech': {
    Component: BiotechDiagram,
    caption: 'Recombinant DNA: insert a gene into a vector and clone in host cells.',
  },
}

/** 9702 slug → diagram family (custom slug-specific diagrams take priority). */
const SLUG_FAMILY_9702: Record<string, keyof typeof FAMILIES> = {
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
  '7-2-transverse-and-longitudinal-waves': 'waves-compare',
  '7-3-doppler-effect-for-sound-waves': 'doppler',
  '8-1-stationary-waves': 'stationary-wave',
  '8-3-interference': 'interference',
  '17-1-simple-harmonic-oscillations': 'shm',
  '18-4-electric-field-of-a-point-charge': 'radial-e-field',
  '19-3-discharging-a-capacitor': 'capacitor',
  '20-5-electromagnetic-induction': 'em-induction',
  '2-1-equations-of-motion': 'kinematics',
  '3-3-linear-momentum-and-its-conservation': 'collision',
  '10-1-practical-circuits': 'series-circuit',
  '10-3-potential-dividers': 'potential-divider',
  '12-1-kinematics-of-uniform-circular-motion': 'centripetal',
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

/** 9700 Biology slug → diagram family. */
const SLUG_FAMILY_9700: Record<string, keyof typeof FAMILIES> = {
  '1-1-the-microscope-in-cell-studies': 'bio-cell',
  '1-2-cells-as-the-basic-units-of-living-organisms': 'bio-cell',
  '2-1-testing-for-biological-molecules': 'bio-molecule',
  '2-2-carbohydrates-and-lipids': 'bio-molecule',
  '2-3-proteins': 'bio-molecule',
  '2-4-water': 'bio-molecule',
  '3-1-mode-of-action-of-enzymes': 'bio-enzyme',
  '3-2-factors-that-affect-enzyme-action': 'bio-enzyme',
  '4-1-fluid-mosaic-membranes': 'bio-membrane',
  '4-2-movement-into-and-out-of-cells': 'bio-membrane',
  '5-1-replication-and-division-of-nuclei-and-cells': 'bio-mitosis',
  '5-2-chromosome-behaviour-in-mitosis': 'bio-mitosis',
  '6-1-structure-of-nucleic-acids-and-replication-of-dna': 'bio-dna',
  '6-2-protein-synthesis': 'bio-dna',
  '7-1-structure-of-transport-tissues': 'bio-plant-transport',
  '7-2-transport-mechanisms': 'bio-plant-transport',
  '8-1-the-circulatory-system': 'bio-circulatory',
  '8-2-transport-of-oxygen-and-carbon-dioxide': 'bio-circulatory',
  '8-3-the-heart': 'bio-circulatory',
  '9-1-the-gas-exchange-system': 'bio-gas-exchange',
  '10-1-infectious-diseases': 'bio-immune',
  '10-2-antibiotics': 'bio-immune',
  '11-1-the-immune-system': 'bio-immune',
  '11-2-antibodies-and-vaccination': 'bio-immune',
  '12-1-energy': 'bio-homeostasis',
  '12-2-respiration': 'bio-homeostasis',
  '13-1-photosynthesis-as-an-energy-transfer-process': 'bio-photosynthesis',
  '13-2-investigation-of-limiting-factors': 'bio-photosynthesis',
  '14-1-homeostasis-in-mammals': 'bio-homeostasis',
  '14-2-homeostasis-in-plants': 'bio-homeostasis',
  '15-1-control-and-coordination-in-mammals': 'bio-nervous',
  '15-2-control-and-coordination-in-plants': 'bio-nervous',
  '16-1-passage-of-information-from-parents-to-offspring': 'bio-genetics',
  '16-2-the-roles-of-genes-in-determining-the-phenotype': 'bio-genetics',
  '16-3-gene-control': 'bio-genetics',
  '17-1-variation': 'bio-genetics',
  '17-2-natural-and-artificial-selection': 'bio-ecology',
  '17-3-evolution': 'bio-ecology',
  '18-1-classification': 'bio-ecology',
  '18-2-biodiversity': 'bio-ecology',
  '18-3-conservation': 'bio-ecology',
  '19-1-principles-of-genetic-technology': 'bio-biotech',
  '19-2-genetic-technology-applied-to-medicine': 'bio-biotech',
  '19-3-genetically-modified-organisms-in-agriculture': 'bio-biotech',
}

/** 9701 Chemistry slug → diagram family. */
const SLUG_FAMILY_9701: Record<string, keyof typeof FAMILIES> = {
  '3-5-shapes-of-molecules': 'molecule-shape',
  '13-3-shapes-of-organic-molecules-and-bonds': 'molecule-shape',
  '29-3-shapes-of-aromatic-organic-molecules-and-bonds': 'molecule-shape',
}

/** 9709 Pure Maths slug → diagram family. */
const SLUG_FAMILY_9709: Record<string, keyof typeof FAMILIES> = {
  '1-7-differentiation': 'differentiation',
  '1-8-integration': 'integration',
  '2-4-differentiation': 'differentiation',
  '2-5-integration': 'integration',
  '3-4-differentiation': 'differentiation',
  '3-5-integration': 'integration',
  '3-7-vectors': 'vectors',
  '3-8-differential-equations': 'integration',
  '3-9-complex-numbers': 'complex-numbers',
}

const SLUG_FAMILY: Record<string, keyof typeof FAMILIES> = {
  ...SLUG_FAMILY_9702,
  ...SLUG_FAMILY_9700,
  ...SLUG_FAMILY_9701,
  ...SLUG_FAMILY_9709,
}

const BIOLOGY_SLUGS = new Set(Object.keys(SLUG_FAMILY_9700))
const MATHS_SLUGS = new Set(Object.keys(SLUG_FAMILY_9709))
const CHEMISTRY_SLUGS = new Set(Object.keys(SLUG_FAMILY_9701))

function familyAttribution(slug: string): DiagramAttribution {
  if (BIOLOGY_SLUGS.has(slug)) {
    return { source: 'MarkScheme biology diagram family', license: 'Proprietary' }
  }
  if (MATHS_SLUGS.has(slug)) {
    return { source: 'MarkScheme maths diagram family', license: 'Proprietary' }
  }
  if (CHEMISTRY_SLUGS.has(slug)) {
    return { source: 'MarkScheme chemistry diagram family', license: 'Proprietary' }
  }
  const isAl = /^1[2-9]|^2[0-5]|^paper-5/.test(slug)
  return {
    source: 'MarkScheme diagram family',
    license: 'Proprietary',
    sourceUrl: isAl ? SENPAI_AL : SENPAI_AS,
  }
}

export function getSubjectForSlug(slug: string): string | null {
  if (BIOLOGY_SLUGS.has(slug)) return '9700'
  if (MATHS_SLUGS.has(slug)) return '9709'
  if (CHEMISTRY_SLUGS.has(slug)) return '9701'
  if (slug in SLUG_FAMILY_9702 || slug.startsWith('paper-5')) return '9702'
  return null
}

export function resolveFamilyDiagram(slug: string): {
  Component: ComponentType<LessonDiagramComponentProps>
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
