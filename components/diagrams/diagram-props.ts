/** Shared props for lesson SVG diagrams (step-sync + live parameters). */
export type LessonDiagramComponentProps = {
  className?: string
  /** Active walkthrough step — dims non-focused layers when set. */
  stepIndex?: number
  /** Live parameter values keyed by spec id (e.g. M, r, T). */
  params?: Record<string, number>
  /** Lesson slug — resolves diagram-spec layers (family diagrams share components). */
  lessonSlug?: string
}
