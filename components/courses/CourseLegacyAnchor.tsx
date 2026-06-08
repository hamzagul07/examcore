/** Invisible scroll target so legacy #learn-* URLs still land on the right section. */
export function CourseLegacyAnchor({ id }: { id: string }) {
  return <span id={id} className="course-legacy-anchor scroll-mt-28" tabIndex={-1} aria-hidden />
}
