import type { PilotTuple } from './constants'

export type StemPilotTarget = PilotTuple & {
  subjectCode: string
  promoteStatus?: 'pilot' | 'premium'
}

/** STEM batch generation phases (9702 only has Supabase evidence today). */
export const STEM_PILOT_PHASES: Record<string, StemPilotTarget[]> = {
  reference: [
    { subjectCode: '9702', paperNumber: '4', topicCode: '22.2', label: 'Photoelectric (template)' },
  ],
  chem: [],
  maths: [],
  cs: [],
  physics: [
    { subjectCode: '9702', paperNumber: '2', topicCode: '7.2', label: 'Transverse and longitudinal waves' },
    { subjectCode: '9702', paperNumber: '2', topicCode: '8.2', label: 'Diffraction' },
  ],
  biology: [],
}
