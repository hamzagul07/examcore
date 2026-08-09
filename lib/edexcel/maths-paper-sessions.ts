/**
 * Back-compat exports — session calendar now covers all IAL modular units.
 * Prefer `@/lib/edexcel/ial-paper-sessions` for new call sites.
 */

export {
  getEdexcelIalSessionsForUnit,
  getEdexcelMathsSessionsForUnit,
  listEdexcelMathsUnitsWithSessions,
  type EdexcelPaperSeason,
  type EdexcelPaperSession,
} from '@/lib/edexcel/ial-paper-sessions'
