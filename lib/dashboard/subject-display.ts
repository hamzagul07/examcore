import { getSubjectByCode } from '@/lib/profile-options'
import { getSyllabusSubjectName } from '@/lib/syllabi'

/**
 * Map a syllabus / paper code to a human-readable subject name.
 * Falls back to the raw code when lookup fails — never returns undefined.
 */
export function displaySubjectName(code: string | null | undefined): string | null {
  if (!code) return null
  const trimmed = code.trim()
  if (!trimmed) return null

  return (
    getSyllabusSubjectName(trimmed) ??
    getSubjectByCode(trimmed)?.label ??
    trimmed
  )
}
