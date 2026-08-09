import type { ExamSystemId } from '@/lib/exam-systems'
import { getEdexcelMarkableUnitCodes } from '@/lib/edexcel/marking'
import { getOxfordaqaMarkableContentCodes } from '@/lib/oxfordaqa/marking'
import { getAqaMarkableContentCodes } from '@/lib/aqa/marking'
import { getApMarkableContentCodes } from '@/lib/ap/marking'

/** Subject / unit codes shown in the /mark picker for a given board. */
export function markableCodesForBoard(board: ExamSystemId): string[] | null {
  if (board === 'edexcel') return getEdexcelMarkableUnitCodes()
  if (board === 'oxfordaqa') return getOxfordaqaMarkableContentCodes()
  if (board === 'aqa') return getAqaMarkableContentCodes()
  if (board === 'ap') return getApMarkableContentCodes()
  return null
}
