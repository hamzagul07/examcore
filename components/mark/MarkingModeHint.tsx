'use client'

import type { MarkExamBoard } from '@/components/mark/MarkBoardPicker'
import { getExamSystem } from '@/lib/exam-systems'

type Props = {
  mode: 'official' | 'general' | 'practice' | 'missing_paper' | 'combined'
  markBoard?: MarkExamBoard
}

function boardShort(board: MarkExamBoard): string {
  if (board === 'ib') return 'IB'
  if (board === 'edexcel') return 'Edexcel'
  if (board === 'cambridge') return 'Cambridge'
  if (board === 'ap') return 'AP'
  return getExamSystem(board).label
}

function officialBody(board: MarkExamBoard): string {
  switch (board) {
    case 'ib':
      return 'We found this question in our database — marking uses IB assessment criteria and markbands.'
    case 'edexcel':
      return 'We found this question in our database — marking uses Edexcel IAL M/A conventions.'
    case 'oxfordaqa':
      return 'We found this question in our database — marking uses OxfordAQA point/method conventions.'
    case 'aqa':
      return 'We found this question in our database — marking uses AQA method/accuracy conventions.'
    case 'ap':
      return 'We found this question in our database — marking uses AP free-response point conventions.'
    default:
      return 'We found this question in our database — marking uses the exact Cambridge criteria (B1, M1, A1, bands).'
  }
}

function missingBody(board: MarkExamBoard): string {
  const label = boardShort(board)
  if (board === 'ib') {
    return 'This session is not cached yet — we mark with IB criterion conventions. Add a question photo or PDF for better accuracy.'
  }
  if (board === 'edexcel') {
    return 'This session is not cached yet — we mark with Edexcel IAL conventions. Add a question photo or PDF for better accuracy.'
  }
  return `This session is not cached yet — we mark with general ${label} conventions. Add a question photo or PDF for better accuracy.`
}

function practiceBody(board: MarkExamBoard): string {
  switch (board) {
    case 'ib':
      return 'Marked band-by-band against IB assessment criteria for your subject — not an official past-paper lookup.'
    case 'edexcel':
      return 'Marked with Edexcel IAL method/accuracy conventions for your unit — not an official past-paper scheme.'
    case 'oxfordaqa':
      return 'Marked with OxfordAQA point/method conventions for your subject — not an official past-paper scheme.'
    case 'aqa':
      return 'Marked with AQA method/accuracy conventions for your subject — not an official past-paper scheme.'
    case 'ap':
      return 'Marked with AP free-response point conventions for your course — not an official FRQ scoring guideline lookup.'
    default:
      return 'Marked with Cambridge-style conventions for your subject — not an official past-paper scheme.'
  }
}

function combinedBody(board: MarkExamBoard): string {
  switch (board) {
    case 'ib':
      return 'We read the question and your working from the same upload, then mark band-by-band against IB criteria.'
    case 'edexcel':
      return 'We split the question from your working on the same page or PDF, then mark with Edexcel IAL conventions.'
    default:
      return `We split the question from your working on the same page or PDF, then mark with ${boardShort(board)} conventions.`
  }
}

function generalBody(board: MarkExamBoard): string {
  switch (board) {
    case 'ib':
      return 'Select your IB subject and add the question text, photo, or PDF — we mark against criterion bands.'
    case 'edexcel':
      return 'Select your IAL Maths, Physics, Chemistry or Biology unit and add the question — we derive an Edexcel-style scheme and mark your working.'
    case 'oxfordaqa':
      return 'Select your OxfordAQA subject and add the question — we derive a point/method scheme and mark your working.'
    case 'aqa':
      return 'Select your AQA subject and add the question — we derive a method/accuracy scheme and mark your working.'
    case 'ap':
      return 'Select your AP course and add the free-response question — we mark with earned-point conventions.'
    default:
      return 'Select the paper above for official marking, or add the question text — we will detect the paper from your script if possible.'
  }
}

export function MarkingModeHint({ mode, markBoard = 'cambridge' }: Props) {
  const copy =
    mode === 'official'
      ? { title: 'Official mark scheme', body: officialBody(markBoard) }
      : mode === 'missing_paper'
        ? { title: 'Paper not in database', body: missingBody(markBoard) }
        : mode === 'practice'
          ? { title: 'Your own question', body: practiceBody(markBoard) }
          : mode === 'combined'
            ? {
                title: 'Question + answer on one scan',
                body: combinedBody(markBoard),
              }
            : { title: 'Auto-detect mode', body: generalBody(markBoard) }

  return (
    <div className="ms-marking-mode-hint" role="note">
      <p className="ms-marking-mode-hint-title">{copy.title}</p>
      <p className="ms-marking-mode-hint-body">{copy.body}</p>
    </div>
  )
}
