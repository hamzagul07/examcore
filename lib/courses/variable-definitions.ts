import type { SubjectArea } from '@/lib/courses/subject-area'
import { subjectAreaFromTopicCode } from '@/lib/courses/subject-area'
import {
  describeBusinessLabel,
  isBusinessSubject,
  lookupBusinessTerm,
} from '@/lib/courses/business-variable-definitions'

/** Per-symbol physics definitions — never whole-formula prose */
const DEFAULT_DEFINITIONS: Record<string, string> = {
  p: 'linear momentum, in kg m s⁻¹',
  m: 'mass, in kg',
  v: 'velocity, in m s⁻¹',
  F: 'force, in newtons (N)',
  F_net: 'net force on the object, in newtons (N)',
  F_ext: 'external force, in newtons (N)',
  v_max: 'maximum velocity, in m s⁻¹',
  t: 'time, in seconds (s)',
  T: 'period, in s',
  f: 'frequency, in Hz',
  '\u03bb': 'wavelength, in m',
  Q: 'heat energy, in joules (J)',
  c: 'specific heat capacity, in J kg⁻¹ K⁻¹',
  L: 'specific latent heat, in J kg⁻¹',
  p_f: 'final momentum, in kg m s⁻¹',
  p_i: 'initial momentum, in kg m s⁻¹',
  '\u0394T': 'temperature change, in K or °C',
  '\u0394p': 'change in momentum, in kg m s⁻¹',
  '\u0394t': 'change in time, in seconds',
  '\u0394(mv)': 'change in momentum (mass × velocity), in kg m s⁻¹',
  I: 'intensity',
  'I\u2080': 'initial intensity',
  '\u03b8': 'angle, in degrees or radians',
  a: 'acceleration, in m s⁻²',
  m_tangent: 'gradient of the tangent to the curve',
  m_normal: 'gradient of the normal to the curve (perpendicular to the tangent)',
  dy: 'infinitesimal change in y',
  dx: 'infinitesimal change in x',
  x: 'independent variable',
  y: 'dependent variable',
  R: 'resistance, in ohms (Ω)',
  V: 'potential difference, in volts (V)',
  P: 'power, in watts (W)',
  E: 'energy, in joules (J)',
  E_k: 'kinetic energy, in joules (J)',
  E_p: 'potential energy, in joules (J)',
  KE: 'kinetic energy, in joules (J)',
  PE: 'potential energy, in joules (J)',
  U: 'internal energy or potential energy, in joules (J)',
  g: 'gravitational field strength, in N kg⁻¹',
  B: 'magnetic flux density, in tesla (T)',
  kg: 'kilogram (kg), SI base unit of mass',
  N: 'newton (N), the SI unit of force',
  J: 'joule (J), the SI unit of energy or work',
  s: 'second (s), SI base unit of time',
  A: 'ampere (A), SI base unit of electric current',
  mol: 'mole (mol), SI base unit of amount of substance',
  cd: 'candela (cd), SI base unit of luminous intensity',
  Hz: 'hertz (Hz), unit of frequency (s⁻¹)',
  Pa: 'pascal (Pa), unit of pressure (N m⁻²)',
  W: 'watt (W), unit of power (J s⁻¹)',
  n: 'amount of substance, in moles (mol); or refractive index (dimensionless)',
  d: 'distance or displacement, in m',
  h: 'height, in m; or Planck constant in quantum contexts',
  r: 'radius or distance, in m',
  u: 'initial speed or velocity, in m s⁻¹',
  v_i: 'initial velocity, in m s⁻¹',
  v_f: 'final velocity, in m s⁻¹',
  k: 'spring constant, in N m⁻¹',
  e: 'elementary charge, in coulombs (C)',
  C: 'coulomb (C), unit of electric charge',
  M: 'molar mass, in g mol⁻¹ or kg mol⁻¹',
  rho: 'density, in kg m⁻³',
  '\u03c1': 'density, in kg m⁻³',
  l: 'length, in m',
  D: 'diameter or distance, in m',
  Z: 'impedance, in ohms (Ω)',
  q: 'charge, in coulombs (C)',
  '\u03b5': 'permittivity',
  '\u03b5_0': 'permittivity of free space',
  '\u03bc': 'permeability or micro prefix',
  '\u03c0': 'pi (dimensionless)',
  b: 'y-intercept or constant term',
}

const AREA_OVERRIDES: Partial<Record<SubjectArea, Record<string, string>>> = {
  thermal: {
    T: 'temperature (context-dependent unit — K or °C)',
    T_K: 'temperature in Kelvin',
    T_C: 'temperature in Celsius',
    K: 'absolute temperature, in Kelvin (K)',
    C: 'Celsius temperature, in degrees Celsius (°C)',
    '\u00b0C': 'degrees Celsius — the unit of the Celsius scale',
    c: 'specific heat capacity, in J kg⁻¹ K⁻¹',
    Q: 'heat energy transferred, in joules (J)',
    L: 'specific latent heat, in J kg⁻¹',
    '\u0394T': 'temperature change, in K or °C',
  },
  waves: {
    T: 'period, in seconds (s)',
    f: 'frequency, in Hz',
    '\u03bb': 'wavelength, in m',
    v: 'wave speed, in m s⁻¹',
  },
  mechanics: {
    p: 'linear momentum, in kg m s⁻¹',
    F: 'force, in newtons (N)',
    F_net: 'net force on the object, in newtons (N)',
    a: 'acceleration, in m s⁻²',
    E: 'Young modulus, in Pa (N m⁻²), or energy (J) in other contexts',
  },
  electricity: {
    I: 'current, in amperes (A)',
    V: 'potential difference, in volts (V)',
    R: 'resistance, in ohms (Ω)',
    P: 'electrical power, in watts (W)',
  },
}

export function lookupVariableDefinition(
  symbol: string,
  area: SubjectArea = 'default'
): string {
  const areaTable = area !== 'default' ? AREA_OVERRIDES[area] : undefined
  if (areaTable?.[symbol]) return areaTable[symbol]!
  return DEFAULT_DEFINITIONS[symbol] ?? 'Definition coming soon'
}

export function lookupVariableDefinitionForLesson(
  symbol: string,
  topicCode?: string,
  subjectCode?: string
): string {
  if (topicCode && /^1\.[12]\b/.test(topicCode)) {
    if (symbol === 'm') return 'metre (m), SI base unit of length'
    if (symbol === 'L') return 'length, in m'
  }

  const business = lookupBusinessTerm(symbol, subjectCode)
  if (business) return business

  if (isBusinessSubject(subjectCode) && symbol === 'C') {
    return 'Contribution per unit — selling price minus variable cost (SP − VC)'
  }

  if (isBusinessSubject(subjectCode) && /^[A-Z]{2,5}$/.test(symbol)) {
    const abbr = lookupBusinessTerm(symbol, subjectCode)
    if (abbr) return abbr
  }

  const area = topicCode ? subjectAreaFromTopicCode(topicCode) : 'default'
  const def = lookupVariableDefinition(symbol, area)
  if (def !== 'Definition coming soon') return def

  if (isBusinessSubject(subjectCode) || /[A-Za-z]{3,}/.test(symbol)) {
    return describeBusinessLabel(symbol)
  }

  return def
}

/** @deprecated Use lookupVariableDefinitionForLesson — kept for imports */
export const VARIABLE_DEFINITIONS = DEFAULT_DEFINITIONS
