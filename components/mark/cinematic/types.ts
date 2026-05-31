/**
 * Shared contracts for the Sprint 46 cinematic marking experience.
 *
 * The orchestrator (CinematicMarkingExperience) drives a phase machine and
 * feeds these typed props into the three self-contained visual modules:
 *   A — KineticField           (background motion)
 *   B — HandwritingAnalysisOverlay (reading viz)
 *   C — ExaminerHandReveal      (red-ink climax)
 */

/** Visual energy of the kinetic field, mapped from SSE marking stages. */
export type CinematicIntensity = 'calm' | 'reading' | 'marking' | 'climax'

/** High-level choreography phases owned by the orchestrator. */
export type CinematicPhase =
  | 'transform' // 0-300ms: surface swap, image scales in
  | 'reading' // handwriting analysis sweep
  | 'analyzing' // finding scheme + marking; educational content + field peak
  | 'buildup' // result ready: anticipation, image enlarges, field surges
  | 'climax' // examiner's hand draws ink
  | 'reveal' // hand off to the real results page

/**
 * A single simulated examiner ink stroke for the climax.
 *
 * Positions are percentages of the rendered image box (0-100) so they scale
 * with any aspect ratio. When real Gemini bboxes are available the orchestrator
 * derives these from them so the dissolve into the real overlay is seamless;
 * otherwise plausible fallback positions are used.
 */
export type SimulatedMark =
  | { id: string; kind: 'tick'; xPct: number; yPct: number; sizePct?: number }
  | {
      id: string
      kind: 'underline'
      xPct: number
      yPct: number
      widthPct: number
    }
  | { id: string; kind: 'curl'; xPct: number; yPct: number; sizePct?: number }
  | { id: string; kind: 'note'; xPct: number; yPct: number; text: string }
