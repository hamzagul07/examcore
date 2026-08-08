import { buildMarkingPrompt } from '@/lib/marking/build-marking-prompt'
import { markingBoardLabel, isEdexcelSubjectCode } from '@/lib/marking/exam-board'
import { isMathSubjectCode } from '@/lib/marking/math-subjects'
import { listMarkingExamSystems } from '@/lib/exam-systems'
import {
  getEdexcelMarkableUnitCodes,
  resolveEdexcelMarkingSubjectName,
  resolveEdexcelUnitLabel,
} from '@/lib/edexcel/marking'

let failed = 0
function check(name: string, ok: boolean) {
  if (!ok) {
    failed++
    console.error(`FAIL ${name}`)
  }
}

const units = getEdexcelMarkableUnitCodes()
check('wave-1 maths units only', units.includes('WMA11') && units.includes('WST02'))
check('no physics in markable wave-1', !units.includes('WPH11'))
check('label', resolveEdexcelUnitLabel('WMA11').includes('Pure Mathematics 1'))
check(
  'prompt subject name',
  resolveEdexcelMarkingSubjectName('WMA11').includes('International A Level Mathematics')
)

check('isEdexcelSubjectCode WMA11', isEdexcelSubjectCode('WMA11'))
check('not edexcel 9709', !isEdexcelSubjectCode('9709'))
check('math OCR path for WMA11', isMathSubjectCode('WMA11'))
check('math OCR path for WME01', isMathSubjectCode('WME01'))
check('marking board label', markingBoardLabel('WMA11') === 'Edexcel')
check('cambridge label unchanged', markingBoardLabel('9709') === 'Cambridge')

const markingIds = listMarkingExamSystems().map((s) => s.id)
check('edexcel in marking picker', markingIds.includes('edexcel'))
check('cambridge still marking', markingIds.includes('cambridge'))

const prompt = buildMarkingPrompt({
  markScheme: null,
  markingStyle: 'point_based',
  ocrText: 'x = 2',
  questionText: 'Solve x^2 = 4. [2]',
  subjectName: 'Mathematics',
  subjectCode: 'WMA11',
  isOfficial: false,
  questionTotalMarks: 2,
})
check('prompt names Edexcel', /Edexcel/i.test(prompt))
check('prompt does not say Cambridge examiner for WMA11', !/Cambridge International/i.test(prompt))
check('prompt keeps M/A language', /method|accuracy|M marks/i.test(prompt))

if (failed > 0) process.exit(1)
console.log(`edexcel/marking.test.ts: all checks passed (${units.length} markable units)`)
