export const GENERATOR_VERSION = 'b-v3-pilot-2' as const

export const MAX_GENERATION_RETRIES = 5

export type PilotTuple = {
  paperNumber: string
  topicCode: string
  label: string
}

/** Approved Phase 5 pilot tuples (Prompt B v3) + STEM 9702 maintenance. */
export const PILOT_TUPLES: PilotTuple[] = [
  { paperNumber: '1', topicCode: '2.1', label: 'Kinematics MCQ' },
  { paperNumber: '2', topicCode: '7.1', label: 'Progressive waves' },
  { paperNumber: '2', topicCode: '7.2', label: 'Transverse and longitudinal waves' },
  { paperNumber: '2', topicCode: '8.2', label: 'Diffraction' },
  { paperNumber: '3', topicCode: '1.3', label: 'Practical skills' },
  { paperNumber: '4', topicCode: '25.3', label: 'Cosmology' },
  { paperNumber: '5', topicCode: '1.3', label: 'Planning' },
]
