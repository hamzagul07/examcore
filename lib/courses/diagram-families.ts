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
import { CovalentBondDiagram } from '@/components/diagrams/CovalentBondDiagram'
import { EnthalpyProfileDiagram } from '@/components/diagrams/EnthalpyProfileDiagram'
import { EquilibriumDiagram } from '@/components/diagrams/EquilibriumDiagram'
import { ReactionRateDiagram } from '@/components/diagrams/ReactionRateDiagram'
import { AtomicStructureDiagram } from '@/components/diagrams/AtomicStructureDiagram'
import { ElectronConfigurationDiagram } from '@/components/diagrams/ElectronConfigurationDiagram'
import { ElectronegativityDiagram } from '@/components/diagrams/ElectronegativityDiagram'
import { IonicBondDiagram } from '@/components/diagrams/IonicBondDiagram'
import { RedoxDiagram } from '@/components/diagrams/RedoxDiagram'
import { PeriodicityDiagram } from '@/components/diagrams/PeriodicityDiagram'
import { StoichiometryDiagram } from '@/components/diagrams/StoichiometryDiagram'
import { IntermolecularForcesDiagram } from '@/components/diagrams/IntermolecularForcesDiagram'
import { BondStructureDiagram } from '@/components/diagrams/BondStructureDiagram'
import { AcidsBasesDiagram } from '@/components/diagrams/AcidsBasesDiagram'
import { Group2TrendsDiagram } from '@/components/diagrams/Group2TrendsDiagram'
import { HalogenDiagram } from '@/components/diagrams/HalogenDiagram'
import { OrganicNamingDiagram } from '@/components/diagrams/OrganicNamingDiagram'
import { OrganicMechanismDiagram } from '@/components/diagrams/OrganicMechanismDiagram'
import { IsomerismDiagram } from '@/components/diagrams/IsomerismDiagram'
import { AlkaneAlkeneDiagram } from '@/components/diagrams/AlkaneAlkeneDiagram'
import { HalogenoalkaneDiagram } from '@/components/diagrams/HalogenoalkaneDiagram'
import { OrganicFunctionalDiagram } from '@/components/diagrams/OrganicFunctionalDiagram'
import { BornHaberDiagram } from '@/components/diagrams/BornHaberDiagram'
import { GibbsEntropyDiagram } from '@/components/diagrams/GibbsEntropyDiagram'
import { ElectrochemistryDiagram } from '@/components/diagrams/ElectrochemistryDiagram'
import { TransitionMetalDiagram } from '@/components/diagrams/TransitionMetalDiagram'
import { SpectroscopyDiagram } from '@/components/diagrams/SpectroscopyDiagram'
import { ALevelAcidsDiagram } from '@/components/diagrams/ALevelAcidsDiagram'
import { RateLawDiagram } from '@/components/diagrams/RateLawDiagram'
import { AreneDiagram } from '@/components/diagrams/AreneDiagram'
import { PolymerDiagram } from '@/components/diagrams/PolymerDiagram'
import { OrganicSynthesisDiagram } from '@/components/diagrams/OrganicSynthesisDiagram'
import { HalogenReactionsDiagram } from '@/components/diagrams/HalogenReactionsDiagram'
import { NitrogenChemDiagram } from '@/components/diagrams/NitrogenChemDiagram'
import { ALevelOrganicDiagram } from '@/components/diagrams/ALevelOrganicDiagram'
import { QuadraticGraphDiagram } from '@/components/diagrams/QuadraticGraphDiagram'
import { FunctionGraphDiagram } from '@/components/diagrams/FunctionGraphDiagram'
import { CoordinateGeometryDiagram } from '@/components/diagrams/CoordinateGeometryDiagram'
import { TrigonometryCircleDiagram } from '@/components/diagrams/TrigonometryCircleDiagram'
import { SeriesDiagram } from '@/components/diagrams/SeriesDiagram'
import { LogExpDiagram } from '@/components/diagrams/LogExpDiagram'
import { NumericalMethodsDiagram } from '@/components/diagrams/NumericalMethodsDiagram'
import { StatsDataDiagram } from '@/components/diagrams/StatsDataDiagram'
import { ProbabilityDiagram } from '@/components/diagrams/ProbabilityDiagram'
import { DiscreteDistributionDiagram } from '@/components/diagrams/DiscreteDistributionDiagram'
import { NormalDistributionDiagram } from '@/components/diagrams/NormalDistributionDiagram'
import { StatsAdvancedDiagram } from '@/components/diagrams/StatsAdvancedDiagram'
import { MatrixDiagram } from '@/components/diagrams/MatrixDiagram'
import { AccountingDiagram } from '@/components/diagrams/AccountingDiagram'
import { BusinessDiagram } from '@/components/diagrams/BusinessDiagram'
import { BreakEvenDiagram } from '@/components/diagrams/BreakEvenDiagram'
import { RatioAnalysisDiagram } from '@/components/diagrams/RatioAnalysisDiagram'
import { StakeholderDiagram } from '@/components/diagrams/StakeholderDiagram'
import { InvestmentAppraisalDiagram } from '@/components/diagrams/InvestmentAppraisalDiagram'
import { CashFlowDiagram } from '@/components/diagrams/CashFlowDiagram'
import { BankReconciliationDiagram } from '@/components/diagrams/BankReconciliationDiagram'
import { EconSupplyDemandDiagram } from '@/components/diagrams/EconSupplyDemandDiagram'
import { EconElasticityDiagram } from '@/components/diagrams/EconElasticityDiagram'
import { EconPpcDiagram } from '@/components/diagrams/EconPpcDiagram'
import { EconInterventionDiagram } from '@/components/diagrams/EconInterventionDiagram'
import { EconCostCurvesDiagram } from '@/components/diagrams/EconCostCurvesDiagram'
import { EconMarketStructureDiagram } from '@/components/diagrams/EconMarketStructureDiagram'
import { EconMacroDiagram } from '@/components/diagrams/EconMacroDiagram'
import { EconCircularFlowDiagram } from '@/components/diagrams/EconCircularFlowDiagram'
import { EconTradeDiagram } from '@/components/diagrams/EconTradeDiagram'
import { EconUtilityDiagram } from '@/components/diagrams/EconUtilityDiagram'
import { BizMarketingMixDiagram } from '@/components/diagrams/BizMarketingMixDiagram'
import { BizStrategyDiagram } from '@/components/diagrams/BizStrategyDiagram'
import { BizOrgStructureDiagram } from '@/components/diagrams/BizOrgStructureDiagram'
import { BizOperationsDiagram } from '@/components/diagrams/BizOperationsDiagram'
import { BizFinanceDiagram } from '@/components/diagrams/BizFinanceDiagram'
import { PsychDsmDiagram } from '@/components/diagrams/PsychDsmDiagram'
import { PsychDiathesisDiagram } from '@/components/diagrams/PsychDiathesisDiagram'
import { PsychTreatmentDiagram } from '@/components/diagrams/PsychTreatmentDiagram'
import { PsychResearchDiagram } from '@/components/diagrams/PsychResearchDiagram'
import { PsychFunnelDiagram } from '@/components/diagrams/PsychFunnelDiagram'
import { PsychRetailDiagram } from '@/components/diagrams/PsychRetailDiagram'
import { PsychAdsDiagram } from '@/components/diagrams/PsychAdsDiagram'
import { PsychHealthDiagram } from '@/components/diagrams/PsychHealthDiagram'
import { PsychWorkplaceDiagram } from '@/components/diagrams/PsychWorkplaceDiagram'
import { LawSystemDiagram } from '@/components/diagrams/LawSystemDiagram'
import { LawContractDiagram } from '@/components/diagrams/LawContractDiagram'
import { LawTortDiagram } from '@/components/diagrams/LawTortDiagram'
import { LawCriminalDiagram } from '@/components/diagrams/LawCriminalDiagram'
import { LawPrecedentDiagram } from '@/components/diagrams/LawPrecedentDiagram'
import { LawInterpretationDiagram } from '@/components/diagrams/LawInterpretationDiagram'
import { LawRemediesDiagram } from '@/components/diagrams/LawRemediesDiagram'
import { LawAdrDiagram } from '@/components/diagrams/LawAdrDiagram'
import { SocTheoryDiagram } from '@/components/diagrams/SocTheoryDiagram'
import { SocResearchDiagram } from '@/components/diagrams/SocResearchDiagram'
import { SocFamilyDiagram } from '@/components/diagrams/SocFamilyDiagram'
import { SocEducationDiagram } from '@/components/diagrams/SocEducationDiagram'
import { SocMediaDiagram } from '@/components/diagrams/SocMediaDiagram'
import { SocGlobalisationDiagram } from '@/components/diagrams/SocGlobalisationDiagram'
import { SocReligionDiagram } from '@/components/diagrams/SocReligionDiagram'
import { SocCrimeDiagram } from '@/components/diagrams/SocCrimeDiagram'
import { AcctStatementsDiagram } from '@/components/diagrams/AcctStatementsDiagram'
import { AcctCostDiagram } from '@/components/diagrams/AcctCostDiagram'
import { PsychPainDiagram } from '@/components/diagrams/PsychPainDiagram'
import { PsychStressDiagram } from '@/components/diagrams/PsychStressDiagram'
import { PsychLeadershipDiagram } from '@/components/diagrams/PsychLeadershipDiagram'
import { PsychGroupsDiagram } from '@/components/diagrams/PsychGroupsDiagram'
import { PsychWorkEnvDiagram } from '@/components/diagrams/PsychWorkEnvDiagram'
import { PsychSatisfactionDiagram } from '@/components/diagrams/PsychSatisfactionDiagram'
import { BioRespirationDiagram } from '@/components/diagrams/BioRespirationDiagram'
import { BioEvolutionDiagram } from '@/components/diagrams/BioEvolutionDiagram'
import { DensityPressureDiagram } from '@/components/diagrams/DensityPressureDiagram'
import { SLUG_FAMILY_COMMERCE_HUMANITIES, SLUG_FAMILY_9706, SLUG_FAMILY_9609 } from '@/lib/courses/generated/subject-visuals'
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
  'density-pressure': {
    Component: DensityPressureDiagram,
    caption: 'Pressure is force per unit area; in a fluid p = ρgh increases with depth.',
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
  quadratics: {
    Component: QuadraticGraphDiagram,
    caption: 'Quadratic y = ax² + bx + c — vertex form, discriminant, and roots.',
  },
  functions: {
    Component: FunctionGraphDiagram,
    caption: 'Functions: domain, range, composition f(g(x)), and inverses.',
  },
  'coordinate-geometry': {
    Component: CoordinateGeometryDiagram,
    caption: 'Lines y = mx + c, distance, midpoint, and parallel/perpendicular gradients.',
  },
  trigonometry: {
    Component: TrigonometryCircleDiagram,
    caption: 'Unit circle: sin θ, cos θ, tan θ, radians, and identities.',
  },
  series: {
    Component: SeriesDiagram,
    caption: 'Arithmetic and geometric series, binomial expansion, and Σ notation.',
  },
  'log-exp': {
    Component: LogExpDiagram,
    caption: 'Exponential aˣ and logarithm log_a(x) — inverse functions and log laws.',
  },
  'numerical-methods': {
    Component: NumericalMethodsDiagram,
    caption: 'Locate roots by sign change; refine with iteration when |g′(x)| < 1.',
  },
  'stats-data': {
    Component: StatsDataDiagram,
    caption: 'Histograms, mean, median, and measures of spread for grouped data.',
  },
  probability: {
    Component: ProbabilityDiagram,
    caption: 'Sample space, combined events, permutations (nPr) and combinations (nCr).',
  },
  'discrete-stats': {
    Component: DiscreteDistributionDiagram,
    caption: 'Discrete random variable: P(X = x), E(X), and Var(X).',
  },
  'normal-stats': {
    Component: NormalDistributionDiagram,
    caption: 'Normal distribution N(μ, σ²) — bell curve, standardisation Z = (X − μ)/σ.',
  },
  'stats-advanced': {
    Component: StatsAdvancedDiagram,
    caption: 'Poisson, linear combinations, continuous PDFs, sampling, and hypothesis tests.',
  },
  matrices: {
    Component: MatrixDiagram,
    caption: 'Matrix multiplication, identity, inverse, and 2D transformations.',
  },
  'molecule-shape': {
    Component: MoleculeShapeDiagram,
    caption: 'VSEPR: electron pairs repel — lone pairs compress bond angles below ideal values.',
  },
  'covalent-bond': {
    Component: CovalentBondDiagram,
    caption: 'Covalent bonds share electron pairs; dative bonds donate a lone pair from one atom.',
  },
  'enthalpy-profile': {
    Component: EnthalpyProfileDiagram,
    caption: 'ΔH is heat transferred at constant pressure — exothermic (ΔH < 0) or endothermic (ΔH > 0).',
  },
  equilibrium: {
    Component: EquilibriumDiagram,
    caption: 'Dynamic equilibrium: forward and reverse rates equal; concentrations stay constant.',
  },
  'reaction-rate': {
    Component: ReactionRateDiagram,
    caption: 'Rate depends on collision frequency and collisions with energy ≥ activation energy.',
  },
  'atomic-structure': {
    Component: AtomicStructureDiagram,
    caption: 'Atoms have a nucleus (protons, neutrons) and electrons — isotopes differ in neutron number.',
  },
  'electron-config': {
    Component: ElectronConfigurationDiagram,
    caption: 'Electrons occupy shells and orbitals — ionisation energy trends across periods and groups.',
  },
  electronegativity: {
    Component: ElectronegativityDiagram,
    caption: 'Electronegativity increases across a period — bond polarity depends on ΔEN.',
  },
  'ionic-bond': {
    Component: IonicBondDiagram,
    caption: 'Ionic bonding: electron transfer to form a giant lattice of alternating ions.',
  },
  redox: {
    Component: RedoxDiagram,
    caption: 'Redox: oxidation is electron loss, reduction is electron gain — track oxidation numbers.',
  },
  periodicity: {
    Component: PeriodicityDiagram,
    caption: 'Period 3 trends link atomic structure to physical and chemical properties.',
  },
  stoichiometry: {
    Component: StoichiometryDiagram,
    caption: 'Moles link mass, Mr, and balanced equation ratios — core Paper 2 arithmetic.',
  },
  imf: {
    Component: IntermolecularForcesDiagram,
    caption: 'Van der Waals, dipole-dipole, and hydrogen bonds explain boiling points and solubility.',
  },
  'bond-structure': {
    Component: BondStructureDiagram,
    caption: 'Giant vs simple molecular structures explain melting point and conductivity.',
  },
  'acids-bases': {
    Component: AcidsBasesDiagram,
    caption: 'Brønsted-Lowry: acids donate H⁺, bases accept — conjugate pairs differ by one proton.',
  },
  'group-2': {
    Component: Group2TrendsDiagram,
    caption: 'Group 2 reactivity and solubility trends increase down the group.',
  },
  halogen: {
    Component: HalogenDiagram,
    caption: 'Halogens: colour and boiling point increase down group; oxidising power decreases.',
  },
  'organic-naming': {
    Component: OrganicNamingDiagram,
    caption: 'IUPAC naming: longest chain, functional group suffix, lowest locants.',
  },
  'organic-mechanism': {
    Component: OrganicMechanismDiagram,
    caption: 'Free-radical substitution, electrophilic addition, and nucleophilic substitution.',
  },
  isomerism: {
    Component: IsomerismDiagram,
    caption: 'Structural, E/Z, and optical isomerism — same molecular formula, different arrangement.',
  },
  'alkane-alkene': {
    Component: AlkaneAlkeneDiagram,
    caption: 'Saturated alkanes vs unsaturated alkenes — key reactions and tests.',
  },
  halogenoalkane: {
    Component: HalogenoalkaneDiagram,
    caption: 'SN1 and SN2 mechanisms — leaving group ability and carbocation stability.',
  },
  'organic-functional': {
    Component: OrganicFunctionalDiagram,
    caption: 'Functional group interconversions — oxidation, esterification, and tests.',
  },
  'born-haber': {
    Component: BornHaberDiagram,
    caption: 'Born–Haber and hydration cycles link lattice energy to solubility.',
  },
  'gibbs-entropy': {
    Component: GibbsEntropyDiagram,
    caption: 'ΔG = ΔH − TΔS determines feasibility — entropy and equilibrium.',
  },
  electrochemistry: {
    Component: ElectrochemistryDiagram,
    caption: 'Electrolysis and E°cell — link redox, Faraday, and thermodynamics.',
  },
  'transition-metal': {
    Component: TransitionMetalDiagram,
    caption: 'Transition metals: variable oxidation states, coloured complexes, and catalysis.',
  },
  spectroscopy: {
    Component: SpectroscopyDiagram,
    caption: 'IR, mass spec, chromatography, and NMR — deduce structure from data.',
  },
  'alevel-acids': {
    Component: ALevelAcidsDiagram,
    caption: 'A Level acid-base equilibria, buffers, and partition coefficients.',
  },
  'rate-law': {
    Component: RateLawDiagram,
    caption: 'Rate equations, reaction orders, and Arrhenius kinetics.',
  },
  arene: {
    Component: AreneDiagram,
    caption: 'Benzene and phenol — electrophilic substitution and ring activation.',
  },
  polymer: {
    Component: PolymerDiagram,
    caption: 'Addition and condensation polymerisation — repeat units and disposal.',
  },
  'organic-synthesis': {
    Component: OrganicSynthesisDiagram,
    caption: 'Multi-step organic synthesis — retrosynthesis and test-tube confirmation.',
  },
  'halogen-reactions': {
    Component: HalogenReactionsDiagram,
    caption: 'Halide ion tests, reducing power, and chlorine disproportionation.',
  },
  'nitrogen-chem': {
    Component: NitrogenChemDiagram,
    caption: 'Nitrogen, sulfur industrial chemistry, and nitrile synthesis.',
  },
  'alevel-organic': {
    Component: ALevelOrganicDiagram,
    caption: 'Acyl chlorides, amides, azo dyes, and amino acid chemistry.',
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
  'bio-respiration': {
    Component: BioRespirationDiagram,
    caption: 'Aerobic respiration releases energy from glucose as ATP in the mitochondria.',
  },
  'bio-evolution': {
    Component: BioEvolutionDiagram,
    caption: 'Natural selection shifts allele frequencies — the population evolves.',
  },
  'commerce-accounting-ledger': {
    Component: AccountingDiagram,
    caption: 'Double entry flows from source documents through books of prime entry to ledgers.',
  },
  'commerce-accounting-cost': {
    Component: AcctCostDiagram,
    caption: 'Cost behaviour, contribution, and break-even analysis for decision-making.',
  },
  'commerce-accounting-statements': {
    Component: AcctStatementsDiagram,
    caption: 'Financial statements and ratios summarise performance and position.',
  },
  'commerce-breakeven': {
    Component: BreakEvenDiagram,
    caption: 'Break-even is where total revenue equals total cost — contribution per unit covers fixed costs.',
  },
  'commerce-ratios': {
    Component: RatioAnalysisDiagram,
    caption: 'Ratio analysis compares liquidity, profitability, efficiency, and gearing over time.',
  },
  'commerce-investment': {
    Component: InvestmentAppraisalDiagram,
    caption: 'Investment appraisal compares payback, ARR, NPV, and IRR for capital projects.',
  },
  'commerce-investment-npv': {
    Component: InvestmentAppraisalDiagram,
    caption: 'NPV discounts future cash flows — accept projects with positive NPV at the required return.',
  },
  'commerce-cashflow': {
    Component: CashFlowDiagram,
    caption: 'Cash flow forecasts, budgets, and working capital management.',
  },
  'commerce-bank-reconcil': {
    Component: BankReconciliationDiagram,
    caption: 'Bank reconciliation matches cash book balance to the bank statement.',
  },
  'commerce-stakeholder': {
    Component: StakeholderDiagram,
    caption: 'Stakeholder mapping uses power and interest to prioritise engagement.',
  },
  'commerce-elasticity': {
    Component: BusinessDiagram,
    caption: 'Price elasticity links demand responsiveness to revenue and pricing strategy.',
  },
  'commerce-marketing': {
    Component: BusinessDiagram,
    caption: 'The marketing mix balances product, price, promotion, and place.',
  },
  'commerce-hrm': {
    Component: BusinessDiagram,
    caption: 'Organisational structure links leadership, motivation, and workforce planning.',
  },
  'commerce-operations': {
    Component: BusinessDiagram,
    caption: 'Operations transform inputs into outputs — quality, capacity, and efficiency matter.',
  },
  'commerce-finance': {
    Component: BusinessDiagram,
    caption: 'Finance sources, cash flow, budgets, and investment appraisal guide decisions.',
  },
  'commerce-strategy': {
    Component: BusinessDiagram,
    caption: 'PESTLE, stakeholders, and objectives shape strategic choices.',
  },
  'law-system-process': {
    Component: LawSystemDiagram,
    caption: 'Sources of law, courts, and dispute resolution in the English legal system.',
  },
  'law-contract-elements': {
    Component: LawContractDiagram,
    caption: 'Valid contracts require offer, acceptance, consideration, and intention.',
  },
  'law-criminal-elements': {
    Component: LawCriminalDiagram,
    caption: 'Criminal liability requires actus reus and mens rea — plus causation and defences.',
  },
  'law-tort-elements': {
    Component: LawTortDiagram,
    caption: 'Negligence: duty of care, breach, causation, and remoteness of damage.',
  },
  'law-precedent': {
    Component: LawPrecedentDiagram,
    caption: 'Judicial precedent — stare decisis, ratio decidendi, and court hierarchy.',
  },
  'law-interpretation': {
    Component: LawInterpretationDiagram,
    caption: 'Statutory interpretation rules — literal, golden, mischief, and purposive.',
  },
  'law-remedies': {
    Component: LawRemediesDiagram,
    caption: 'Civil remedies — compensatory and punitive damages, injunctions, and specific performance.',
  },
  'law-adr': {
    Component: LawAdrDiagram,
    caption: 'Alternative dispute resolution — negotiation, mediation, arbitration, and litigation.',
  },
  'soc-theory': {
    Component: SocTheoryDiagram,
    caption: 'Sociological perspectives explain structure, agency, and social change.',
  },
  'soc-research': {
    Component: SocResearchDiagram,
    caption: 'Research design links methods to validity, reliability, and ethics.',
  },
  'soc-family': {
    Component: SocFamilyDiagram,
    caption: 'Family structures, roles, and sociological perspectives on domestic life.',
  },
  'soc-education': {
    Component: SocEducationDiagram,
    caption: 'Education reproduces or challenges inequality — theories and attainment gaps.',
  },
  'soc-media': {
    Component: SocMediaDiagram,
    caption: 'Media effects models — from hypodermic syringe to active audience theories.',
  },
  'soc-globalisation': {
    Component: SocGlobalisationDiagram,
    caption: 'Globalisation reshapes identity, power, migration, and inequality.',
  },
  'soc-religion': {
    Component: SocReligionDiagram,
    caption: 'Secularisation debate — religion, social change, and post-modernity.',
  },
  'soc-crime': {
    Component: SocCrimeDiagram,
    caption: 'Crime and deviance — globalisation, inequality, and media representations.',
  },
  'psych-clinical': {
    Component: PsychTreatmentDiagram,
    caption: 'Clinical pathway: diagnosis, explanation, treatment, and evaluation.',
  },
  'psych-clinical-dsm': {
    Component: PsychDsmDiagram,
    caption: 'Diagnostic criteria — symptoms, duration, distress, and functional impairment.',
  },
  'psych-clinical-diathesis': {
    Component: PsychDiathesisDiagram,
    caption: 'Diathesis-stress model — vulnerability plus life stress triggers disorder.',
  },
  'psych-clinical-treatment': {
    Component: PsychTreatmentDiagram,
    caption: 'Biopsychosocial treatment — drugs, CBT, and social support combined.',
  },
  'psych-research': {
    Component: PsychResearchDiagram,
    caption: 'Research design — IV/DV, controls, ethics, and core study evaluation.',
  },
  'psych-consumer': {
    Component: PsychFunnelDiagram,
    caption: 'Consumer behaviour links perception, heuristics, and purchase decisions.',
  },
  'psych-consumer-funnel': {
    Component: PsychFunnelDiagram,
    caption: 'Consumer decision funnel — recognition, search, evaluation, purchase, post-purchase.',
  },
  'psych-consumer-retail': {
    Component: PsychRetailDiagram,
    caption: 'Retail atmospherics — layout, sound, and environmental cues shape behaviour.',
  },
  'psych-consumer-ads': {
    Component: PsychAdsDiagram,
    caption: 'Advertising techniques — attention, persuasion, and brand awareness.',
  },
  'psych-health': {
    Component: PsychHealthDiagram,
    caption: 'Health psychology models explain beliefs, adherence, and behaviour change.',
  },
  'psych-workplace': {
    Component: PsychWorkplaceDiagram,
    caption: 'Workplace psychology covers leadership, motivation, groups, and satisfaction.',
  },
  'psych-pain': {
    Component: PsychPainDiagram,
    caption: 'Gate control theory — psychological factors open or close the pain gate.',
  },
  'psych-stress': {
    Component: PsychStressDiagram,
    caption: 'The General Adaptation Syndrome: alarm, resistance, then exhaustion.',
  },
  'psych-leadership': {
    Component: PsychLeadershipDiagram,
    caption: 'Leadership styles range from autocratic control to team freedom.',
  },
  'psych-groups': {
    Component: PsychGroupsDiagram,
    caption: "Tuckman's stages: forming, storming, norming, and performing.",
  },
  'psych-work-env': {
    Component: PsychWorkEnvDiagram,
    caption: 'Physical and temporal work conditions shape performance and wellbeing.',
  },
  'psych-satisfaction': {
    Component: PsychSatisfactionDiagram,
    caption: "Herzberg's two factors: motivators drive satisfaction; hygiene prevents dissatisfaction.",
  },
  'econ-supply-demand': {
    Component: EconSupplyDemandDiagram,
    caption: 'Demand and supply interact to set the market equilibrium price and quantity.',
  },
  'econ-elasticity': {
    Component: EconElasticityDiagram,
    caption: 'Elasticity measures how responsive quantity is to a change in price or income.',
  },
  'econ-ppc': {
    Component: EconPpcDiagram,
    caption: 'Scarcity forces choice — the PPC shows opportunity cost and productive efficiency.',
  },
  'econ-intervention': {
    Component: EconInterventionDiagram,
    caption: 'Governments tax, subsidise, or set prices to correct market failure.',
  },
  'econ-cost-revenue': {
    Component: EconCostCurvesDiagram,
    caption: 'Average and marginal cost curves underpin short- and long-run production decisions.',
  },
  'econ-market-structure': {
    Component: EconMarketStructureDiagram,
    caption: 'Firms maximise profit where MC = MR; market structure shapes price and output.',
  },
  'econ-macro': {
    Component: EconMacroDiagram,
    caption: 'AD–AS analysis sets the price level and national output — the basis of macro policy.',
  },
  'econ-circular-flow': {
    Component: EconCircularFlowDiagram,
    caption: 'Income circulates between households and firms, adjusted by injections and leakages.',
  },
  'econ-trade': {
    Component: EconTradeDiagram,
    caption: 'Trade, exchange rates, and protectionism shape the balance of payments.',
  },
  'econ-utility': {
    Component: EconUtilityDiagram,
    caption: 'Consumers maximise utility where the budget line is tangent to an indifference curve.',
  },
  'biz-marketing': {
    Component: BizMarketingMixDiagram,
    caption: 'The marketing mix balances product, price, place, and promotion for the target market.',
  },
  'biz-strategy': {
    Component: BizStrategyDiagram,
    caption: 'SWOT and the business environment shape strategic choices and objectives.',
  },
  'biz-hrm': {
    Component: BizOrgStructureDiagram,
    caption: 'Organisational structure sets the chain of command, span of control, and communication.',
  },
  'biz-operations': {
    Component: BizOperationsDiagram,
    caption: 'Operations transform inputs into outputs — efficiency, quality, and capacity add value.',
  },
  'biz-finance': {
    Component: BizFinanceDiagram,
    caption: 'Sources of finance fund the business; profit is revenue minus costs.',
  },
}

/** 9702 slug → diagram family (custom slug-specific diagrams take priority). */
const SLUG_FAMILY_9702: Record<string, keyof typeof FAMILIES> = {
  '1-1-physical-quantities': 'vectors',
  '1-2-si-units': 'vectors',
  '1-3-errors-and-uncertainties': 'error-bars',
  '1-4-scalars-and-vectors': 'vectors',
  '3-2-non-uniform-motion': 'kinematics',
  '4-3-density-and-pressure': 'density-pressure',
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
  '12-1-energy': 'bio-respiration',
  '12-2-respiration': 'bio-respiration',
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
  '17-2-natural-and-artificial-selection': 'bio-evolution',
  '17-3-evolution': 'bio-evolution',
  '18-1-classification': 'bio-ecology',
  '18-2-biodiversity': 'bio-ecology',
  '18-3-conservation': 'bio-ecology',
  '19-1-principles-of-genetic-technology': 'bio-biotech',
  '19-2-genetic-technology-applied-to-medicine': 'bio-biotech',
  '19-3-genetically-modified-organisms-in-agriculture': 'bio-biotech',
}

/** 9701 Chemistry slug → diagram family. */
const SLUG_FAMILY_9701: Record<string, keyof typeof FAMILIES> = {
  '1-1-particles-in-the-atom-and-atomic-radius': 'atomic-structure',
  '1-2-isotopes': 'atomic-structure',
  '1-3-electrons-energy-levels-and-atomic-orbitals': 'electron-config',
  '1-4-ionisation-energy': 'electron-config',
  '2-1-relative-masses-of-atoms-and-molecules': 'stoichiometry',
  '2-2-the-mole-and-the-avogadro-constant': 'stoichiometry',
  '2-3-formulas': 'stoichiometry',
  '2-4-reacting-masses-and-volumes-of-solutions-and-gases': 'stoichiometry',
  '3-1-electronegativity-and-bonding': 'electronegativity',
  '3-2-ionic-bonding': 'ionic-bond',
  '3-3-metallic-bonding': 'ionic-bond',
  '3-4-covalent-bonding-and-coordinate-dative-covalent-bonding': 'covalent-bond',
  '3-5-shapes-of-molecules': 'molecule-shape',
  '3-6-intermolecular-forces-electronegativity-and-bond-properties': 'imf',
  '3-7-dot-and-cross-diagrams': 'covalent-bond',
  '4-1-the-gaseous-state-ideal-and-real-gases-and-pv-nrt': 'gas-kinetic',
  '4-2-bonding-and-structure': 'bond-structure',
  '5-1-enthalpy-change-h': 'enthalpy-profile',
  '5-2-hesss-law': 'enthalpy-profile',
  '7-1-chemical-equilibria-reversible-reactions-dynamic-equilibrium': 'equilibrium',
  '7-2-br-nsted-lowry-theory-of-acids-and-bases': 'acids-bases',
  '8-1-rate-of-reaction': 'reaction-rate',
  '8-2-effect-of-temperature-on-reaction-rates-and-the-concept-of-activation-energy': 'reaction-rate',
  '8-3-homogeneous-and-heterogeneous-catalysts': 'reaction-rate',
  '6-1-redox-processes-electron-transfer-and-changes-in-oxidation-number-oxidation-state': 'redox',
  '9-1-periodicity-of-physical-properties-of-the-elements-in-period-3': 'periodicity',
  '9-2-periodicity-of-chemical-properties-of-the-elements-in-period-3': 'periodicity',
  '9-3-chemical-periodicity-of-other-elements': 'periodicity',
  '10-1-similarities-and-trends-in-the-properties-of-the-group-2-metals-magnesium-to-barium-and-their-compounds': 'group-2',
  '11-1-physical-properties-of-the-group-17-elements': 'halogen',
  '11-2-the-chemical-properties-of-the-halogen-elements-and-the-hydrogen-halides': 'halogen',
  '11-3-some-reactions-of-the-halide-ions': 'halogen-reactions',
  '11-4-the-reactions-of-chlorine': 'halogen-reactions',
  '12-1-nitrogen-and-sulfur': 'nitrogen-chem',
  '13-1-formulas-functional-groups-and-the-naming-of-organic-compounds': 'organic-naming',
  '13-2-characteristic-organic-reactions': 'organic-mechanism',
  '13-4-isomerism-structural-isomerism-and-stereoisomerism': 'isomerism',
  '14-1-alkanes': 'alkane-alkene',
  '14-2-alkenes': 'alkane-alkene',
  '15-1-halogenoalkanes': 'halogenoalkane',
  '16-1-alcohols': 'organic-functional',
  '17-1-aldehydes-and-ketones': 'organic-functional',
  '18-1-carboxylic-acids': 'organic-functional',
  '18-2-esters': 'organic-functional',
  '19-1-primary-amines': 'organic-functional',
  '19-2-nitriles-and-hydroxynitriles': 'nitrogen-chem',
  '20-1-addition-polymerisation': 'polymer',
  '21-1-organic-synthesis': 'organic-synthesis',
  '22-1-infrared-spectroscopy': 'spectroscopy',
  '22-2-mass-spectrometry': 'spectroscopy',
  '23-1-lattice-energy-and-born-haber-cycles': 'born-haber',
  '23-2-enthalpies-of-solution-and-hydration': 'born-haber',
  '23-3-entropy-change-s': 'gibbs-entropy',
  '23-4-gibbs-free-energy-change-g': 'gibbs-entropy',
  '24-1-electrolysis': 'electrochemistry',
  '24-2-standard-electrode-potentials-e-standard-cell-potentials-ecell-and-the-nernst-equation': 'electrochemistry',
  '25-1-acids-and-bases': 'alevel-acids',
  '25-2-partition-coefficients': 'alevel-acids',
  '26-1-simple-rate-equations-orders-of-reaction-and-rate-constants': 'rate-law',
  '26-2-homogeneous-and-heterogeneous-catalysts': 'rate-law',
  '28-1-general-physical-and-chemical-properties-of-the-first-row-of-transition-elements-titanium-to-copper': 'transition-metal',
  '28-2-general-characteristic-chemical-properties-of-the-first-set-of-transition-elements-titanium-to-copper': 'transition-metal',
  '28-3-colour-of-complexes': 'transition-metal',
  '28-4-stereoisomerism-in-transition-element-complexes': 'transition-metal',
  '28-5-stability-constants-kstab': 'transition-metal',
  '29-1-formulas-functional-groups-and-the-naming-of-organic-compounds': 'organic-naming',
  '29-2-characteristic-organic-reactions': 'organic-mechanism',
  '29-4-isomerism-optical': 'isomerism',
  '30-1-arenes': 'arene',
  '31-1-halogen-compounds': 'halogenoalkane',
  '32-1-alcohols': 'organic-functional',
  '32-2-phenol': 'arene',
  '33-1-carboxylic-acids': 'organic-functional',
  '33-2-esters': 'organic-functional',
  '33-3-acyl-chlorides': 'alevel-organic',
  '34-1-primary-and-secondary-amines': 'organic-functional',
  '34-2-phenylamine-and-azo-compounds': 'alevel-organic',
  '34-3-amides': 'alevel-organic',
  '34-4-amino-acids': 'alevel-organic',
  '35-1-condensation-polymerisation': 'polymer',
  '35-2-predicting-the-type-of-polymerisation': 'polymer',
  '35-3-degradable-polymers': 'polymer',
  '36-1-organic-synthesis': 'organic-synthesis',
  '37-1-thin-layer-chromatography': 'spectroscopy',
  '37-2-gas-liquid-chromatography': 'spectroscopy',
  '37-3-carbon-13-nmr-spectroscopy': 'spectroscopy',
  '37-4-proton-h-nmr-spectroscopy': 'spectroscopy',
  '13-3-shapes-of-organic-molecules-and-bonds': 'molecule-shape',
  '27-1-similarities-and-trends-in-the-properties-of-the-group-2-metals-magnesium-to-barium-and-their-compounds': 'group-2',
  '29-3-shapes-of-aromatic-organic-molecules-and-bonds': 'molecule-shape',
}

/** 9709 Pure Maths slug → diagram family. */
const SLUG_FAMILY_9709: Record<string, keyof typeof FAMILIES> = {
  '1-1-quadratics': 'quadratics',
  '1-2-functions': 'functions',
  '1-3-coordinate-geometry': 'coordinate-geometry',
  '1-4-circular-measure': 'trigonometry',
  '1-5-trigonometry': 'trigonometry',
  '1-6-series': 'series',
  '1-7-differentiation': 'differentiation',
  '1-8-integration': 'integration',
  '2-1-algebra': 'functions',
  '2-2-logarithmic-and-exponential-functions': 'log-exp',
  '2-3-trigonometry': 'trigonometry',
  '2-4-differentiation': 'differentiation',
  '2-5-integration': 'integration',
  '2-6-numerical-solution-of-equations': 'numerical-methods',
  '3-1-algebra': 'functions',
  '3-2-logarithmic-and-exponential-functions': 'log-exp',
  '3-3-trigonometry': 'trigonometry',
  '3-4-differentiation': 'differentiation',
  '3-5-integration': 'integration',
  '3-6-numerical-solution-of-equations': 'numerical-methods',
  '3-7-vectors': 'vectors',
  '3-8-differential-equations': 'integration',
  '3-9-complex-numbers': 'complex-numbers',
  '4-1-forces-and-equilibrium': 'free-body',
  '4-2-kinematics-of-motion-in-a-straight-line': 'kinematics',
  '4-3-momentum': 'collision',
  '4-4-newtons-laws-of-motion': 'free-body',
  '4-5-energy-work-and-power': 'energy-transfer',
  '5-1-representation-of-data': 'stats-data',
  '5-2-permutations-and-combinations': 'probability',
  '5-3-probability': 'probability',
  '5-4-discrete-random-variables': 'discrete-stats',
  '5-5-the-normal-distribution': 'normal-stats',
  '6-1-the-poisson-distribution': 'stats-advanced',
  '6-2-linear-combinations-of-random-variables': 'stats-advanced',
  '6-3-continuous-random-variables': 'stats-advanced',
  '6-4-sampling-and-estimation': 'stats-advanced',
  '6-5-hypothesis-tests': 'stats-advanced',
}

/** 9231 Further Maths slugs without 9709 alias target. */
const SLUG_FAMILY_9231: Record<string, keyof typeof FAMILIES> = {
  '1-4-matrices': 'matrices',
  '2-2-matrices': 'matrices',
}

/** 9708 Economics slug → diagram family. */
const SLUG_FAMILY_9708: Record<string, keyof typeof FAMILIES> = {
  '1-1-scarcity-choice-and-opportunity-cost': 'econ-ppc',
  '1-2-economic-methodology': 'econ-ppc',
  '1-3-factors-of-production': 'econ-circular-flow',
  '1-4-resource-allocation-in-different-economic-systems': 'econ-supply-demand',
  '1-5-production-possibility-curves': 'econ-ppc',
  '1-6-classification-of-goods-and-services': 'econ-supply-demand',
  '2-1-demand-and-supply-curves': 'econ-supply-demand',
  '2-2-price-elasticity-income-elasticity-and-cross-elasticity-of-demand': 'econ-elasticity',
  '2-3-price-elasticity-of-supply': 'econ-elasticity',
  '2-4-the-interaction-of-demand-and-supply': 'econ-supply-demand',
  '2-5-consumer-and-producer-surplus': 'econ-supply-demand',
  '3-1-reasons-for-government-intervention-in-markets': 'econ-intervention',
  '3-2-methods-and-effects-of-government-intervention-in-markets': 'econ-intervention',
  '3-3-addressing-income-and-wealth-inequality': 'econ-intervention',
  '4-1-national-income-statistics': 'econ-circular-flow',
  '4-2-introduction-to-the-circular-flow-of-income': 'econ-circular-flow',
  '4-3-aggregate-demand-and-aggregate-supply-analysis': 'econ-macro',
  '4-4-economic-growth': 'econ-macro',
  '4-5-unemployment': 'econ-macro',
  '4-6-price-stability': 'econ-macro',
  '5-1-government-macroeconomic-policy-objectives': 'econ-macro',
  '5-2-fiscal-policy': 'econ-macro',
  '5-3-monetary-policy': 'econ-macro',
  '5-4-supply-side-policy': 'econ-macro',
  '6-1-the-reasons-for-international-trade': 'econ-trade',
  '6-2-protectionism': 'econ-trade',
  '6-3-current-account-of-the-balance-of-payments': 'econ-trade',
  '6-4-exchange-rates': 'econ-trade',
  '6-5-policies-to-correct-imbalances-in-the-current-account-of-the-balance-of-payments': 'econ-trade',
  '7-1-utility': 'econ-utility',
  '7-2-indifference-curves-and-budget-lines': 'econ-utility',
  '7-3-efficiency-and-market-failure': 'econ-intervention',
  '7-4-private-costs-and-benefits-externalities-and-social-costs-and-benefits': 'econ-intervention',
  '7-5-types-of-cost-revenue-and-profit-short-run-and-long-run-production': 'econ-cost-revenue',
  '7-6-different-market-structures': 'econ-market-structure',
  '7-7-growth-and-survival-of-firms': 'econ-market-structure',
  '7-8-differing-objectives-and-policies-of-firms': 'econ-market-structure',
  '8-1-government-policies-to-achieve-efficient-resource-allocation-and-correct-market-failure': 'econ-intervention',
  '8-2-equity-and-redistribution-of-income-and-wealth': 'econ-intervention',
  '8-3-labour-market-forces-and-government-intervention': 'econ-supply-demand',
  '9-1-the-circular-flow-of-income': 'econ-circular-flow',
  '9-2-economic-growth-and-sustainability': 'econ-macro',
  '9-3-employment-unemployment': 'econ-macro',
  '9-4-money-and-banking': 'econ-circular-flow',
  '10-1-government-macroeconomic-policy-objectives': 'econ-macro',
  '10-2-links-between-macroeconomic-problems-and-their-interrelatedness': 'econ-macro',
  '10-3-effectiveness-of-policy-options-to-meet-all-macroeconomic-objectives': 'econ-macro',
  '11-1-policies-to-correct-disequilibrium-in-the-balance-of-payments': 'econ-trade',
  '11-2-exchange-rates': 'econ-trade',
  '11-3-economic-development': 'econ-macro',
  '11-4-characteristics-of-countries-at-different-levels-of-development': 'econ-macro',
  '11-5-relationship-between-countries-at-different-levels-of-development': 'econ-trade',
  '11-6-globalisation': 'econ-trade',
}

/**
 * Business (9609): map each lesson to a per-syllabus-section family so topics get
 * distinct visuals (environment/strategy, HRM, marketing, operations, finance)
 * instead of one shared diagram. Sections 6–10 are the A2 continuations of 1–5.
 */
const BIZ_SECTION_FAMILY: Record<string, keyof typeof FAMILIES> = {
  '1': 'biz-strategy',
  '6': 'biz-strategy',
  '2': 'biz-hrm',
  '7': 'biz-hrm',
  '3': 'biz-marketing',
  '8': 'biz-marketing',
  '4': 'biz-operations',
  '9': 'biz-operations',
  '5': 'biz-finance',
  '10': 'biz-finance',
}
// Specific business subsections with a better-fitting existing diagram than
// their section default (X-Y prefix → family). Takes priority over the section.
const BIZ_SUBSECTION_FAMILY: Record<string, keyof typeof FAMILIES> = {
  '1-5': 'commerce-stakeholder', // business stakeholders
  '5-3': 'commerce-cashflow', // cash flow forecasts
  '5-4': 'commerce-breakeven', // cost information / break-even
  '8-1': 'econ-elasticity', // price elasticity
  '10-1': 'commerce-accounting-statements', // statement of profit or loss
  '10-2': 'commerce-ratios', // liquidity / profitability ratios
  '10-3': 'commerce-investment', // investment appraisal
}
const SLUG_FAMILY_9609_OVERRIDE: Record<string, keyof typeof FAMILIES> = Object.fromEntries(
  Object.keys(SLUG_FAMILY_9609).map((slug) => {
    const sub = slug.match(/^(\d+-\d+)/)?.[1]
    const fam =
      (sub ? BIZ_SUBSECTION_FAMILY[sub] : undefined) ??
      BIZ_SECTION_FAMILY[slug.split('-')[0]!] ??
      'biz-strategy'
    return [slug, fam]
  })
) as Record<string, keyof typeof FAMILIES>

/**
 * Psychology (9990): the Health and Organisational sections each mapped all of
 * their lessons to one family (Health Belief Model / Maslow). Re-map specific
 * subsections to topic-matched diagrams. Scoped to existing psych-* slugs so it
 * never touches law/sociology lessons that share a numeric prefix.
 */
const PSYCH_SUBSECTION_FAMILY: Record<string, keyof typeof FAMILIES> = {
  '3-3': 'psych-pain',
  '3-4': 'psych-stress',
  '4-2': 'psych-leadership',
  '4-3': 'psych-groups',
  '4-4': 'psych-work-env',
  '4-5': 'psych-satisfaction',
}
const SLUG_FAMILY_9990_OVERRIDE: Record<string, keyof typeof FAMILIES> = Object.fromEntries(
  Object.entries(SLUG_FAMILY_COMMERCE_HUMANITIES)
    .filter(([, fam]) => String(fam).startsWith('psych-'))
    .map(([slug]) => {
      const sub = slug.match(/^(\d+-\d+)/)?.[1]
      const target = sub ? PSYCH_SUBSECTION_FAMILY[sub] : undefined
      return target ? ([slug, target] as const) : null
    })
    .filter((e): e is readonly [string, keyof typeof FAMILIES] => e !== null)
)

/**
 * Law (9084): contract remedies (§3-4 — common law damages, equitable remedies)
 * should show the remedies diagram, not the contract-formation one. Scoped to
 * law-* slugs so no other subject is affected.
 */
const SLUG_FAMILY_9084_OVERRIDE: Record<string, keyof typeof FAMILIES> = Object.fromEntries(
  Object.entries(SLUG_FAMILY_COMMERCE_HUMANITIES)
    .filter(([slug, fam]) => String(fam).startsWith('law-') && /^3-4-/.test(slug))
    .map(([slug]) => [slug, 'law-remedies'])
) as Record<string, keyof typeof FAMILIES>

/**
 * IB Biology (SL + HL) → existing diagram families.
 *
 * The coverage audit showed Cambridge lessons at 98% and IB at 1%: ~861 IB
 * lessons rendered with no diagram while their Cambridge equivalents had one.
 * Nothing new is drawn here — these are IB lessons whose core visual is the
 * SAME as a Cambridge one, so the existing family already teaches it.
 *
 * Mapped against what each family actually DEPICTS (its caption), not against
 * the topic name. That distinction removed four entries a name-based pass
 * accepts: `a1-2-nucleic-acids` is about nucleic-acid STRUCTURE while bio-dna
 * depicts semi-conservative REPLICATION; likewise protein synthesis and gene
 * expression are not replication, and `c4-1-populations-and-communities` is not
 * the ~10% trophic-transfer diagram. A wrong diagram teaches the wrong thing
 * with full visual authority, so anything not clearly the same concept is left
 * uncovered on purpose.
 *
 * SL and HL share topic codes for the shared syllabus, so one map serves both.
 */
const SLUG_FAMILY_IB_BIOLOGY: Record<string, keyof typeof FAMILIES> = {
  'a2-2-cell-structure': 'bio-cell',
  'a4-1-evolution-and-speciation': 'bio-evolution',
  'b1-1-carbohydrates-and-lipids': 'bio-molecule',
  'b1-2-proteins': 'bio-molecule',
  'b2-1-membranes-and-membrane-transport': 'bio-membrane',
  'b2-2-organelles-and-compartmentalization': 'bio-cell',
  'b3-1-gas-exchange': 'bio-gas-exchange',
  'c1-1-enzymes-and-metabolism': 'bio-enzyme',
  'c1-2-cell-respiration': 'bio-respiration',
  'c1-3-photosynthesis': 'bio-photosynthesis',
  'c2-2-neural-signalling': 'bio-nervous',
  'c3-2-defence-against-infectious-disease': 'bio-immune',
  'c4-2-transfers-of-energy-and-matter': 'bio-ecology',
  'd1-1-dna-replication': 'bio-dna',
  'd1-3-mutation-and-gene-editing': 'bio-biotech',
  'd2-1-cell-and-nuclear-division': 'bio-mitosis',
  // Water potential in IB is osmosis across the cell membrane, which the fluid
  // mosaic diagram shows directly.
  'd2-3-water-potential': 'bio-membrane',
  'd3-2-inheritance': 'bio-genetics',
  'd3-3-homeostasis': 'bio-homeostasis',
  'd4-1-natural-selection': 'bio-evolution',
}

/**
 * IB Chemistry (SL + HL) → existing families, mapped by what each family
 * DEPICTS, not by the topic name. IB's "Reactivity / Structure" (r/s) codes
 * describe the same chemistry the Cambridge families already draw.
 *
 * Left uncovered on purpose where no family shows the concept: enthalpy cycles
 * (r1-1..1-3), entropy (r1-4), stoichiometry (r2-1), and the particulate-nature
 * intro (s1-1) — none of these is what any existing diagram teaches.
 */
const SLUG_FAMILY_IB_CHEMISTRY: Record<string, keyof typeof FAMILIES> = {
  'r2-2-how-fast-the-rate-of-chemical-change': 'reaction-rate',
  'r2-3-how-far-the-extent-of-chemical-change': 'equilibrium',
  'r3-1-proton-transfer-reactions': 'acids-bases',
  'r3-2-electron-transfer-reactions': 'redox',
  'r3-3-electron-sharing-reactions': 'covalent-bond',
  's1-2-the-nuclear-atom': 'atomic-structure',
  's1-3-electron-configurations': 'electron-config',
  's1-5-ideal-gases': 'gas-kinetic',
  's2-1-the-ionic-model': 'ionic-bond',
  's2-2-the-covalent-model': 'covalent-bond',
  's3-1-the-periodic-table-classification-of-elements': 'periodicity',
  's3-2-functional-groups-classification-of-organic-compounds': 'organic-naming',
}

/**
 * IB Physics (SL + HL) → existing families, mapped by what each family DEPICTS.
 *
 * Uncovered on purpose: relativity (a-5) and greenhouse/thermodynamics topics,
 * which no existing diagram teaches. d-2 combines electric AND magnetic fields
 * in one IB topic; magnetic-field is the better single fit for its core visual.
 * SHM (c-1) is left out: its diagram is a displacement-time oscillation, which
 * progressive-wave (v=fλ propagation) does not show — a near-miss, not a match.
 */
const SLUG_FAMILY_IB_PHYSICS: Record<string, keyof typeof FAMILIES> = {
  'a-1-kinematics': 'kinematics',
  'b-3-gas-laws': 'gas-kinetic',
  'b-5-current-and-circuits': 'series-circuit',
  'c-2-wave-model': 'progressive-wave',
  'c-4-standing-waves-and-resonance': 'stationary-wave',
  'd-1-gravitational-fields': 'gravitational-field',
  'd-2-electric-and-magnetic-fields': 'magnetic-field',
  'e-1-structure-of-the-atom': 'atomic-structure',
  'e-2-quantum-physics': 'photoelectric',
  'e-3-radioactive-decay': 'radioactive-decay',
}

/**
 * IB Maths AA (SL + HL) → existing families. Maths concepts are board-neutral,
 * so the Cambridge families map almost one-to-one; still mapped by caption, not
 * name (e.g. "descriptive statistics" → stats-data, the histogram/spread
 * diagram, not the discrete-stats P(X=x) one).
 *
 * SL and HL share topic numbers on the common core, so one map covers both.
 * Left out: proof (1-5), 3D solids (3-1), Maclaurin/further-calculus HL
 * extensions — no existing diagram depicts them.
 */
const SLUG_FAMILY_IB_MATHS_AA: Record<string, keyof typeof FAMILIES> = {
  '1-1-sequences-and-series-arithmetic-and-geometric': 'series',
  '1-2-exponents-and-logarithms': 'log-exp',
  '1-3-the-binomial-theorem': 'series',
  '1-6-complex-numbers-cartesian-polar-and-euler-form': 'complex-numbers',
  '1-7-complex-numbers-de-moivres-theorem-and-roots': 'complex-numbers',
  '2-1-linear-functions-and-equations-of-straight-lines': 'coordinate-geometry',
  '2-2-functions-domain-range-composite-and-inverse': 'functions',
  '2-3-quadratic-functions-and-equations': 'quadratics',
  '2-6-exponential-and-logarithmic-functions': 'log-exp',
  '3-2-trigonometry-sine-and-cosine-rules': 'trigonometry',
  '3-3-the-unit-circle-and-radian-measure': 'trigonometry',
  '3-4-trigonometric-functions-and-their-graphs': 'trigonometry',
  '3-5-trigonometric-identities-and-equations': 'trigonometry',
  '3-7-vectors-properties-and-operations': 'vectors',
  '3-8-vector-equations-of-lines': 'vectors',
  '3-9-scalar-and-vector-products-planes': 'vectors',
  '4-1-descriptive-statistics': 'stats-data',
  '4-3-probability-venn-diagrams-and-tree-diagrams': 'probability',
  '4-5-the-binomial-distribution': 'discrete-stats',
  '4-6-the-normal-distribution': 'normal-stats',
  '5-1-limits-and-differentiation-from-first-principles': 'differentiation',
  '5-2-differentiation-rules-chain-product-and-quotient': 'differentiation',
  '5-3-tangents-normals-and-the-second-derivative': 'differentiation',
  '5-5-integration-as-antidifferentiation': 'integration',
  '5-6-definite-integrals-areas-and-volumes-of-revolution': 'integration',
}

/**
 * IB Maths AI (SL + HL). AI is application-led, but its statistics, calculus and
 * matrix topics are the same mathematics the Cambridge families already draw, so
 * they map by caption like AA does. Mapped by what each family DEPICTS.
 *
 * Left uncovered on purpose — no family shows the concept: standard form and
 * financial maths (1-1, 1-3), 3D solids and bearings (3-1, 3-3), Voronoi and
 * graph theory (3-4, 3-7, 3-8), correlation/regression scatter and the
 * hypothesis-test topics (4-1, 4-3, 4-8..4-10), logistic/piecewise modelling and
 * data linearization (2-6, 2-7), Euler/slope-field and coupled ODEs (5-8, 5-9),
 * and eigenvalues (1-7) — none is what an existing diagram teaches. 5-7 uses the
 * physics kinematics graph, whose gradient=velocity / area=displacement picture
 * is exactly rates of change.
 */
const SLUG_FAMILY_IB_MATHS_AI: Record<string, keyof typeof FAMILIES> = {
  '1-2-arithmetic-and-geometric-sequences-and-series': 'series',
  '1-4-exponents-and-logarithms': 'log-exp',
  '1-5-systems-of-equations-and-matrix-operations': 'matrices',
  '1-6-matrices-determinants-inverses-and-applications': 'matrices',
  '1-8-complex-numbers-cartesian-and-polar-form-for-applications': 'complex-numbers',
  '2-1-linear-models-and-equations-of-straight-lines': 'coordinate-geometry',
  '2-2-functions-domain-range-inverse-and-graphs': 'functions',
  '2-4-modelling-with-exponential-and-logarithmic-functions': 'log-exp',
  '2-5-modelling-with-sinusoidal-functions': 'trigonometry',
  '3-5-vectors-properties-operations-and-applications': 'vectors',
  '3-6-vector-applications-kinematics-and-motion': 'vectors',
  '4-2-descriptive-statistics': 'stats-data',
  '4-4-probability-venn-diagrams-and-tree-diagrams': 'probability',
  '4-5-discrete-random-variables-and-expected-value': 'discrete-stats',
  '4-6-binomial-and-poisson-distributions': 'discrete-stats',
  '4-7-the-normal-distribution': 'normal-stats',
  '5-1-introduction-to-differentiation-and-rates-of-change': 'differentiation',
  '5-2-differentiation-tangents-normals-and-optimization': 'differentiation',
  '5-3-introduction-to-integration-and-area-under-a-curve': 'integration',
  '5-4-the-trapezoidal-rule-and-numerical-integration': 'integration',
  '5-5-further-differentiation-and-the-second-derivative': 'differentiation',
  '5-7-kinematics-and-related-rates-of-change': 'kinematics',
}

/**
 * IB Business Management + Economics (SL + HL) → existing commerce/econ
 * families. These syllabi teach the same theory as their Cambridge equivalents
 * (9609/9708), so the same diagram carries the concept. Mapped by caption.
 *
 * Business skips the descriptive/definitional lessons (what-is-a-business,
 * types of entity, culture, communication) that have no diagram. Economics
 * skips the methodology intros and the descriptive macro-goal lessons.
 */
const SLUG_FAMILY_IB_BUSINESS: Record<string, keyof typeof FAMILIES> = {
  '1-4-stakeholders': 'commerce-stakeholder',
  '2-2-organizational-structure': 'biz-hrm',
  '3-2-sources-of-finance': 'biz-finance',
  '3-3-costs-and-revenues': 'commerce-accounting-cost',
  '3-4-final-accounts': 'commerce-accounting-statements',
  '3-5-profitability-and-liquidity-ratio-analysis': 'commerce-ratios',
  '3-6-debt-and-efficiency-ratio-analysis': 'commerce-ratios',
  '3-7-cash-flow': 'commerce-cashflow',
  '3-8-investment-appraisal': 'commerce-investment',
  '4-1-introduction-to-marketing': 'biz-marketing',
  '4-5-the-seven-ps-of-the-marketing-mix': 'biz-marketing',
  '5-1-introduction-to-operations-management': 'biz-operations',
  '5-5-break-even-analysis': 'commerce-breakeven',
}

const SLUG_FAMILY_IB_ECONOMICS: Record<string, keyof typeof FAMILIES> = {
  '1-1-scarcity-choice-and-opportunity-cost': 'econ-ppc',
  '2-1-demand-and-the-law-of-demand': 'econ-supply-demand',
  '2-2-supply-and-the-law-of-supply': 'econ-supply-demand',
  '2-3-market-equilibrium-and-the-price-mechanism': 'econ-supply-demand',
  '2-4-price-elasticity-of-demand-and-income-elasticity': 'econ-elasticity',
  '2-5-price-elasticity-of-supply': 'econ-elasticity',
  '2-6-indirect-taxes-and-subsidies': 'econ-intervention',
  '2-7-market-failure-externalities-and-the-environment': 'econ-intervention',
  '2-9-theory-of-the-firm-costs-revenues-and-profit': 'econ-cost-revenue',
  '2-10-market-structures-perfect-competition-and-monopoly': 'econ-market-structure',
  '2-11-market-structures-monopolistic-competition-and-oligopoly': 'econ-market-structure',
  '3-2-aggregate-demand-and-aggregate-supply': 'econ-macro',
  '3-7-demand-side-policies-fiscal-and-monetary-policy': 'econ-macro',
  '4-1-international-trade-and-comparative-advantage': 'econ-trade',
  '4-2-free-trade-and-protectionism': 'econ-trade',
  '4-4-exchange-rates': 'econ-trade',
}

/**
 * IB Psychology (SL + HL) → existing psych-* families (built for Cambridge 9990,
 * which is 100% covered). SL and HL share topic codes, so one map serves both.
 *
 * Mapped by what each family DEPICTS: research design (IV/DV, controls, ethics),
 * the DSM diagnostic-criteria panel, the diathesis-stress etiology model, the
 * biopsychosocial treatment triad, the health-belief model, GAS as a health
 * problem, and Tuckman's group stages.
 *
 * Left uncovered on purpose — no family shows them: the biological (brain,
 * hormones, genetics, animal research) and cognitive topics, cultural/individual
 * -and-group, globalization, all of developmental, and personal relationships /
 * social responsibility. A near-miss would teach the wrong picture with full
 * authority, so those render text-only.
 */
const SLUG_FAMILY_IB_PSYCHOLOGY: Record<string, keyof typeof FAMILIES> = {
  '4-1-research-methods-in-psychology': 'psych-research',
  '4-2-ethics-in-psychological-research': 'psych-research',
  '5-1-abnormal-psychology-factors-influencing-diagnosis': 'psych-clinical-dsm',
  '5-2-abnormal-psychology-etiology-of-disorders': 'psych-clinical-diathesis',
  '5-3-abnormal-psychology-treatment-of-disorders': 'psych-clinical-treatment',
  '6-1-health-psychology-determinants-of-health': 'psych-health',
  '6-2-health-psychology-health-problems': 'psych-stress',
  '6-3-health-psychology-promoting-health': 'psych-health',
  '8-2-human-relationships-group-dynamics': 'psych-groups',
}

/**
 * IB Sports, Exercise & Health Science (SL + HL) → existing bio-* families.
 * Shared topic codes; 5-1 is HL-only. Mapped by depiction: double-circulation
 * for the cardiovascular/respiratory system, aerobic ATP resynthesis in the
 * mitochondria for energy systems, and negative-feedback for endocrine control.
 *
 * Left uncovered: anatomy (no skeleton/muscle diagram), exercise physiology,
 * biomechanics and friction/drag/projectile (a free-body/kinematics near-miss,
 * not the same picture), skill acquisition, measurement, nutrition, and exam
 * technique — nothing existing depicts them.
 */
const SLUG_FAMILY_IB_SEHS: Record<string, keyof typeof FAMILIES> = {
  '1-2-cardiovascular-and-respiratory-systems': 'bio-circulatory',
  '1-3-energy-systems-and-atp-resynthesis': 'bio-respiration',
  '5-1-the-endocrine-system-and-hormonal-regulation': 'bio-homeostasis',
}

/**
 * IB Environmental Systems & Societies (SL) → existing bio-* families. Only the
 * two ecosystem-energy lessons are the same picture as bio-ecology (the ~10%
 * trophic-transfer diagram). Biodiversity/conservation is deliberately left out
 * for the same reason IB Biology left `populations-and-communities` out: it is
 * not the trophic-transfer diagram. Foundations, value systems, water, soil,
 * atmosphere, climate change, human systems and pollution have no family.
 */
const SLUG_FAMILY_IB_ESS: Record<string, keyof typeof FAMILIES> = {
  '2-1-ecosystems-and-ecology': 'bio-ecology',
  '2-2-energy-flow-productivity-and-nutrient-cycles': 'bio-ecology',
}

const SLUG_FAMILY: Record<string, keyof typeof FAMILIES> = {
  ...SLUG_FAMILY_9702,
  ...SLUG_FAMILY_9700,
  ...SLUG_FAMILY_9701,
  ...SLUG_FAMILY_9709,
  ...SLUG_FAMILY_9231,
  ...SLUG_FAMILY_9708,
  ...SLUG_FAMILY_COMMERCE_HUMANITIES,
  ...SLUG_FAMILY_9609_OVERRIDE,
  ...SLUG_FAMILY_9990_OVERRIDE,
  ...SLUG_FAMILY_9084_OVERRIDE,
  ...SLUG_FAMILY_IB_BIOLOGY,
  ...SLUG_FAMILY_IB_CHEMISTRY,
  ...SLUG_FAMILY_IB_PHYSICS,
  ...SLUG_FAMILY_IB_MATHS_AA,
  ...SLUG_FAMILY_IB_MATHS_AI,
  ...SLUG_FAMILY_IB_BUSINESS,
  ...SLUG_FAMILY_IB_ECONOMICS,
  ...SLUG_FAMILY_IB_PSYCHOLOGY,
  ...SLUG_FAMILY_IB_SEHS,
  ...SLUG_FAMILY_IB_ESS,
}

const BIOLOGY_SLUGS = new Set(Object.keys(SLUG_FAMILY_9700))
const MATHS_SLUGS = new Set([...Object.keys(SLUG_FAMILY_9709), ...Object.keys(SLUG_FAMILY_9231)])
const CHEMISTRY_SLUGS = new Set(Object.keys(SLUG_FAMILY_9701))
const COMMERCE_SLUGS = new Set([
  ...Object.keys(SLUG_FAMILY_9706),
  ...Object.keys(SLUG_FAMILY_9609),
])
const ACCOUNTING_SLUGS = new Set(Object.keys(SLUG_FAMILY_9706))
const LAW_SLUGS = new Set(
  Object.entries(SLUG_FAMILY_COMMERCE_HUMANITIES)
    .filter(([, f]) => f.startsWith('law-'))
    .map(([slug]) => slug)
)
const SOCIOLOGY_SLUGS = new Set(
  Object.entries(SLUG_FAMILY_COMMERCE_HUMANITIES)
    .filter(([, f]) => f.startsWith('soc-'))
    .map(([slug]) => slug)
)
const PSYCHOLOGY_SLUGS = new Set(
  Object.entries(SLUG_FAMILY_COMMERCE_HUMANITIES)
    .filter(([, f]) => f.startsWith('psych-'))
    .map(([slug]) => slug)
)
const ECONOMICS_SLUGS = new Set(Object.keys(SLUG_FAMILY_9708))

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
  if (ACCOUNTING_SLUGS.has(slug)) {
    return { source: 'MarkScheme accounting diagram family', license: 'Proprietary' }
  }
  if (COMMERCE_SLUGS.has(slug)) {
    return { source: 'MarkScheme business diagram family', license: 'Proprietary' }
  }
  if (LAW_SLUGS.has(slug)) {
    return { source: 'MarkScheme law diagram family', license: 'Proprietary' }
  }
  if (SOCIOLOGY_SLUGS.has(slug)) {
    return { source: 'MarkScheme sociology diagram family', license: 'Proprietary' }
  }
  if (PSYCHOLOGY_SLUGS.has(slug)) {
    return { source: 'MarkScheme psychology diagram family', license: 'Proprietary' }
  }
  if (ECONOMICS_SLUGS.has(slug)) {
    return { source: 'MarkScheme economics diagram family', license: 'Proprietary' }
  }
  // IB slugs aren't in the Cambridge slug-sets above, so key attribution off the
  // family the slug actually resolves to. Without this they fall through to the
  // Senpai physics URL below — wrong for a biology or psychology diagram.
  const family = SLUG_FAMILY[slug]
  if (family) {
    if (family.startsWith('bio-')) {
      return { source: 'MarkScheme biology diagram family', license: 'Proprietary' }
    }
    if (family.startsWith('psych-')) {
      return { source: 'MarkScheme psychology diagram family', license: 'Proprietary' }
    }
    if (family.startsWith('econ-')) {
      return { source: 'MarkScheme economics diagram family', license: 'Proprietary' }
    }
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
  if (COMMERCE_SLUGS.has(slug)) return ACCOUNTING_SLUGS.has(slug) ? '9706' : '9609'
  if (LAW_SLUGS.has(slug)) return '9084'
  if (SOCIOLOGY_SLUGS.has(slug)) return '9699'
  if (PSYCHOLOGY_SLUGS.has(slug)) return '9990'
  if (ECONOMICS_SLUGS.has(slug)) return '9708'
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
