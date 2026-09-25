import assert from 'node:assert/strict'
import { displayName, resolveClassroomSubjectCode } from '@/lib/teacher/subject'
import { getSyllabusSubjectCodes } from '@/lib/syllabi'
import { SUBJECTS } from '@/lib/profile-options'

const CIE = 'Cambridge International'

function eq(board: string, level: string, subject: string, expected: string | null, why: string) {
  assert.equal(resolveClassroomSubjectCode(board, level, subject), expected, `${why} (${board} / ${level} / ${subject})`)
}

// --- Cambridge ----------------------------------------------------------------------

eq(CIE, 'A-Level', 'Mathematics', '9709', 'the legacy default classroom')
eq(CIE, 'AS Level', 'Mathematics', '9709', 'AS shares the A-Level syllabus')
eq(CIE, 'A-Level', 'Chemistry', '9701', 'by display name')
eq(CIE, 'A-Level', 'Further Mathematics', '9231', 'multi-word names')
eq(CIE, 'O-Level', 'Economics', '2281', 'the level picks the O-Level code')
eq(CIE, 'O-Level', 'Business Studies', '7115', 'O-Level only subject')
eq(CIE, 'a level', '  chemistry ', '9701', 'case and spacing are forgiven')
eq(CIE, 'A Level', 'Physics', '9702', 'level spelt without the hyphen')
eq('', 'A-Level', 'Biology', '9700', 'empty board is the column default (Cambridge)')
eq('CAIE', 'A-Level', 'Computer Science', '9618', 'Cambridge board aliases')
eq(CIE, 'A-Level', '9701', '9701', 'a bare syllabus code is taken as-is')

// --- Cambridge: null rather than a guess ---------------------------------------------------

eq(CIE, '', 'Mathematics', null, 'no level: 9709 or 4024 — ambiguous')
eq(CIE, 'IGCSE', 'Mathematics', null, 'an unrecognised level must not fall through to A-Level')
eq(CIE, 'O-Level', 'Mathematics', null, '4024 has no syllabus tree in the registry')
eq(CIE, 'A-Level', 'Literature in English', null, '9695 has no syllabus tree')
eq(CIE, 'A-Level', '4024', null, 'a code with no tree')
eq(CIE, 'A-Level', 'Astrology', null, 'unknown subject')
eq(CIE, 'A-Level', '', null, 'blank subject')
eq(CIE, 'A-Level', '   ', null, 'whitespace subject')
eq('Edexcel', 'A-Level', 'Mathematics', null, 'another board never borrows a Cambridge code')
eq('Edexcel', 'A-Level', 'WMA11', null, 'Edexcel units have no registry tree')
eq('AQA', 'A-Level', 'aqa-mathematics', null, 'AQA content codes have no registry tree')
eq('Edexcel', 'A-Level', '9701', null, 'a Cambridge code on a non-Cambridge board contradicts itself')

// --- IB -------------------------------------------------------------------------------------

eq('IB', 'IB Diploma', 'ib-chemistry-hl', 'ib-chemistry-hl', 'IB rows store the code')
eq('IB', 'IB Diploma', 'IB-Chemistry-HL', 'ib-chemistry-hl', 'code casing is forgiven')
eq('IB', 'IB Diploma', 'Chemistry HL', 'ib-chemistry-hl', 'older rows store the label')
eq('IB', 'IB Diploma', 'Mathematics: Analysis and Approaches SL', 'ib-maths-aa-sl', 'label with punctuation')
eq('IB', 'IB Diploma', 'Theory of Knowledge', 'ib-tok', 'a core subject has one code')
eq('IB', '', 'ib-maths-aa-sl', 'ib-maths-aa-sl', 'level not needed with a code')
eq('IB', 'A-Level', 'ib-physics-sl', 'ib-physics-sl', 'the defaulted level does not override an IB code')
eq(CIE, 'A-Level', 'ib-physics-sl', 'ib-physics-sl', 'nor does the defaulted board')
eq('', 'IB Diploma', 'Biology SL', 'ib-biology-sl', 'IB level with the board left at its default')
eq('IB', 'IB Diploma', 'ib-design-technology-hl', 'ib-design-technology-hl', 'registry codes without a marking profile still resolve')

eq('IB', 'IB Diploma', 'Chemistry', null, 'HL or SL? ambiguous')
eq('IB', 'IB Diploma', 'ib-chemistry', null, 'not a registry code')
eq('IB', 'IB Diploma', '9701', null, 'a Cambridge code in an IB class')
eq('Edexcel', 'A-Level', 'ib-physics-sl', null, 'an IB code on a chosen non-IB board contradicts itself')
eq('Edexcel', 'IB Diploma', 'Chemistry HL', null, 'IB level on a chosen non-IB board contradicts itself')

// --- every answer is a registry key -----------------------------------------------------------

{
  const registry = new Set(getSyllabusSubjectCodes())
  for (const o of SUBJECTS) {
    for (const lvl of o.levels) {
      const code = resolveClassroomSubjectCode(CIE, lvl, o.id)
      if (code !== null) {
        assert.ok(registry.has(code), `${o.id} @ ${lvl} resolved to ${code}, which has no syllabus tree`)
        assert.equal(code, o.code, `${o.id} @ ${lvl} must resolve to its own code`)
      }
    }
  }
}

// --- displayName (re-exported here; full cases in display-name.test.ts) ----------------------

assert.equal(displayName('Amira Khan'), 'Amira K.')
assert.equal(displayName(null), 'Student')

console.log('subject.test.ts — all assertions passed')
