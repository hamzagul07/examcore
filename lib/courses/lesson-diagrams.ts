import type { ComponentType } from 'react'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
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
import { LogicGatesDiagram } from '@/components/diagrams/LogicGatesDiagram'
import { CpuComponentsDiagram } from '@/components/diagrams/CpuComponentsDiagram'
import { BinaryShiftDiagram } from '@/components/diagrams/BinaryShiftDiagram'
import { AlgorithmTraceDiagram } from '@/components/diagrams/AlgorithmTraceDiagram'
import { NetworkPacketDiagram } from '@/components/diagrams/NetworkPacketDiagram'
import { OsResourceDiagram } from '@/components/diagrams/OsResourceDiagram'
import { TranslationPipelineDiagram } from '@/components/diagrams/TranslationPipelineDiagram'
import { DatabaseRelationDiagram } from '@/components/diagrams/DatabaseRelationDiagram'
import { ControlFlowDiagram } from '@/components/diagrams/ControlFlowDiagram'
import { MultimediaGraphicsDiagram } from '@/components/diagrams/MultimediaGraphicsDiagram'
import { DataSecurityDiagram } from '@/components/diagrams/DataSecurityDiagram'
import { EthicsIpDiagram } from '@/components/diagrams/EthicsIpDiagram'
import { DataTypesRecordDiagram } from '@/components/diagrams/DataTypesRecordDiagram'
import { ArrayStructureDiagram } from '@/components/diagrams/ArrayStructureDiagram'
import { FileAccessDiagram } from '@/components/diagrams/FileAccessDiagram'
import { ProgrammingBasicsDiagram } from '@/components/diagrams/ProgrammingBasicsDiagram'
import { SdlcDiagram } from '@/components/diagrams/SdlcDiagram'
import { TestingMaintenanceDiagram } from '@/components/diagrams/TestingMaintenanceDiagram'
import { FloatingPointDiagram } from '@/components/diagrams/FloatingPointDiagram'
import { ProcessorParallelDiagram } from '@/components/diagrams/ProcessorParallelDiagram'
import { EncryptionDiagram } from '@/components/diagrams/EncryptionDiagram'
import { ExpertSystemDiagram } from '@/components/diagrams/ExpertSystemDiagram'
import { ParadigmDiagram } from '@/components/diagrams/ParadigmDiagram'
import { resolveFamilyDiagram } from '@/lib/courses/diagram-families'
import { resolveVisualCatalogSlug } from '@/lib/courses/visual-slug-aliases'

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
  { Component: ComponentType<LessonDiagramComponentProps>; meta: LessonDiagramMeta }
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
  '3-2-logic-gates-and-logic-circuits': {
    Component: LogicGatesDiagram,
    meta: {
      caption: 'NOT, AND, and OR gates — truth tables define every combinational output.',
      attribution: {
        source: 'MarkScheme animation',
        license: 'Proprietary',
      },
    },
  },
  '15-2-boolean-algebra-and-logic-circuits': {
    Component: LogicGatesDiagram,
    meta: {
      caption: 'Boolean algebra simplifies circuits — Karnaugh maps and adder logic.',
      attribution: {
        source: 'MarkScheme animation',
        license: 'Proprietary',
      },
    },
  },
  '3-1-computers-and-their-components': {
    Component: CpuComponentsDiagram,
    meta: {
      caption: 'CPU, memory, storage, and I/O — fetch–decode–execute in the Von Neumann model.',
      attribution: {
        source: 'MarkScheme animation',
        license: 'Proprietary',
      },
    },
  },
  '4-3-bit-manipulation': {
    Component: BinaryShiftDiagram,
    meta: {
      caption: 'Logical shifts, masks, XOR toggles, and two\'s complement representation.',
      attribution: {
        source: 'MarkScheme animation',
        license: 'Proprietary',
      },
    },
  },
  '19-1-algorithms': {
    Component: AlgorithmTraceDiagram,
    meta: {
      caption: 'Searching, sorting, and trace tables — compare algorithm efficiency.',
      attribution: {
        source: 'MarkScheme animation',
        license: 'Proprietary',
      },
    },
  },
  '2-1-networks-including-the-internet': {
    Component: NetworkPacketDiagram,
    meta: {
      caption: 'LAN/WAN topologies, packet vs circuit switching, and TCP/IP layers.',
      attribution: {
        source: 'MarkScheme animation',
        license: 'Proprietary',
      },
    },
  },
  '16-1-purposes-of-an-operating-system-os': {
    Component: OsResourceDiagram,
    meta: {
      caption: 'OS manages processes, memory, device drivers, and security.',
      attribution: {
        source: 'MarkScheme animation',
        license: 'Proprietary',
      },
    },
  },
  '16-2-translation-software': {
    Component: TranslationPipelineDiagram,
    meta: {
      caption: 'Assembler, compiler, interpreter, and linker roles in program translation.',
      attribution: {
        source: 'MarkScheme animation',
        license: 'Proprietary',
      },
    },
  },
  '8-1-database-concepts': {
    Component: DatabaseRelationDiagram,
    meta: {
      caption: 'Relational tables, primary/foreign keys, normalisation, and ER relationships.',
      attribution: {
        source: 'MarkScheme animation',
        license: 'Proprietary',
      },
    },
  },
  '11-2-constructs': {
    Component: ControlFlowDiagram,
    meta: {
      caption: 'IF/CASE selection and FOR/WHILE iteration in structured pseudocode.',
      attribution: { source: 'MarkScheme animation', license: 'Proprietary' },
    },
  },
  '1-2-1-multimedia-graphics': { Component: MultimediaGraphicsDiagram, meta: { caption: 'Bitmap vs vector graphics, compression, and file size.', attribution: { source: 'MarkScheme animation', license: 'Proprietary' } } },
  '6-1-data-security': { Component: DataSecurityDiagram, meta: { caption: 'Threats, authentication, backup, and physical security controls.', attribution: { source: 'MarkScheme animation', license: 'Proprietary' } } },
  '7-1-ethics-and-ownership': { Component: EthicsIpDiagram, meta: { caption: 'Copyright, patents, professional conduct, and AI ethics.', attribution: { source: 'MarkScheme animation', license: 'Proprietary' } } },
  '10-1-data-types-and-records': { Component: DataTypesRecordDiagram, meta: { caption: 'Atomic types, records, declaration, and enumerated types.', attribution: { source: 'MarkScheme animation', license: 'Proprietary' } } },
  '10-2-arrays': { Component: ArrayStructureDiagram, meta: { caption: '1D/2D arrays, searching, stacks and queues.', attribution: { source: 'MarkScheme animation', license: 'Proprietary' } } },
  '10-3-files': { Component: FileAccessDiagram, meta: { caption: 'Sequential and random file access, lifecycle, and error handling.', attribution: { source: 'MarkScheme animation', license: 'Proprietary' } } },
  '11-1-programming-basics': { Component: ProgrammingBasicsDiagram, meta: { caption: 'Variables, I/O, operators, and comments in pseudocode.', attribution: { source: 'MarkScheme animation', license: 'Proprietary' } } },
  '12-1-program-development-life-cycle': { Component: SdlcDiagram, meta: { caption: 'Analysis → design → implementation → testing → maintenance.', attribution: { source: 'MarkScheme animation', license: 'Proprietary' } } },
  '12-3-program-testing-and-maintenance': { Component: TestingMaintenanceDiagram, meta: { caption: 'Test data, stubs, alpha/beta testing, and maintenance types.', attribution: { source: 'MarkScheme animation', license: 'Proprietary' } } },
  '13-3-floating-point-numbers-representation-and-manipulation': { Component: FloatingPointDiagram, meta: { caption: 'IEEE floating-point: sign, mantissa, exponent, and rounding.', attribution: { source: 'MarkScheme animation', license: 'Proprietary' } } },
  '15-1-processors-parallel-processing-and-virtual-machines': { Component: ProcessorParallelDiagram, meta: { caption: 'FDE cycle, multi-core, virtual machines, and SIMD/MIMD.', attribution: { source: 'MarkScheme animation', license: 'Proprietary' } } },
  '17-1-encryption-encryption-protocols-and-digital-certificates': { Component: EncryptionDiagram, meta: { caption: 'Symmetric/asymmetric encryption, hashing, and digital certificates.', attribution: { source: 'MarkScheme animation', license: 'Proprietary' } } },
  '18-1-artificial-intelligence-ai': { Component: ExpertSystemDiagram, meta: { caption: 'Expert systems, machine learning overview, and AI ethics.', attribution: { source: 'MarkScheme animation', license: 'Proprietary' } } },
  '20-1-programming-paradigms': { Component: ParadigmDiagram, meta: { caption: 'Procedural, object-oriented, and declarative programming styles.', attribution: { source: 'MarkScheme animation', license: 'Proprietary' } } },
}

export function getLessonDiagram(slug: string) {
  const direct = PILOT_DIAGRAMS[slug] ?? resolveFamilyDiagram(slug)
  if (direct) return direct
  const alias = resolveVisualCatalogSlug(slug)
  if (alias !== slug) {
    return PILOT_DIAGRAMS[alias] ?? resolveFamilyDiagram(alias) ?? null
  }
  return null
}

export function hasLessonLiveDiagram(slug: string): boolean {
  return getLessonDiagram(slug) !== null
}

export const PILOT_DIAGRAM_SLUGS = Object.keys(PILOT_DIAGRAMS)
