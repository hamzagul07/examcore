import { buildMarkingPrompt } from '@/lib/marking/build-marking-prompt'
import { markingBoardLabel, isEdexcelSubjectCode } from '@/lib/marking/exam-board'
import { isMathSubjectCode } from '@/lib/marking/math-subjects'
import { listMarkingExamSystems } from '@/lib/exam-systems'
import {
  edexcelMarkHref,
  getEdexcelMarkableUnitCodes,
  isEdexcelMathsUnitCode,
  isEdexcelScienceUnitCode,
  resolveEdexcelMarkingSubjectName,
  resolveEdexcelUnitLabel,
} from '@/lib/edexcel/marking'
import { getEdexcelIalSessionsForUnit } from '@/lib/edexcel/ial-paper-sessions'

let failed = 0
function check(name: string, ok: boolean) {
  if (!ok) {
    failed++
    console.error(`FAIL ${name}`)
  }
}

const units = getEdexcelMarkableUnitCodes()
check('wave-1 maths units', units.includes('WMA11') && units.includes('WST02'))
check('wave-1 physics', units.includes('WPH11') && units.includes('WPH16'))
check('wave-1 chemistry', units.includes('WCH11') && units.includes('WCH16'))
check('biology wave 1.5 markable', units.includes('WBI11') && units.includes('WBI16'))
check('uk a-level maths markable', units.includes('9MA0'))
check('label', resolveEdexcelUnitLabel('WMA11').includes('Pure Mathematics 1'))
check(
  'prompt subject name maths',
  resolveEdexcelMarkingSubjectName('WMA11').includes('International A Level Mathematics')
)
check(
  'prompt subject name physics',
  resolveEdexcelMarkingSubjectName('WPH11').includes('International A Level Physics')
)
check(
  'uk a-level prompt name',
  resolveEdexcelMarkingSubjectName('9MA0').includes('A Level Mathematics') &&
    !resolveEdexcelMarkingSubjectName('9MA0').includes('International')
)

check('isEdexcelSubjectCode WMA11', isEdexcelSubjectCode('WMA11'))
check('isEdexcelSubjectCode WPH11', isEdexcelSubjectCode('WPH11'))
check('not edexcel 9709', !isEdexcelSubjectCode('9709'))
check('math OCR path for WMA11', isMathSubjectCode('WMA11'))
check('math OCR path for WME01', isMathSubjectCode('WME01'))
check('no math OCR for WPH11', !isMathSubjectCode('WPH11'))
check('no math OCR for WCH11', !isMathSubjectCode('WCH11'))
check('science helper WPH', isEdexcelScienceUnitCode('WPH14'))
check('science helper WBI', isEdexcelScienceUnitCode('WBI11'))
check('maths helper WMA', isEdexcelMathsUnitCode('WMA11'))
check('marking board label', markingBoardLabel('WMA11') === 'Edexcel')
check('cambridge label unchanged', markingBoardLabel('9709') === 'Cambridge')

const markingIds = listMarkingExamSystems().map((s) => s.id)
check('edexcel in marking picker', markingIds.includes('edexcel'))
check('cambridge still marking', markingIds.includes('cambridge'))
check('mark href WMA11', edexcelMarkHref('WMA11') === '/mark?board=edexcel&subject=WMA11')
check('mark href physics deep-links', edexcelMarkHref('WPH11') === '/mark?board=edexcel&subject=WPH11')
check('mark href chem deep-links', edexcelMarkHref('WCH11') === '/mark?board=edexcel&subject=WCH11')
check('mark href bio deep-links', edexcelMarkHref('WBI11') === '/mark?board=edexcel&subject=WBI11')
check('mark href empty', edexcelMarkHref() === '/mark?board=edexcel')

check('IAL sessions for WMA11', getEdexcelIalSessionsForUnit('WMA11').length > 0)
check('IAL sessions for WPH11', getEdexcelIalSessionsForUnit('WPH11').length > 0)
check('IAL sessions for WBI11', getEdexcelIalSessionsForUnit('WBI11').length > 0)
check('no IAL sessions for UK 9MA0', getEdexcelIalSessionsForUnit('9MA0').length === 0)

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

const sciencePrompt = buildMarkingPrompt({
  markScheme: null,
  markingStyle: 'point_based',
  ocrText: 'F = 12 N',
  questionText: 'Calculate the resultant force. [3]',
  subjectName: 'Physics',
  subjectCode: 'WPH11',
  isOfficial: false,
  questionTotalMarks: 3,
})
check('science prompt names Edexcel', /Edexcel/i.test(sciencePrompt))
check('science prompt mentions units or SF', /significant figures|units|working/i.test(sciencePrompt))

const bioPrompt = buildMarkingPrompt({
  markScheme: null,
  markingStyle: 'point_based',
  ocrText: 'Enzymes lower activation energy',
  questionText: 'Explain how enzymes work. [3]',
  subjectName: 'Biology',
  subjectCode: 'WBI11',
  isOfficial: false,
  questionTotalMarks: 3,
})
check('biology prompt names Edexcel', /Edexcel/i.test(bioPrompt))
check('biology prompt phrase matching', /phrase-level|semantic/i.test(bioPrompt))

if (failed > 0) process.exit(1)
console.log(`edexcel/marking.test.ts: all checks passed (${units.length} markable units)`)
