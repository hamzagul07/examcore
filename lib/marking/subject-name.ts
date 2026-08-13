import { resolveSubjectLabel } from '@/lib/ib/marking-config'
import {
  resolveEdexcelMarkingSubjectName,
  getEdexcelUnitMeta,
} from '@/lib/edexcel/marking'
import { SUBJECT_CODE_MAP } from '@/lib/profile-options'

/**
 * Human subject name for a bare subject code, across all three boards.
 *
 * Lives in its own leaf module rather than beside the marking pipeline because
 * the pipeline builds a Supabase client at import time — anything that only
 * wants a subject name (an email, a subject line, a notification) should not
 * have to pay for that.
 *
 * The order matters: Edexcel unit codes first, then IB, then the Cambridge map.
 * `resolveSubjectLabel` hands back unknown codes unchanged, so checking it
 * against its own input is how we tell "IB knows this" from "IB does not".
 */
export function resolveMarkingSubjectName(
  subjectCode: string | null | undefined
): string {
  const code = subjectCode?.trim()
  if (!code) return 'A-Level'
  if (getEdexcelUnitMeta(code)) return resolveEdexcelMarkingSubjectName(code)
  const ibLabel = resolveSubjectLabel(code)
  if (ibLabel !== code) return ibLabel
  const twinLabel = ibLabelFromLevelTwin(code)
  if (twinLabel) return twinLabel
  return SUBJECT_CODE_MAP[code] || code
}

/**
 * Name an IB code whose own level has no marking profile, by asking its twin.
 *
 * Five subjects — both Maths courses, Business Management, Psychology and
 * Computer Science — carry an HL profile with no SL counterpart. Without this,
 * an SL student's mark is built with `subjectName = "ib-maths-ai-sl"`, and that
 * string goes into the marking prompt as the subject the examiner is marking.
 *
 * Deliberately NAME ONLY. It must never be used to borrow the twin's profile:
 * SL and HL differ in criteria and mark maxima, so marking an SL answer against
 * HL descriptors would be a worse bug than the one it fixes. The missing SL
 * profiles are a real gap and want authoring, not aliasing.
 */
function ibLabelFromLevelTwin(code: string): string | null {
  if (!code.startsWith('ib-')) return null
  const twin = code.endsWith('-sl')
    ? `${code.slice(0, -3)}-hl`
    : code.endsWith('-hl')
      ? `${code.slice(0, -3)}-sl`
      : null
  if (!twin) return null
  const label = resolveSubjectLabel(twin)
  return label !== twin ? label : null
}

/**
 * The same name, but null when all we could produce was the bare code.
 *
 * For prose and subject lines, where "9708" is worse than saying nothing. The
 * first cut of the mark-ready email used `resolveSubjectLabel` alone, which
 * knows IB codes and returns Cambridge codes untouched — so every Cambridge
 * mark, the bulk of the traffic, silently lost its subject name.
 */
export function namedSubjectOrNull(
  subjectCode: string | null | undefined
): string | null {
  const code = subjectCode?.trim()
  if (!code) return null
  const name = resolveMarkingSubjectName(code)
  return name && name !== code ? name : null
}
