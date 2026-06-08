import type { SubjectArea } from '@/lib/courses/subject-area'
import { subjectAreaFromTopicCode } from '@/lib/courses/subject-area'

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
  R: 'resistance, in ohms (Ω)',
  V: 'potential difference, in volts (V)',
  P: 'power, in watts (W)',
  E: 'energy, in joules (J)',
  g: 'gravitational field strength, in N kg⁻¹',
  B: 'magnetic flux density, in tesla (T)',
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
  topicCode?: string
): string {
  const area = topicCode ? subjectAreaFromTopicCode(topicCode) : 'default'
  return lookupVariableDefinition(symbol, area)
}

/** @deprecated Use lookupVariableDefinitionForLesson — kept for imports */
export const VARIABLE_DEFINITIONS = DEFAULT_DEFINITIONS
