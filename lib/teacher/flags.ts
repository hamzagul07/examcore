/**
 * Feature flag for the teacher system v2 (docs/TEACHER_SYSTEM_SPEC.md §9).
 *
 * v2 ships ON. `TEACHER_V2=0` is the kill switch: it turns the new teacher
 * nav, pages, assignment hooks in the marking routes and crons back off
 * without a deploy. Any other value — unset included — means on, so a
 * missing variable in a new environment cannot silently hide the product.
 *
 * Read on the server. TEACHER_V2 is not a NEXT_PUBLIC_ variable, so a client
 * component always sees it unset; evaluate this in a server component or
 * route and pass the answer down.
 */
export function isTeacherV2(): boolean {
  // Trimmed because dashboard-pasted env values often carry a stray newline,
  // and "0\n" failing to switch the feature off is the one mistake a kill
  // switch cannot afford.
  return process.env.TEACHER_V2?.trim() !== '0'
}
