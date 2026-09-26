import { studentSetChip, type ChipTone, type StudentAssignment } from '@/lib/student/assignment-state'

const TONE_CLASS: Record<ChipTone, string> = {
  ok: 'ec-chip-ms ec-chip-ms--ok',
  no: 'ec-chip-ms ec-chip-ms--no',
  warn: 'ec-chip-ms ec-chip-ms--warn',
  dim: 'ec-chip-ms ec-chip-ms--dim',
  outline: 'ec-chip-ms ec-chip-ms--outline',
}

/** The one status chip a set carries on the student's list and page (studentSetChip). */
export function SetChip({ set }: { set: Pick<StudentAssignment, 'state' | 'is_late' | 'due_soon' | 'can_hand_in'> }) {
  const chip = studentSetChip(set)
  return <span className={`${TONE_CLASS[chip.tone]} whitespace-nowrap`}>{chip.label}</span>
}
