/**
 * Marks the student's own preview of their share link: `/p/<token>?preview=1`.
 *
 * Added by the "see what they'll see" link and read by the view tracker, so a
 * student checking their own report is not counted as a parent opening it.
 * Nothing on the page reads it — the report renders identically either way.
 *
 * Its own module, with no imports, because both readers are client components.
 * `lib/reports/parent-report.ts` pulls in the mastery, prediction and syllabus
 * trees; importing a constant from there would ship all of it to the browser.
 */
export const PREVIEW_PARAM = 'preview'
