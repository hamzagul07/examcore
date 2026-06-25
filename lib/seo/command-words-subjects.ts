/** Per-syllabus command-word emphasis — powers programmatic /tools/command-words/[code] pages. */

export type CommandWordsMarkingStyle = 'point' | 'bands' | 'mixed'

export type CommandWordsSubjectProfile = {
  markingStyle: CommandWordsMarkingStyle
  emphasis: string
  topVerbs: string[]
  paperNote: string
}

const DEFAULT: CommandWordsSubjectProfile = {
  markingStyle: 'mixed',
  emphasis: 'Circle the command word before you plan — depth beats length.',
  topVerbs: ['Explain', 'Describe', 'Calculate', 'Evaluate'],
  paperNote: 'Command words set the depth of every response on this syllabus.',
}

const PROFILES: Record<string, CommandWordsSubjectProfile> = {
  '9709': {
    markingStyle: 'point',
    emphasis:
      '9709 rewards method marks (M1) and accuracy (A1) — show working for Calculate and prove every step for Show that.',
    topVerbs: ['Calculate', 'Show that', 'Hence', 'Find', 'Solve'],
    paperNote:
      'Pure, Mechanics and Statistics papers all use point-mark schemes — command words tell you how much working to show.',
  },
  '9702': {
    markingStyle: 'point',
    emphasis:
      'Physics mixes recall (Define, State) with quantitative verbs (Calculate, Determine) — units and significant figures matter on every calculation.',
    topVerbs: ['Explain', 'Describe', 'Calculate', 'Suggest', 'Show that'],
    paperNote: 'Structured papers use Explain and Describe heavily; MCQ papers test recall verbs implicitly.',
  },
  '9701': {
    markingStyle: 'point',
    emphasis:
      'Chemistry Define and State questions need precise syllabus wording; mechanism arrows and state symbols count on Explain responses.',
    topVerbs: ['Explain', 'Define', 'Calculate', 'Describe', 'Suggest'],
    paperNote: 'Organic mechanisms are often Explain or Describe — draw curly arrows when the scheme expects them.',
  },
  '9700': {
    markingStyle: 'point',
    emphasis:
      'Biology keyword point marks — Define and Describe must use acceptable terminology from the mark scheme.',
    topVerbs: ['Explain', 'Describe', 'Define', 'Suggest', 'Compare'],
    paperNote: 'Essay-style bands appear on some A2 questions — still read the command word first.',
  },
  '9708': {
    markingStyle: 'bands',
    emphasis:
      'Economics essays live in level-of-response bands — Discuss and Evaluate need analysis plus a supported judgement.',
    topVerbs: ['Evaluate', 'Discuss', 'Analyse', 'Explain', 'Assess'],
    paperNote: 'Data-response papers mix point marks (definitions) with banded essay verbs.',
  },
  '9609': {
    markingStyle: 'bands',
    emphasis:
      'Business case papers reward application — every Discuss or Evaluate must reference the stimulus business by name.',
    topVerbs: ['Evaluate', 'Discuss', 'Analyse', 'Recommend', 'Assess'],
    paperNote: 'Case-study command words fail when answers ignore the named company or scenario.',
  },
  '9990': {
    markingStyle: 'bands',
    emphasis:
      'Psychology requires named studies and methodology critique — Outline studies, then Evaluate with evidence.',
    topVerbs: ['Evaluate', 'Discuss', 'Outline', 'Explain', 'Compare'],
    paperNote: 'Short-tariff Define/Outline questions fund time for high-mark Evaluate essays.',
  },
  '9489': {
    markingStyle: 'bands',
    emphasis:
      'History essays need specific evidence and historiography — Discuss and Assess demand a sustained argument, not narrative.',
    topVerbs: ['Assess', 'Discuss', 'Evaluate', 'Explain', 'Compare'],
    paperNote: 'Document questions use own-knowledge verbs — still match depth to the tariff.',
  },
  '9706': {
    markingStyle: 'point',
    emphasis:
      'Accounting Calculate and Prepare questions need labelled layouts — format marks are as important as the final figure.',
    topVerbs: ['Calculate', 'Prepare', 'Explain', 'Advise', 'Evaluate'],
    paperNote: 'Ledgers and statements must balance — working marks reward clear double-entry method.',
  },
  '4024': {
    markingStyle: 'point',
    emphasis:
      'O-Level Maths Calculate questions need every line of working — method marks rescue wrong finals.',
    topVerbs: ['Calculate', 'Solve', 'Show that', 'Find', 'Factorise'],
    paperNote: 'Non-calculator and calculator papers both punish skipped algebra steps.',
  },
  '4037': {
    markingStyle: 'point',
    emphasis:
      'Additional Mathematics uses chained reasoning — Hence and Show that link questions; never skip a step.',
    topVerbs: ['Show that', 'Hence', 'Solve', 'Prove', 'Find'],
    paperNote: 'Proof-style verbs appear more often than in standard 4024.',
  },
  '5090': {
    markingStyle: 'point',
    emphasis:
      'O-Level Biology Define and State need exact syllabus terms — Describe and Explain must name processes precisely.',
    topVerbs: ['Define', 'Explain', 'Describe', 'Suggest', 'State'],
    paperNote: 'Practical papers use observation verbs — record what you see, then explain.',
  },
  '5070': {
    markingStyle: 'point',
    emphasis:
      'Chemistry equations and state symbols are non-negotiable on Explain and Calculate responses.',
    topVerbs: ['Explain', 'Calculate', 'Define', 'Describe', 'Suggest'],
    paperNote: 'Qualitative analysis questions often use Suggest for unknown ions.',
  },
  '5054': {
    markingStyle: 'point',
    emphasis:
      'Physics calculations need formula, substitution, unit — Describe graph shapes before Explain asks why.',
    topVerbs: ['Calculate', 'Explain', 'Describe', 'Define', 'Suggest'],
    paperNote: 'Practical planning questions use Suggest and Explain together.',
  },
  '9231': {
    markingStyle: 'point',
    emphasis:
      'Further Maths proof verbs (Prove, Show that) need rigorous logic — every implication must be justified.',
    topVerbs: ['Prove', 'Show that', 'Hence', 'Find', 'Solve'],
    paperNote: 'Builds on 9709 — same B1/M1/A1 culture with longer chains.',
  },
  '9618': {
    markingStyle: 'point',
    emphasis:
      'Computer Science Explain and Describe need precise technical vocabulary — trace tables for algorithm questions.',
    topVerbs: ['Explain', 'Describe', 'State', 'Write', 'Draw'],
    paperNote: 'Programming papers use Write/Draw for pseudocode and logic diagrams.',
  },
  '2210': {
    markingStyle: 'point',
    emphasis:
      'O-Level CS rewards complete algorithms — Explain trace results line by line when asked.',
    topVerbs: ['Explain', 'State', 'Describe', 'Write', 'Identify'],
    paperNote: 'Theory and problem-solving papers split recall vs application verbs.',
  },
}

export function getCommandWordsSubjectProfile(code: string): CommandWordsSubjectProfile {
  return PROFILES[code] ?? DEFAULT
}
