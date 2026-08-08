import {
  EDEXCEL_BOARD_ID,
  EDEXCEL_SUBJECT_OPTIONS,
  defaultMarkSubjectCode,
  defaultSubjectsForProfile,
  isEdexcelBoard,
  isSubjectValidForProfile,
  levelsForBoard,
  getSubjectById,
} from '@/lib/profile-options'
import { profileBoardFromFunnelBoard } from '@/lib/analytics/funnel'

let failed = 0
function check(name: string, ok: boolean) {
  if (!ok) {
    failed++
    console.error(`FAIL ${name}`)
  }
}

check('edexcel board id', isEdexcelBoard(EDEXCEL_BOARD_ID))
check('wave-1 units in options', EDEXCEL_SUBJECT_OPTIONS.some((s) => s.id === 'WMA11'))
check('no physics units yet', !EDEXCEL_SUBJECT_OPTIONS.some((s) => s.id === 'WPH11'))
check(
  'WMA11 valid for Edexcel A-Level',
  isSubjectValidForProfile('Edexcel', 'A-Level', 'WMA11')
)
check(
  'Cambridge Maths invalid on Edexcel',
  !isSubjectValidForProfile('Edexcel', 'A-Level', 'Mathematics')
)
check(
  'WMA11 invalid on Cambridge',
  !isSubjectValidForProfile('Cambridge International', 'A-Level', 'WMA11')
)
check(
  'levels are AS + A-Level only',
  levelsForBoard('Edexcel')
    .map((l) => l.id)
    .join(',') === 'AS Level,A-Level'
)
check('default subjects', defaultSubjectsForProfile('Edexcel', 'A-Level')[0] === 'WMA11')
check('default mark code', defaultMarkSubjectCode('A-Level', 'Edexcel') === 'WMA11')
check('getSubjectById WMA11', getSubjectById('WMA11')?.code === 'WMA11')
check('funnel → profile', profileBoardFromFunnelBoard('edexcel') === 'Edexcel')

if (failed > 0) process.exit(1)
console.log(
  `profile-options-edexcel.test.ts: all checks passed (${EDEXCEL_SUBJECT_OPTIONS.length} units)`
)
